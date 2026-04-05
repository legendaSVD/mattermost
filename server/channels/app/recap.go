package app
import (
	"net/http"
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
func (a *App) CreateRecap(rctx request.CTX, title string, channelIDs []string, agentID string) (*model.Recap, *model.AppError) {
	userID := rctx.Session().UserId
	for _, channelID := range channelIDs {
		if ok, _ := a.HasPermissionToChannel(rctx, userID, channelID, model.PermissionReadChannel); !ok {
			return nil, model.NewAppError("CreateRecap", "app.recap.permission_denied", nil, "", http.StatusForbidden)
		}
	}
	timeNow := model.GetMillis()
	recap := &model.Recap{
		Id:                model.NewId(),
		UserId:            userID,
		Title:             title,
		CreateAt:          timeNow,
		UpdateAt:          timeNow,
		DeleteAt:          0,
		ReadAt:            0,
		TotalMessageCount: 0,
		Status:            model.RecapStatusPending,
		BotID:             agentID,
	}
	savedRecap, err := a.Srv().Store().Recap().SaveRecap(recap)
	if err != nil {
		return nil, model.NewAppError("CreateRecap", "app.recap.save.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	jobData := map[string]string{
		"recap_id":    recap.Id,
		"user_id":     userID,
		"channel_ids": strings.Join(channelIDs, ","),
		"agent_id":    agentID,
	}
	_, jobErr := a.CreateJob(rctx, &model.Job{
		Type: model.JobTypeRecap,
		Data: jobData,
	})
	if jobErr != nil {
		return nil, jobErr
	}
	return savedRecap, nil
}
func (a *App) GetRecap(rctx request.CTX, recapID string) (*model.Recap, *model.AppError) {
	recap, err := a.Srv().Store().Recap().GetRecap(recapID)
	if err != nil {
		return nil, model.NewAppError("GetRecap", "app.recap.get.app_error", nil, "", http.StatusNotFound).Wrap(err)
	}
	channels, err := a.Srv().Store().Recap().GetRecapChannelsByRecapId(recapID)
	if err != nil {
		return nil, model.NewAppError("GetRecap", "app.recap.get_channels.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	recap.Channels = channels
	return recap, nil
}
func (a *App) GetRecapsForUser(rctx request.CTX, page, perPage int) ([]*model.Recap, *model.AppError) {
	userID := rctx.Session().UserId
	recaps, err := a.Srv().Store().Recap().GetRecapsForUser(userID, page, perPage)
	if err != nil {
		return nil, model.NewAppError("GetRecapsForUser", "app.recap.list.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return recaps, nil
}
func (a *App) MarkRecapAsRead(rctx request.CTX, recap *model.Recap) (*model.Recap, *model.AppError) {
	if markErr := a.Srv().Store().Recap().MarkRecapAsRead(recap.Id); markErr != nil {
		return nil, model.NewAppError("MarkRecapAsRead", "app.recap.mark_read.app_error", nil, "", http.StatusInternalServerError).Wrap(markErr)
	}
	recap.ReadAt = model.GetMillis()
	recap.UpdateAt = recap.ReadAt
	if recap.Channels == nil {
		channels, err := a.Srv().Store().Recap().GetRecapChannelsByRecapId(recap.Id)
		if err != nil {
			return nil, model.NewAppError("MarkRecapAsRead", "app.recap.get_channels.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
		recap.Channels = channels
	}
	return recap, nil
}
func (a *App) RegenerateRecap(rctx request.CTX, userID string, recap *model.Recap) (*model.Recap, *model.AppError) {
	recapID := recap.Id
	channels, err := a.Srv().Store().Recap().GetRecapChannelsByRecapId(recapID)
	if err != nil {
		return nil, model.NewAppError("RegenerateRecap", "app.recap.get_channels.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	channelIDs := make([]string, len(channels))
	for i, channel := range channels {
		channelIDs[i] = channel.ChannelId
	}
	if deleteErr := a.Srv().Store().Recap().DeleteRecapChannels(recapID); deleteErr != nil {
		return nil, model.NewAppError("RegenerateRecap", "app.recap.delete_channels.app_error", nil, "", http.StatusInternalServerError).Wrap(deleteErr)
	}
	recap.Status = model.RecapStatusPending
	recap.ReadAt = 0
	recap.UpdateAt = model.GetMillis()
	recap.TotalMessageCount = 0
	if _, updateErr := a.Srv().Store().Recap().UpdateRecap(recap); updateErr != nil {
		return nil, model.NewAppError("RegenerateRecap", "app.recap.update.app_error", nil, "", http.StatusInternalServerError).Wrap(updateErr)
	}
	jobData := map[string]string{
		"recap_id":    recapID,
		"user_id":     userID,
		"channel_ids": strings.Join(channelIDs, ","),
		"agent_id":    recap.BotID,
	}
	_, jobErr := a.CreateJob(rctx, &model.Job{
		Type: model.JobTypeRecap,
		Data: jobData,
	})
	if jobErr != nil {
		return nil, jobErr
	}
	updatedRecap, getErr := a.GetRecap(rctx, recapID)
	if getErr != nil {
		return nil, getErr
	}
	return updatedRecap, nil
}
func (a *App) DeleteRecap(rctx request.CTX, recapID string) *model.AppError {
	if deleteErr := a.Srv().Store().Recap().DeleteRecap(recapID); deleteErr != nil {
		return model.NewAppError("DeleteRecap", "app.recap.delete.app_error", nil, "", http.StatusInternalServerError).Wrap(deleteErr)
	}
	return nil
}
func (a *App) ProcessRecapChannel(rctx request.CTX, recapID, channelID, userID, agentID string) (*model.RecapChannelResult, *model.AppError) {
	result := &model.RecapChannelResult{
		ChannelID: channelID,
		Success:   false,
	}
	channel, err := a.GetChannel(rctx, channelID)
	if err != nil {
		return result, model.NewAppError("ProcessRecapChannel", "app.recap.get_channel.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	lastViewedAt, lastViewedErr := a.Srv().Store().Channel().GetMemberLastViewedAt(rctx, channelID, userID)
	if lastViewedErr != nil {
		return result, model.NewAppError("ProcessRecapChannel", "app.recap.get_last_viewed.app_error", nil, "", http.StatusInternalServerError).Wrap(lastViewedErr)
	}
	posts, postsErr := a.fetchPostsForRecap(rctx, channelID, lastViewedAt, 100)
	if postsErr != nil {
		return result, postsErr
	}
	if len(posts) == 0 {
		result.Success = true
		return result, nil
	}
	team, teamErr := a.GetTeam(channel.TeamId)
	if teamErr != nil {
		return result, model.NewAppError("ProcessRecapChannel", "app.recap.get_team.app_error", nil, "", http.StatusInternalServerError).Wrap(teamErr)
	}
	summary, err := a.SummarizePosts(rctx, userID, posts, channel.DisplayName, team.Name, agentID)
	if err != nil {
		return result, err
	}
	recapChannel := &model.RecapChannel{
		Id:            model.NewId(),
		RecapId:       recapID,
		ChannelId:     channelID,
		ChannelName:   channel.DisplayName,
		Highlights:    summary.Highlights,
		ActionItems:   summary.ActionItems,
		SourcePostIds: extractPostIDs(posts),
		CreateAt:      model.GetMillis(),
	}
	if err := a.Srv().Store().Recap().SaveRecapChannel(recapChannel); err != nil {
		return result, model.NewAppError("ProcessRecapChannel", "app.recap.save_channel.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	result.MessageCount = len(posts)
	result.Success = true
	return result, nil
}
func (a *App) fetchPostsForRecap(rctx request.CTX, channelID string, lastViewedAt int64, limit int) ([]*model.Post, *model.AppError) {
	options := model.GetPostsSinceOptions{
		ChannelId: channelID,
		Time:      lastViewedAt,
	}
	postList, err := a.GetPostsSince(rctx, options)
	if err != nil {
		return nil, err
	}
	if len(postList.Posts) == 0 {
		postList, err = a.GetPosts(rctx, channelID, 0, 20)
		if err != nil {
			return nil, err
		}
	}
	posts := make([]*model.Post, 0, len(postList.Posts))
	for _, postID := range postList.Order {
		if post, ok := postList.Posts[postID]; ok {
			posts = append(posts, post)
			if len(posts) >= limit {
				break
			}
		}
	}
	for _, post := range posts {
		user, _ := a.GetUser(post.UserId)
		if user != nil {
			if post.Props == nil {
				post.Props = make(model.StringInterface)
			}
			post.AddProp("username", user.Username)
		}
	}
	return posts, nil
}
func extractPostIDs(posts []*model.Post) []string {
	ids := make([]string, len(posts))
	for i, post := range posts {
		ids[i] = post.Id
	}
	return ids
}