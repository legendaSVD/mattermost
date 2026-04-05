package app
import (
	"encoding/json"
	"fmt"
	"slices"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/app/platform"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/pkg/errors"
)
const (
	broadcastAddMentions        = "add_mentions"
	broadcastAddFollowers       = "add_followers"
	broadcastPostedAck          = "posted_ack"
	broadcastPermalink          = "permalink"
	broadcastChannelMentions    = "channel_mentions"
	broadcastBurnOnRead         = "burn_on_read"
	broadcastBurnOnReadReaction = "burn_on_read_reaction"
)
func (s *Server) makeBroadcastHooks() map[string]platform.BroadcastHook {
	return map[string]platform.BroadcastHook{
		broadcastAddMentions:        &addMentionsBroadcastHook{},
		broadcastAddFollowers:       &addFollowersBroadcastHook{},
		broadcastPostedAck:          &postedAckBroadcastHook{},
		broadcastPermalink:          &permalinkBroadcastHook{},
		broadcastChannelMentions:    &channelMentionsBroadcastHook{},
		broadcastBurnOnRead:         &burnOnReadBroadcastHook{},
		broadcastBurnOnReadReaction: &burnOnReadReactionBroadcastHook{},
	}
}
type addMentionsBroadcastHook struct{}
func (h *addMentionsBroadcastHook) Process(msg *platform.HookedWebSocketEvent, webConn *platform.WebConn, args map[string]any) error {
	mentions, err := getTypedArg[model.StringArray](args, "mentions")
	if err != nil {
		return errors.Wrap(err, "Invalid mentions value passed to addMentionsBroadcastHook")
	}
	if len(mentions) > 0 && slices.Contains(mentions, webConn.UserId) {
		msg.Add("mentions", model.ArrayToJSON([]string{webConn.UserId}))
	}
	return nil
}
func useAddMentionsHook(message *model.WebSocketEvent, mentionedUsers model.StringArray) {
	message.GetBroadcast().AddHook(broadcastAddMentions, map[string]any{
		"mentions": mentionedUsers,
	})
}
type addFollowersBroadcastHook struct{}
func (h *addFollowersBroadcastHook) Process(msg *platform.HookedWebSocketEvent, webConn *platform.WebConn, args map[string]any) error {
	followers, err := getTypedArg[model.StringArray](args, "followers")
	if err != nil {
		return errors.Wrap(err, "Invalid followers value passed to addFollowersBroadcastHook")
	}
	if len(followers) > 0 && slices.Contains(followers, webConn.UserId) {
		msg.Add("followers", model.ArrayToJSON([]string{webConn.UserId}))
	}
	return nil
}
func useAddFollowersHook(message *model.WebSocketEvent, followers model.StringArray) {
	message.GetBroadcast().AddHook(broadcastAddFollowers, map[string]any{
		"followers": followers,
	})
}
type postedAckBroadcastHook struct{}
func usePostedAckHook(message *model.WebSocketEvent, postedUserId string, channelType model.ChannelType, usersToNotify []string) {
	message.GetBroadcast().AddHook(broadcastPostedAck, map[string]any{
		"posted_user_id": postedUserId,
		"channel_type":   channelType,
		"users":          usersToNotify,
	})
}
func (h *postedAckBroadcastHook) Process(msg *platform.HookedWebSocketEvent, webConn *platform.WebConn, args map[string]any) error {
	if !(webConn.PostedAck && webConn.Active.Load()) {
		return nil
	}
	postedUserId, err := getTypedArg[string](args, "posted_user_id")
	if err != nil {
		return errors.Wrap(err, "Invalid posted_user_id value passed to postedAckBroadcastHook")
	}
	if postedUserId == webConn.UserId {
		return nil
	}
	if msg.Get("followers") != nil || msg.Get("mentions") != nil {
		msg.Add("should_ack", true)
		incrementWebsocketCounter(webConn)
		return nil
	}
	channelType, err := getTypedArg[model.ChannelType](args, "channel_type")
	if err != nil {
		return errors.Wrap(err, "Invalid channel_type value passed to postedAckBroadcastHook")
	}
	if channelType == model.ChannelTypeDirect {
		msg.Add("should_ack", true)
		incrementWebsocketCounter(webConn)
		return nil
	}
	users, err := getTypedArg[model.StringArray](args, "users")
	if err != nil {
		return errors.Wrap(err, "Invalid users value passed to postedAckBroadcastHook")
	}
	if len(users) > 0 && slices.Contains(users, webConn.UserId) {
		msg.Add("should_ack", true)
		incrementWebsocketCounter(webConn)
	}
	return nil
}
func usePermalinkHook(message *model.WebSocketEvent, previewChannel *model.Channel, permalinkPreviewedPost *model.PreviewPost, previewProp string) {
	message.GetBroadcast().AddHook(broadcastPermalink, map[string]any{
		"preview_channel":          previewChannel,
		"permalink_previewed_post": permalinkPreviewedPost,
		"preview_prop":             previewProp,
	})
}
func useBurnOnReadHook(message *model.WebSocketEvent, authorID string, revealedPostJSON, postJSON string) {
	message.GetBroadcast().AddHook(broadcastBurnOnRead, map[string]any{
		"author_id":          authorID,
		"post_json":          postJSON,
		"revealed_post_json": revealedPostJSON,
	})
}
type permalinkBroadcastHook struct{}
func (h *permalinkBroadcastHook) Process(msg *platform.HookedWebSocketEvent, webConn *platform.WebConn, args map[string]any) error {
	previewChannel, err := getTypedArg[*model.Channel](args, "preview_channel")
	if err != nil {
		return errors.Wrap(err, "Invalid preview_channel value passed to permalinkBroadcastHook")
	}
	rctx := request.EmptyContext(webConn.Platform.Log())
	ok, isMember := webConn.Suite.HasPermissionToReadChannel(rctx, webConn.UserId, previewChannel)
	if !ok {
		return nil
	}
	post, err := getPostFromMessage(msg)
	if err != nil {
		return errors.Wrap(err, "permalinkBroadcastHook failed to get post from message")
	}
	permalinkPreviewedPost, err := getTypedArg[*model.PreviewPost](args, "permalink_previewed_post")
	if err != nil {
		return errors.Wrap(err, "Invalid permalink_previewed_post value passed to permalinkBroadcastHook")
	}
	previewProp, err := getTypedArg[string](args, "preview_prop")
	if err != nil {
		return errors.Wrap(err, "Invalid preview_prop value passed to permalinkBroadcastHook")
	}
	post.AddProp(model.PostPropsPreviewedPost, previewProp)
	post.Metadata.Embeds = append(post.Metadata.Embeds, &model.PostEmbed{Type: model.PostEmbedPermalink, Data: permalinkPreviewedPost})
	updatedPostJSON, err := post.ToJSON()
	if err != nil {
		return errors.Wrap(err, "Failed to marshal post in permalinkBroadcastHook")
	}
	msg.Add("post", updatedPostJSON)
	auditRec := webConn.Suite.MakeAuditRecord(rctx, model.AuditEventWebsocketPost, model.AuditStatusSuccess)
	defer webConn.Suite.LogAuditRec(rctx, auditRec, nil)
	model.AddEventParameterToAuditRec(auditRec, "channel_id", previewChannel.Id)
	model.AddEventParameterToAuditRec(auditRec, "user_id", webConn.UserId)
	model.AddEventParameterToAuditRec(auditRec, "source", "permalinkBroadcastHook")
	if !isMember {
		model.AddEventParameterToAuditRec(auditRec, "non_channel_member_access", true)
	}
	return nil
}
func useChannelMentionsHook(message *model.WebSocketEvent, channelMentions map[string]any) {
	message.GetBroadcast().AddHook(broadcastChannelMentions, map[string]any{
		"channel_mentions": channelMentions,
	})
}
type channelMentionsBroadcastHook struct{}
func (h *channelMentionsBroadcastHook) Process(msg *platform.HookedWebSocketEvent, webConn *platform.WebConn, args map[string]any) error {
	channelMentions, err := getTypedArg[map[string]any](args, "channel_mentions")
	if err != nil {
		return errors.Wrap(err, "Invalid channel_mentions value passed to channelMentionsBroadcastHook")
	}
	if len(channelMentions) == 0 {
		return nil
	}
	post, err := getPostFromMessage(msg)
	if err != nil {
		return errors.Wrap(err, "channelMentionsBroadcastHook failed to get post from message")
	}
	rctx := request.EmptyContext(webConn.Platform.Log())
	filteredMentions := make(map[string]any)
	for channelName, channelInfo := range channelMentions {
		channelInfoMap, ok := channelInfo.(map[string]any)
		if !ok {
			continue
		}
		channelID, ok := channelInfoMap["id"].(string)
		if !ok || channelID == "" {
			continue
		}
		channel, appErr := webConn.Platform.Store.Channel().Get(channelID, true)
		if appErr != nil {
			continue
		}
		hasPermission, _ := webConn.Suite.HasPermissionToReadChannel(rctx, webConn.UserId, channel)
		if hasPermission {
			filteredMentions[channelName] = channelInfo
		}
	}
	if len(filteredMentions) > 0 {
		post.AddProp(model.PostPropsChannelMentions, filteredMentions)
	} else {
		post.DelProp(model.PostPropsChannelMentions)
	}
	updatedPostJSON, err := post.ToJSON()
	if err != nil {
		return errors.Wrap(err, "Failed to marshal post in channelMentionsBroadcastHook")
	}
	msg.Add("post", updatedPostJSON)
	return nil
}
type burnOnReadBroadcastHook struct{}
func (h *burnOnReadBroadcastHook) Process(msg *platform.HookedWebSocketEvent, webConn *platform.WebConn, args map[string]any) error {
	userID := webConn.UserId
	authorID, err := getTypedArg[string](args, "author_id")
	if err != nil {
		return errors.Wrap(err, "Invalid author_id value passed to burnOnReadBroadcastHook")
	}
	if userID == authorID {
		postJSON, tErr := getTypedArg[string](args, "revealed_post_json")
		if tErr != nil {
			return errors.Wrap(tErr, "Invalid revealed_post_json value passed to burnOnReadBroadcastHook")
		}
		msg.Add("post", postJSON)
		return nil
	}
	postJSON, err := getTypedArg[string](args, "post_json")
	if err != nil {
		return errors.Wrap(err, "Invalid post_json value passed to burnOnReadBroadcastHook")
	}
	var post model.Post
	err = json.Unmarshal([]byte(postJSON), &post)
	if err != nil {
		return errors.Wrap(err, "Invalid post value passed to burnOnReadBroadcastHook")
	}
	post.Metadata.Embeds = []*model.PostEmbed{}
	post.Metadata.Emojis = []*model.Emoji{}
	post.Metadata.Reactions = []*model.Reaction{}
	postJSON, err = post.ToJSON()
	if err != nil {
		return errors.Wrap(err, "Invalid post value passed to burnOnReadBroadcastHook")
	}
	msg.Add("post", postJSON)
	return nil
}
type burnOnReadReactionBroadcastHook struct{}
func (h *burnOnReadReactionBroadcastHook) Process(msg *platform.HookedWebSocketEvent, webConn *platform.WebConn, args map[string]any) error {
	userID := webConn.UserId
	authorID, err := getTypedArg[string](args, "author_id")
	if err != nil {
		return errors.Wrap(err, "Invalid author_id value passed to burnOnReadReactionBroadcastHook")
	}
	if userID == authorID {
		return nil
	}
	postID, err := getTypedArg[string](args, "post_id")
	if err != nil {
		return errors.Wrap(err, "Invalid post_id value passed to burnOnReadReactionBroadcastHook")
	}
	rctx := request.EmptyContext(webConn.Platform.Log())
	receipt, err := webConn.Platform.Store.ReadReceipt().Get(rctx, postID, userID)
	if err != nil && !store.IsErrNotFound(err) {
		return errors.Wrap(err, "Failed to get read receipt in burnOnReadReactionBroadcastHook")
	}
	if receipt == nil || receipt.ExpireAt < model.GetMillis() {
		msg.Event().Reject()
		return nil
	}
	return nil
}
func useBurnOnReadReactionHook(message *model.WebSocketEvent, authorID, postID string) {
	message.GetBroadcast().AddHook(broadcastBurnOnReadReaction, map[string]any{
		"author_id": authorID,
		"post_id":   postID,
	})
}
func incrementWebsocketCounter(wc *platform.WebConn) {
	if wc.Platform.Metrics() == nil {
		return
	}
	if !(wc.Platform.Config().FeatureFlags.NotificationMonitoring && *wc.Platform.Config().MetricsSettings.EnableNotificationMetrics) {
		return
	}
	wc.Platform.Metrics().IncrementNotificationCounter(model.NotificationTypeWebsocket, model.NotificationNoPlatform)
}
func getPostFromMessage(msg *platform.HookedWebSocketEvent) (*model.Post, error) {
	currentPostData := msg.Get("post")
	if currentPostData == nil {
		return nil, errors.New("No post found in message")
	}
	currentPostJSON, ok := currentPostData.(string)
	if !ok {
		return nil, errors.New("Invalid post type in message")
	}
	var post model.Post
	err := json.Unmarshal([]byte(currentPostJSON), &post)
	if err != nil {
		return nil, errors.Wrap(err, "Failed to unmarshal post")
	}
	return &post, nil
}
func getTypedArg[T any](args map[string]any, key string) (T, error) {
	var value T
	untyped, ok := args[key]
	if !ok {
		return value, fmt.Errorf("No argument found with key: %s", key)
	}
	if typed, ok := untyped.(T); ok {
		return typed, nil
	}
	buf, err := json.Marshal(untyped)
	if err != nil {
		return value, err
	}
	err = json.Unmarshal(buf, &value)
	return value, err
}