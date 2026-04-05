package pluginapi
import (
	"slices"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type PostService struct {
	api plugin.API
}
func (p *PostService) CreatePost(post *model.Post) error {
	createdPost, appErr := p.api.CreatePost(post)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	err := createdPost.ShallowCopy(post)
	if err != nil {
		return err
	}
	return nil
}
func (p *PostService) DM(senderUserID, receiverUserID string, post *model.Post) error {
	channel, appErr := p.api.GetDirectChannel(senderUserID, receiverUserID)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	post.ChannelId = channel.Id
	post.UserId = senderUserID
	return p.CreatePost(post)
}
func (p *PostService) GetPost(postID string) (*model.Post, error) {
	post, appErr := p.api.GetPost(postID)
	return post, normalizeAppErr(appErr)
}
func (p *PostService) UpdatePost(post *model.Post) error {
	updatedPost, appErr := p.api.UpdatePost(post)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	err := updatedPost.ShallowCopy(post)
	if err != nil {
		return err
	}
	return nil
}
func (p *PostService) DeletePost(postID string) error {
	return normalizeAppErr(p.api.DeletePost(postID))
}
func (p *PostService) SendEphemeralPost(userID string, post *model.Post) {
	*post = *p.api.SendEphemeralPost(userID, post)
}
func (p *PostService) UpdateEphemeralPost(userID string, post *model.Post) {
	*post = *p.api.UpdateEphemeralPost(userID, post)
}
func (p *PostService) DeleteEphemeralPost(userID, postID string) {
	p.api.DeleteEphemeralPost(userID, postID)
}
func (p *PostService) GetPostThread(postID string) (*model.PostList, error) {
	postList, appErr := p.api.GetPostThread(postID)
	return postList, normalizeAppErr(appErr)
}
func (p *PostService) GetPostsSince(channelID string, time int64) (*model.PostList, error) {
	postList, appErr := p.api.GetPostsSince(channelID, time)
	return postList, normalizeAppErr(appErr)
}
func (p *PostService) GetPostsAfter(channelID, postID string, page, perPage int) (*model.PostList, error) {
	postList, appErr := p.api.GetPostsAfter(channelID, postID, page, perPage)
	return postList, normalizeAppErr(appErr)
}
func (p *PostService) GetPostsBefore(channelID, postID string, page, perPage int) (*model.PostList, error) {
	postList, appErr := p.api.GetPostsBefore(channelID, postID, page, perPage)
	return postList, normalizeAppErr(appErr)
}
func (p *PostService) GetPostsForChannel(channelID string, page, perPage int) (*model.PostList, error) {
	postList, appErr := p.api.GetPostsForChannel(channelID, page, perPage)
	return postList, normalizeAppErr(appErr)
}
func (p *PostService) SearchPostsInTeam(teamID string, paramsList []*model.SearchParams) ([]*model.Post, error) {
	postList, appErr := p.api.SearchPostsInTeam(teamID, paramsList)
	return postList, normalizeAppErr(appErr)
}
func (p *PostService) AddReaction(reaction *model.Reaction) error {
	addedReaction, appErr := p.api.AddReaction(reaction)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*reaction = *addedReaction
	return nil
}
func (p *PostService) GetReactions(postID string) ([]*model.Reaction, error) {
	reactions, appErr := p.api.GetReactions(postID)
	return reactions, normalizeAppErr(appErr)
}
func (p *PostService) RemoveReaction(reaction *model.Reaction) error {
	return normalizeAppErr(p.api.RemoveReaction(reaction))
}
type ShouldProcessMessageOption func(*shouldProcessMessageOptions)
type shouldProcessMessageOptions struct {
	AllowSystemMessages bool
	AllowBots           bool
	AllowWebhook        bool
	FilterChannelIDs    []string
	FilterUserIDs       []string
	OnlyBotDMs          bool
	BotID               string
}
func AllowSystemMessages() ShouldProcessMessageOption {
	return func(options *shouldProcessMessageOptions) {
		options.AllowSystemMessages = true
	}
}
func AllowBots() ShouldProcessMessageOption {
	return func(options *shouldProcessMessageOptions) {
		options.AllowBots = true
	}
}
func AllowWebhook() ShouldProcessMessageOption {
	return func(options *shouldProcessMessageOptions) {
		options.AllowWebhook = true
	}
}
func FilterChannelIDs(filterChannelIDs []string) ShouldProcessMessageOption {
	return func(options *shouldProcessMessageOptions) {
		options.FilterChannelIDs = filterChannelIDs
	}
}
func FilterUserIDs(filterUserIDs []string) ShouldProcessMessageOption {
	return func(options *shouldProcessMessageOptions) {
		options.FilterUserIDs = filterUserIDs
	}
}
func OnlyBotDMs() ShouldProcessMessageOption {
	return func(options *shouldProcessMessageOptions) {
		options.OnlyBotDMs = true
	}
}
func BotID(botID string) ShouldProcessMessageOption {
	return func(options *shouldProcessMessageOptions) {
		options.BotID = botID
	}
}
func (p *PostService) ShouldProcessMessage(post *model.Post, options ...ShouldProcessMessageOption) (bool, error) {
	messageProcessOptions := &shouldProcessMessageOptions{}
	for _, option := range options {
		option(messageProcessOptions)
	}
	var botIDBytes []byte
	var kvGetErr *model.AppError
	if messageProcessOptions.BotID != "" {
		botIDBytes = []byte(messageProcessOptions.BotID)
	} else {
		botIDBytes, kvGetErr = p.api.KVGet(botUserKey)
		if kvGetErr != nil {
			return false, errors.Wrap(kvGetErr, "failed to get bot")
		}
	}
	if botIDBytes != nil {
		if post.UserId == string(botIDBytes) {
			return false, nil
		}
	}
	if post.IsSystemMessage() && !messageProcessOptions.AllowSystemMessages {
		return false, nil
	}
	if !messageProcessOptions.AllowWebhook && post.GetProp(model.PostPropsFromWebhook) == "true" {
		return false, nil
	}
	if !messageProcessOptions.AllowBots {
		user, appErr := p.api.GetUser(post.UserId)
		if appErr != nil {
			return false, errors.Wrap(appErr, "unable to get user")
		}
		if user.IsBot {
			return false, nil
		}
	}
	if len(messageProcessOptions.FilterChannelIDs) != 0 && !slices.Contains(messageProcessOptions.FilterChannelIDs, post.ChannelId) {
		return false, nil
	}
	if len(messageProcessOptions.FilterUserIDs) != 0 && !slices.Contains(messageProcessOptions.FilterUserIDs, post.UserId) {
		return false, nil
	}
	if botIDBytes != nil && messageProcessOptions.OnlyBotDMs {
		channel, appErr := p.api.GetChannel(post.ChannelId)
		if appErr != nil {
			return false, errors.Wrap(appErr, "unable to get channel")
		}
		if !model.IsBotDMChannel(channel, string(botIDBytes)) {
			return false, nil
		}
	}
	return true, nil
}