package app
import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"maps"
	"slices"
	agentclient "github.com/mattermost/mattermost-plugin-ai/public/bridgeclient"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/channels/store/sqlstore"
	"github.com/mattermost/mattermost/server/v8/platform/services/cache"
)
var pendingPostIDsCacheTTL = 30 * time.Second
const (
	PendingPostIDsCacheSize = 25000
	PageDefault             = 0
)
var atMentionPattern = regexp.MustCompile(`\B@`)
func (a *App) CreatePostAsUser(rctx request.CTX, post *model.Post, currentSessionId string, setOnline bool) (*model.Post, bool, *model.AppError) {
	channel, errCh := a.Srv().Store().Channel().Get(post.ChannelId, true)
	if errCh != nil {
		err := model.NewAppError("CreatePostAsUser", "api.context.invalid_param.app_error", map[string]any{"Name": "post.channel_id"}, "", http.StatusBadRequest).Wrap(errCh)
		return nil, false, err
	}
	if strings.HasPrefix(post.Type, model.PostSystemMessagePrefix) {
		err := model.NewAppError("CreatePostAsUser", "api.context.invalid_param.app_error", map[string]any{"Name": "post.type"}, "", http.StatusBadRequest)
		return nil, false, err
	}
	if channel.DeleteAt != 0 {
		err := model.NewAppError("createPost", "api.post.create_post.can_not_post_to_deleted.error", nil, "", http.StatusBadRequest)
		return nil, false, err
	}
	restrictDM, err := a.CheckIfChannelIsRestrictedDM(rctx, channel)
	if err != nil {
		return nil, false, err
	}
	if restrictDM {
		return nil, false, model.NewAppError("createPost", "api.post.create_post.can_not_post_in_restricted_dm.error", nil, "", http.StatusBadRequest)
	}
	rp, isMemberForPreviews, err := a.CreatePost(rctx, post, channel, model.CreatePostFlags{TriggerWebhooks: true, SetOnline: setOnline})
	if err != nil {
		if err.Id == "api.post.create_post.root_id.app_error" ||
			err.Id == "api.post.create_post.channel_root_id.app_error" {
			err.StatusCode = http.StatusBadRequest
		}
		return nil, false, err
	}
	_, fromWebhook := post.GetProps()[model.PostPropsFromWebhook]
	_, fromBot := post.GetProps()[model.PostPropsFromBot]
	isCRTEnabled := a.IsCRTEnabledForUser(rctx, post.UserId)
	isCRTReply := post.RootId != "" && isCRTEnabled
	if !fromWebhook && !fromBot && !isCRTReply {
		if _, err := a.MarkChannelsAsViewed(rctx, []string{post.ChannelId}, post.UserId, currentSessionId, true, isCRTEnabled); err != nil {
			rctx.Logger().Warn(
				"Encountered error updating last viewed",
				mlog.String("channel_id", post.ChannelId),
				mlog.String("user_id", post.UserId),
				mlog.Err(err),
			)
		}
	}
	return rp, isMemberForPreviews, nil
}
func (a *App) CreatePostMissingChannel(rctx request.CTX, post *model.Post, triggerWebhooks bool, setOnline bool) (*model.Post, bool, *model.AppError) {
	channel, err := a.Srv().Store().Channel().Get(post.ChannelId, true)
	if err != nil {
		errCtx := map[string]any{"channel_id": post.ChannelId}
		var nfErr *store.ErrNotFound
		switch {
		case errors.As(err, &nfErr):
			return nil, false, model.NewAppError("CreatePostMissingChannel", "app.channel.get.existing.app_error", errCtx, "", http.StatusNotFound).Wrap(err)
		default:
			return nil, false, model.NewAppError("CreatePostMissingChannel", "app.channel.get.find.app_error", errCtx, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	return a.CreatePost(rctx, post, channel, model.CreatePostFlags{TriggerWebhooks: triggerWebhooks, SetOnline: setOnline})
}
func (a *App) deduplicateCreatePost(rctx request.CTX, post *model.Post) (foundPost *model.Post, err *model.AppError) {
	if post.PendingPostId == "" {
		return nil, nil
	}
	const unknownPostId = ""
	var postID string
	nErr := a.Srv().seenPendingPostIdsCache.Get(post.PendingPostId, &postID)
	if nErr == cache.ErrKeyNotFound {
		if appErr := a.Srv().seenPendingPostIdsCache.SetWithExpiry(post.PendingPostId, unknownPostId, pendingPostIDsCacheTTL); appErr != nil {
			return nil, model.NewAppError("deduplicateCreatePost", "api.post.deduplicate_create_post.cache_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
		}
		return nil, nil
	}
	if nErr != nil {
		return nil, model.NewAppError("deduplicateCreatePost", "api.post.error_get_post_id.pending", nil, "", http.StatusInternalServerError).Wrap(nErr)
	}
	if postID == unknownPostId {
		return nil, model.NewAppError("deduplicateCreatePost", "api.post.deduplicate_create_post.pending", nil, "", http.StatusInternalServerError)
	}
	actualPost, err, _ := a.GetPostIfAuthorized(rctx, postID, rctx.Session(), false)
	if err != nil && err.StatusCode == http.StatusForbidden {
		rctx.Logger().Warn("Ignoring pending_post_id for which the user is unauthorized", mlog.String("pending_post_id", post.PendingPostId), mlog.String("post_id", postID), mlog.Err(err))
		return nil, nil
	} else if err != nil {
		return nil, model.NewAppError("deduplicateCreatePost", "api.post.deduplicate_create_post.failed_to_get", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	rctx.Logger().Debug("Deduplicated create post", mlog.String("post_id", actualPost.Id), mlog.String("pending_post_id", post.PendingPostId))
	return actualPost, nil
}
func (a *App) CreatePost(rctx request.CTX, post *model.Post, channel *model.Channel, flags model.CreatePostFlags) (savedPost *model.Post, isMemberForPreviews bool, err *model.AppError) {
	if !a.Config().FeatureFlags.EnableSharedChannelsDMs && channel.IsShared() && (channel.Type == model.ChannelTypeDirect || channel.Type == model.ChannelTypeGroup) {
		return nil, false, model.NewAppError("CreatePost", "app.post.create_post.shared_dm_or_gm.app_error", nil, "", http.StatusBadRequest)
	}
	err = PostBurnOnReadCheckWithApp("App.CreatePost", a, rctx, post.UserId, post.ChannelId, post.Type, channel)
	if err != nil {
		return nil, false, err
	}
	foundPost, err := a.deduplicateCreatePost(rctx, post)
	if err != nil {
		return nil, false, err
	}
	if foundPost != nil {
		isMemberForPreviews = true
		if previewPost := foundPost.GetPreviewPost(); previewPost != nil {
			var member *model.ChannelMember
			member, err = a.GetChannelMember(rctx, previewPost.Post.ChannelId, rctx.Session().UserId)
			if err != nil || member == nil {
				isMemberForPreviews = false
			}
		}
		return foundPost, isMemberForPreviews, nil
	}
	defer func() {
		if post.PendingPostId == "" {
			return
		}
		if err != nil {
			if appErr := a.Srv().seenPendingPostIdsCache.Remove(post.PendingPostId); appErr != nil {
				err = model.NewAppError("CreatePost", "api.post.deduplicate_create_post.cache_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
			}
			return
		}
		if appErr := a.Srv().seenPendingPostIdsCache.SetWithExpiry(post.PendingPostId, savedPost.Id, pendingPostIDsCacheTTL); appErr != nil {
			err = model.NewAppError("CreatePost", "api.post.deduplicate_create_post.cache_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
		}
	}()
	if persistentNotification := post.GetPersistentNotification(); persistentNotification != nil && *persistentNotification && channel.Type != model.ChannelTypeDirect {
		err := a.forEachPersistentNotificationPost([]*model.Post{post}, func(_ *model.Post, _ *model.Channel, _ *model.Team, mentions *MentionResults, _ model.UserMap, _ map[string]map[string]model.StringMap) error {
			if maxRecipients := *a.Config().ServiceSettings.PersistentNotificationMaxRecipients; len(mentions.Mentions) > maxRecipients {
				return model.NewAppError("CreatePost", "api.post.post_priority.max_recipients_persistent_notification_post.request_error", map[string]any{"MaxRecipients": maxRecipients}, "", http.StatusBadRequest)
			} else if len(mentions.Mentions) == 0 {
				return model.NewAppError("CreatePost", "api.post.post_priority.min_recipients_persistent_notification_post.request_error", nil, "", http.StatusBadRequest)
			}
			return nil
		})
		if err != nil {
			return nil, false, model.NewAppError("CreatePost", "api.post.post_priority.persistent_notification_validation_error.request_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	post.SanitizeProps()
	var pchan chan store.StoreResult[*model.PostList]
	if post.RootId != "" {
		pchan = make(chan store.StoreResult[*model.PostList], 1)
		go func() {
			r, pErr := a.Srv().Store().Post().Get(RequestContextWithMaster(rctx), post.RootId, model.GetPostsOptions{}, "", a.Config().GetSanitizeOptions())
			pchan <- store.StoreResult[*model.PostList]{Data: r, NErr: pErr}
			close(pchan)
		}()
	}
	user, nErr := a.Srv().Store().User().Get(context.Background(), post.UserId)
	if nErr != nil {
		var nfErr *store.ErrNotFound
		switch {
		case errors.As(nErr, &nfErr):
			return nil, false, model.NewAppError("CreatePost", MissingAccountError, nil, "", http.StatusNotFound).Wrap(nErr)
		default:
			return nil, false, model.NewAppError("CreatePost", "app.user.get.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
		}
	}
	if user.IsBot {
		post.AddProp(model.PostPropsFromBot, "true")
	}
	if flags.ForceNotification {
		post.AddProp(model.PostPropsForceNotification, model.NewId())
	}
	if rctx.Session().IsOAuth {
		post.AddProp(model.PostPropsFromOAuthApp, "true")
	}
	var ephemeralPost *model.Post
	if post.Type == "" {
		if hasPermission, _ := a.HasPermissionToChannel(rctx, user.Id, channel.Id, model.PermissionUseChannelMentions); !hasPermission {
			mention := post.DisableMentionHighlights()
			if mention != "" {
				T := i18n.GetUserTranslations(user.Locale)
				ephemeralPost = &model.Post{
					UserId:    user.Id,
					RootId:    post.RootId,
					ChannelId: channel.Id,
					Message:   T("model.post.channel_notifications_disabled_in_channel.message", model.StringInterface{"ChannelName": channel.Name, "Mention": mention}),
					Props:     model.StringInterface{model.PostPropsMentionHighlightDisabled: true},
				}
			}
		}
	}
	var parentPostList *model.PostList
	if pchan != nil {
		result := <-pchan
		if result.NErr != nil {
			return nil, false, model.NewAppError("createPost", "api.post.create_post.root_id.app_error", nil, "", http.StatusBadRequest).Wrap(result.NErr)
		}
		parentPostList = result.Data
		if len(parentPostList.Posts) == 0 || !parentPostList.IsChannelId(post.ChannelId) {
			return nil, false, model.NewAppError("createPost", "api.post.create_post.channel_root_id.app_error", nil, "", http.StatusInternalServerError)
		}
		rootPost := parentPostList.Posts[post.RootId]
		if rootPost.RootId != "" {
			return nil, false, model.NewAppError("createPost", "api.post.create_post.root_id.app_error", nil, "", http.StatusBadRequest)
		}
		if rootPost.Type == model.PostTypeBurnOnRead {
			return nil, false, model.NewAppError("createPost", "api.post.create_post.burn_on_read.app_error", nil, "", http.StatusBadRequest)
		}
	}
	post.Hashtags, _ = model.ParseHashtags(post.Message)
	if err = a.FillInPostProps(rctx, post, channel); err != nil {
		return nil, false, err
	}
	if attachments, ok := post.GetProp(model.PostPropsAttachments).([]*model.MessageAttachment); ok {
		jsonAttachments, err := json.Marshal(attachments)
		if err == nil {
			attachmentsInterface := []any{}
			err = json.Unmarshal(jsonAttachments, &attachmentsInterface)
			post.AddProp(model.PostPropsAttachments, attachmentsInterface)
		}
		if err != nil {
			rctx.Logger().Warn("Could not convert post attachments to map interface.", mlog.Err(err))
		}
	}
	var metadata *model.PostMetadata
	if post.Metadata != nil {
		metadata = post.Metadata.Copy()
	}
	var rejectionError *model.AppError
	pluginContext := pluginContext(rctx)
	if post.Type != model.PostTypeBurnOnRead {
		a.ch.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
			replacementPost, rejectionReason := hooks.MessageWillBePosted(pluginContext, post.ForPlugin())
			if rejectionReason != "" {
				id := "Post rejected by plugin. " + rejectionReason
				if rejectionReason == plugin.DismissPostError {
					id = plugin.DismissPostError
				}
				rejectionError = model.NewAppError("createPost", id, nil, "", http.StatusBadRequest)
				return false
			}
			if replacementPost != nil {
				post = replacementPost
				if post.Metadata != nil && metadata != nil {
					post.Metadata.Priority = metadata.Priority
				} else {
					post.Metadata = metadata
				}
			}
			return true
		}, plugin.MessageWillBePostedID)
		if rejectionError != nil {
			return nil, false, rejectionError
		}
	}
	if post.CreateAt == 0 {
		post.CreateAt = model.GetMillis()
	}
	post = a.getEmbedsAndImages(rctx, post, true)
	previewPost := post.GetPreviewPost()
	if previewPost != nil {
		post.AddProp(model.PostPropsPreviewedPost, previewPost.PostID)
	}
	fileIDs := post.FileIds
	rpost, nErr := a.Srv().Store().Post().Save(rctx, post)
	if nErr != nil {
		var appErr *model.AppError
		var invErr *store.ErrInvalidInput
		switch {
		case errors.As(nErr, &appErr):
			return nil, false, appErr
		case errors.As(nErr, &invErr):
			return nil, false, model.NewAppError("CreatePost", "app.post.save.existing.app_error", nil, "", http.StatusBadRequest).Wrap(nErr)
		default:
			return nil, false, model.NewAppError("CreatePost", "app.post.save.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
		}
	}
	if appErr := a.Srv().seenPendingPostIdsCache.SetWithExpiry(post.PendingPostId, rpost.Id, pendingPostIDsCacheTTL); appErr != nil {
		return nil, false, model.NewAppError("CreatePost", "api.post.deduplicate_create_post.cache_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
	}
	if a.Metrics() != nil {
		a.Metrics().IncrementPostCreate()
	}
	if len(fileIDs) > 0 {
		var attachedFileIds model.StringArray
		attachedFileIds, err = a.attachFilesToPost(rctx, post, fileIDs)
		if err != nil {
			rctx.Logger().Warn("Encountered error attaching files to post", mlog.String("post_id", post.Id), mlog.Array("file_ids", fileIDs), mlog.Err(err))
		} else if post.Type != model.PostTypeBurnOnRead {
			post.FileIds = attachedFileIds
		}
		if a.Metrics() != nil {
			a.Metrics().IncrementPostFileAttachment(len(post.FileIds))
		}
	}
	if rpost.Type != model.PostTypeBurnOnRead {
		pluginPost := rpost.ForPlugin()
		a.Srv().Go(func() {
			a.ch.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
				hooks.MessageHasBeenPosted(pluginContext, pluginPost)
				return true
			}, plugin.MessageHasBeenPostedID)
		})
	}
	rpost = a.PreparePostForClient(rctx, rpost, &model.PreparePostForClientOpts{IsEditPost: true})
	if a.AutoTranslation() != nil && a.AutoTranslation().IsFeatureAvailable() {
		enabled, atErr := a.AutoTranslation().IsChannelEnabled(rpost.ChannelId)
		if atErr == nil && enabled {
			_, translateErr := a.AutoTranslation().Translate(rctx.Context(), model.TranslationObjectTypePost, rpost.Id, rpost.ChannelId, rpost.UserId, rpost)
			if translateErr != nil {
				var notAvailErr *model.ErrAutoTranslationNotAvailable
				switch {
				case errors.As(translateErr, &notAvailErr):
					rctx.Logger().Debug("Auto-translation feature not available", mlog.String("post_id", rpost.Id), mlog.Err(translateErr))
				case translateErr.Id == "ent.autotranslation.no_translatable_content":
				default:
					rctx.Logger().Warn("Failed to translate post", mlog.String("post_id", rpost.Id), mlog.Err(translateErr))
				}
			}
		} else if atErr != nil {
			rctx.Logger().Warn("Failed to check if channel is enabled for auto-translation", mlog.String("channel_id", rpost.ChannelId), mlog.Err(atErr))
		}
	}
	a.applyPostWillBeConsumedHook(&rpost)
	if rpost.RootId != "" {
		if appErr := a.ResolvePersistentNotification(rctx, parentPostList.Posts[post.RootId], rpost.UserId); appErr != nil {
			a.CountNotificationReason(model.NotificationStatusError, model.NotificationTypeWebsocket, model.NotificationReasonResolvePersistentNotificationError, model.NotificationNoPlatform)
			a.Log().LogM(mlog.MlvlNotificationError, "Error resolving persistent notification",
				mlog.String("sender_id", rpost.UserId),
				mlog.String("post_id", post.RootId),
				mlog.String("status", model.NotificationStatusError),
				mlog.String("reason", model.NotificationReasonResolvePersistentNotificationError),
				mlog.Err(appErr),
			)
			return nil, false, appErr
		}
	}
	if *a.Config().ServiceSettings.ThreadAutoFollow && rpost.RootId != "" {
		_, err := a.Srv().Store().Thread().MaintainMembership(user.Id, rpost.RootId, store.ThreadMembershipOpts{
			Following:       true,
			UpdateFollowing: true,
		})
		if err != nil {
			rctx.Logger().Warn("Failed to update thread membership", mlog.Err(err))
		}
	}
	if err := a.handlePostEvents(rctx, rpost, user, channel, flags.TriggerWebhooks, parentPostList, flags.SetOnline); err != nil {
		rctx.Logger().Warn("Failed to handle post events", mlog.Err(err))
	}
	if ephemeralPost != nil {
		a.SendEphemeralPost(rctx, post.UserId, ephemeralPost)
	}
	rpost, isMemberForPreviews, err = a.SanitizePostMetadataForUser(rctx, rpost, rctx.Session().UserId)
	if err != nil {
		return nil, false, err
	}
	return rpost, isMemberForPreviews, nil
}
func (a *App) addPostPreviewProp(rctx request.CTX, post *model.Post) (*model.Post, error) {
	previewPost := post.GetPreviewPost()
	if previewPost != nil {
		updatedPost := post.Clone()
		updatedPost.AddProp(model.PostPropsPreviewedPost, previewPost.PostID)
		updatedPost, err := a.Srv().Store().Post().Update(rctx, updatedPost, post)
		return updatedPost, err
	}
	return post, nil
}
func (a *App) attachFilesToPost(rctx request.CTX, post *model.Post, fileIDs model.StringArray) (model.StringArray, *model.AppError) {
	attachedIds := a.attachFileIDsToPost(rctx, post.Id, post.ChannelId, post.UserId, fileIDs)
	if len(fileIDs) != len(attachedIds) {
		post.FileIds = attachedIds
		if _, err := a.Srv().Store().Post().Overwrite(rctx, post); err != nil {
			return nil, model.NewAppError("attachFilesToPost", "app.post.overwrite.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	return attachedIds, nil
}
func (a *App) attachFileIDsToPost(rctx request.CTX, postID, channelID, userID string, fileIDs []string) []string {
	var attachedIds []string
	for _, fileID := range fileIDs {
		err := a.Srv().Store().FileInfo().AttachToPost(rctx, fileID, postID, channelID, userID)
		if err != nil {
			rctx.Logger().Warn("Failed to attach file to post", mlog.String("file_id", fileID), mlog.String("post_id", postID), mlog.Err(err))
			continue
		}
		attachedIds = append(attachedIds, fileID)
	}
	return attachedIds
}
func (a *App) FillInPostProps(rctx request.CTX, post *model.Post, channel *model.Channel) *model.AppError {
	channelMentions := post.ChannelMentionsAll()
	channelMentionsProp := make(map[string]any)
	if len(channelMentions) > 0 {
		if channel == nil {
			postChannel, err := a.Srv().Store().Channel().GetForPost(post.Id)
			if err != nil {
				return model.NewAppError("FillInPostProps", "api.context.invalid_param.app_error", map[string]any{"Name": "post.channel_id"}, "", http.StatusBadRequest).Wrap(err)
			}
			channel = postChannel
		}
		teamId := channel.TeamId
		if teamId == "" {
			if currentTeamId, ok := post.GetProp(model.PostPropsCurrentTeamId).(string); ok && currentTeamId != "" {
				teamId = currentTeamId
			}
		}
		mentionedChannels, err := a.GetChannelsByNames(rctx, channelMentions, teamId)
		if err != nil {
			return err
		}
		post.DelProp(model.PostPropsCurrentTeamId)
		for _, mentioned := range mentionedChannels {
			if hasPermission, _ := a.HasPermissionToReadChannel(rctx, post.UserId, mentioned); hasPermission {
				team, err := a.Srv().Store().Team().Get(mentioned.TeamId)
				if err != nil {
					rctx.Logger().Warn("Failed to get team of the channel mention", mlog.String("team_id", channel.TeamId), mlog.String("channel_id", channel.Id), mlog.Err(err))
					continue
				}
				channelMentionsProp[mentioned.Name] = map[string]any{
					"display_name": mentioned.DisplayName,
					"team_name":    team.Name,
					"id":           mentioned.Id,
				}
			}
		}
	}
	if len(channelMentionsProp) > 0 {
		post.AddProp(model.PostPropsChannelMentions, channelMentionsProp)
	} else if post.GetProps() != nil {
		post.DelProp(model.PostPropsChannelMentions)
	}
	matched := atMentionPattern.MatchString(post.Message)
	shouldAddProp := false
	if a.Srv().License() != nil && *a.Srv().License().Features.LDAPGroups && matched {
		hasPermission, _ := a.HasPermissionToChannel(rctx, post.UserId, post.ChannelId, model.PermissionUseGroupMentions)
		shouldAddProp = !hasPermission
	}
	if shouldAddProp {
		post.AddProp(model.PostPropsGroupHighlightDisabled, true)
	}
	if aiGenUserID, ok := post.GetProp(model.PostPropsAIGeneratedByUserID).(string); ok && aiGenUserID != "" {
		user, err := a.GetUser(aiGenUserID)
		if err != nil {
			rctx.Logger().Warn("Failed to get user for AI-generated post, removing ai_generated_by prop", mlog.String("user_id", aiGenUserID), mlog.Err(err))
			post.DelProp(model.PostPropsAIGeneratedByUserID)
		} else {
			if user.Id == post.UserId || user.IsBot {
				post.AddProp(model.PostPropsAIGeneratedByUsername, user.Username)
			} else {
				return model.NewAppError("FillInPostProps", "api.post.fill_in_post_props.invalid_ai_generated_user.app_error", nil, "", http.StatusBadRequest)
			}
		}
	}
	if post.Type == model.PostTypeBurnOnRead {
		if !model.MinimumEnterpriseAdvancedLicense(a.Srv().License()) {
			return model.NewAppError("FillInPostProps", "api.post.fill_in_post_props.burn_on_read.license.app_error", nil, "", http.StatusNotImplemented)
		}
		if !a.Config().FeatureFlags.BurnOnRead || !model.SafeDereference(a.Config().ServiceSettings.EnableBurnOnRead) {
			return model.NewAppError("FillInPostProps", "api.post.fill_in_post_props.burn_on_read.config.app_error", nil, "", http.StatusNotImplemented)
		}
		maxTTLSeconds := int64(model.SafeDereference(a.Config().ServiceSettings.BurnOnReadMaximumTimeToLiveSeconds))
		readDurationSeconds := int64(model.SafeDereference(a.Config().ServiceSettings.BurnOnReadDurationSeconds))
		post.AddProp(model.PostPropsExpireAt, model.GetMillis()+(maxTTLSeconds*1000))
		post.AddProp(model.PostPropsReadDurationSeconds, readDurationSeconds*1000)
	}
	return nil
}
func (a *App) handlePostEvents(rctx request.CTX, post *model.Post, user *model.User, channel *model.Channel, triggerWebhooks bool, parentPostList *model.PostList, setOnline bool) error {
	var team *model.Team
	if channel.TeamId != "" {
		t, err := a.Srv().Store().Team().Get(channel.TeamId)
		if err != nil {
			a.CountNotificationReason(model.NotificationStatusError, model.NotificationTypeAll, model.NotificationReasonFetchError, model.NotificationNoPlatform)
			a.Log().LogM(mlog.MlvlNotificationError, "Missing team",
				mlog.String("post_id", post.Id),
				mlog.String("status", model.NotificationStatusError),
				mlog.String("reason", model.NotificationReasonFetchError),
				mlog.Err(err),
			)
			return err
		}
		team = t
	} else {
		team = &model.Team{}
	}
	a.Srv().Platform().InvalidateCacheForChannel(channel)
	if post.IsPinned {
		a.Srv().Store().Channel().InvalidatePinnedPostCount(channel.Id)
	}
	a.Srv().Store().Post().InvalidateLastPostTimeCache(channel.Id)
	if _, err := a.SendNotifications(rctx, post, team, channel, user, parentPostList, setOnline); err != nil {
		return err
	}
	if post.Type != model.PostTypeAutoResponder {
		a.Srv().Go(func() {
			_, err := a.SendAutoResponseIfNecessary(rctx, channel, user, post)
			if err != nil {
				rctx.Logger().Error("Failed to send auto response", mlog.String("user_id", user.Id), mlog.String("post_id", post.Id), mlog.Err(err))
			}
		})
	}
	if triggerWebhooks && post.Type != model.PostTypeBurnOnRead {
		a.Srv().Go(func() {
			if err := a.handleWebhookEvents(rctx, post, team, channel, user); err != nil {
				rctx.Logger().Error("Failed to handle webhook event", mlog.String("user_id", user.Id), mlog.String("post_id", post.Id), mlog.Err(err))
			}
		})
	}
	return nil
}
func (a *App) SendEphemeralPost(rctx request.CTX, userID string, post *model.Post) (*model.Post, bool) {
	post.Type = model.PostTypeEphemeral
	if post.Id == "" {
		post.Id = model.NewId()
	}
	if post.CreateAt == 0 {
		post.CreateAt = model.GetMillis()
	}
	if post.GetProps() == nil {
		post.SetProps(make(model.StringInterface))
	}
	post.GenerateActionIds()
	message := model.NewWebSocketEvent(model.WebsocketEventEphemeralMessage, "", post.ChannelId, userID, nil, "")
	post = a.PreparePostForClientWithEmbedsAndImages(rctx, post, &model.PreparePostForClientOpts{IsNewPost: true, IncludePriority: true})
	post = model.AddPostActionCookies(post, a.PostActionCookieSecret())
	sanitizedPost, isMemberForPreviews, appErr := a.SanitizePostMetadataForUser(rctx, post, userID)
	if appErr != nil {
		rctx.Logger().Error("Failed to sanitize post metadata for user", mlog.String("user_id", userID), mlog.Err(appErr))
		sanitizedPost = post.Clone()
		sanitizedPost.Metadata = nil
		sanitizedPost.DelProp(model.PostPropsPreviewedPost)
	}
	post = sanitizedPost
	postJSON, jsonErr := post.ToJSON()
	if jsonErr != nil {
		rctx.Logger().Warn("Failed to encode post to JSON", mlog.Err(jsonErr))
	}
	message.Add("post", postJSON)
	a.Publish(message)
	return post, isMemberForPreviews
}
func (a *App) UpdateEphemeralPost(rctx request.CTX, userID string, post *model.Post) (*model.Post, bool) {
	post.Type = model.PostTypeEphemeral
	post.UpdateAt = model.GetMillis()
	if post.GetProps() == nil {
		post.SetProps(make(model.StringInterface))
	}
	post.GenerateActionIds()
	message := model.NewWebSocketEvent(model.WebsocketEventPostEdited, "", post.ChannelId, userID, nil, "")
	post = a.PreparePostForClientWithEmbedsAndImages(rctx, post, &model.PreparePostForClientOpts{IsNewPost: true, IncludePriority: true})
	post = model.AddPostActionCookies(post, a.PostActionCookieSecret())
	sanitizedPost, isMemberForPreviews, appErr := a.SanitizePostMetadataForUser(rctx, post, userID)
	if appErr != nil {
		rctx.Logger().Error("Failed to sanitize post metadata for user", mlog.String("user_id", userID), mlog.Err(appErr))
		sanitizedPost = post.Clone()
		sanitizedPost.Metadata = nil
		sanitizedPost.DelProp(model.PostPropsPreviewedPost)
	}
	post = sanitizedPost
	postJSON, jsonErr := post.ToJSON()
	if jsonErr != nil {
		rctx.Logger().Warn("Failed to encode post to JSON", mlog.Err(jsonErr))
	}
	message.Add("post", postJSON)
	a.Publish(message)
	return post, isMemberForPreviews
}
func (a *App) DeleteEphemeralPost(rctx request.CTX, userID, postID string) {
	post := &model.Post{
		Id:       postID,
		UserId:   userID,
		Type:     model.PostTypeEphemeral,
		DeleteAt: model.GetMillis(),
		UpdateAt: model.GetMillis(),
	}
	message := model.NewWebSocketEvent(model.WebsocketEventPostDeleted, "", "", userID, nil, "")
	postJSON, jsonErr := post.ToJSON()
	if jsonErr != nil {
		rctx.Logger().Warn("Failed to encode post to JSON", mlog.Err(jsonErr))
	}
	message.Add("post", postJSON)
	a.Publish(message)
}
func (a *App) UpdatePost(rctx request.CTX, receivedUpdatedPost *model.Post, updatePostOptions *model.UpdatePostOptions) (*model.Post, bool, *model.AppError) {
	if updatePostOptions == nil {
		updatePostOptions = model.DefaultUpdatePostOptions()
	}
	receivedUpdatedPost.SanitizeProps()
	postLists, nErr := a.Srv().Store().Post().Get(rctx, receivedUpdatedPost.Id, model.GetPostsOptions{}, "", a.Config().GetSanitizeOptions())
	if nErr != nil {
		var nfErr *store.ErrNotFound
		var invErr *store.ErrInvalidInput
		switch {
		case errors.As(nErr, &invErr):
			return nil, false, model.NewAppError("UpdatePost", "app.post.get.app_error", nil, "", http.StatusBadRequest).Wrap(nErr)
		case errors.As(nErr, &nfErr):
			return nil, false, model.NewAppError("UpdatePost", "app.post.get.app_error", nil, "", http.StatusNotFound).Wrap(nErr)
		default:
			return nil, false, model.NewAppError("UpdatePost", "app.post.get.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
		}
	}
	oldPost := postLists.Posts[receivedUpdatedPost.Id]
	var appErr *model.AppError
	if oldPost == nil {
		appErr = model.NewAppError("UpdatePost", "api.post.update_post.find.app_error", nil, "id="+receivedUpdatedPost.Id, http.StatusBadRequest)
		return nil, false, appErr
	}
	if oldPost.DeleteAt != 0 {
		appErr = model.NewAppError("UpdatePost", "api.post.update_post.permissions_details.app_error", map[string]any{"PostId": receivedUpdatedPost.Id}, "", http.StatusBadRequest)
		return nil, false, appErr
	}
	if oldPost.Type == model.PostTypeBurnOnRead {
		return nil, false, model.NewAppError("UpdatePost", "api.post.update_post.burn_on_read.app_error", nil, "", http.StatusBadRequest)
	}
	if oldPost.IsSystemMessage() {
		appErr = model.NewAppError("UpdatePost", "api.post.update_post.system_message.app_error", nil, "id="+receivedUpdatedPost.Id, http.StatusBadRequest)
		return nil, false, appErr
	}
	channel, appErr := a.GetChannel(rctx, oldPost.ChannelId)
	if appErr != nil {
		return nil, false, appErr
	}
	if channel.DeleteAt != 0 {
		return nil, false, model.NewAppError("UpdatePost", "api.post.update_post.can_not_update_post_in_deleted.error", nil, "", http.StatusBadRequest)
	}
	restrictDM, err := a.CheckIfChannelIsRestrictedDM(rctx, channel)
	if err != nil {
		return nil, false, err
	}
	if restrictDM {
		err := model.NewAppError("UpdatePost", "api.post.update_post.can_not_update_post_in_restricted_dm.error", nil, "", http.StatusBadRequest)
		return nil, false, err
	}
	newPost := oldPost.Clone()
	if newPost.Message != receivedUpdatedPost.Message {
		newPost.Message = receivedUpdatedPost.Message
		newPost.EditAt = model.GetMillis()
		newPost.Hashtags, _ = model.ParseHashtags(receivedUpdatedPost.Message)
	}
	if !updatePostOptions.SafeUpdate {
		newPost.IsPinned = receivedUpdatedPost.IsPinned
		newPost.HasReactions = receivedUpdatedPost.HasReactions
		newPost.SetProps(receivedUpdatedPost.GetProps())
		var fileIds []string
		fileIds, appErr = a.processPostFileChanges(rctx, receivedUpdatedPost, oldPost, updatePostOptions)
		if appErr != nil {
			return nil, false, appErr
		}
		newPost.FileIds = fileIds
	}
	if newPost.EditAt == oldPost.EditAt && (!oldPost.FileIds.Equals(newPost.FileIds) || !oldPost.AttachmentsEqual(newPost)) {
		newPost.EditAt = model.GetMillis()
	}
	if appErr = a.FillInPostProps(rctx, newPost, nil); appErr != nil {
		return nil, false, appErr
	}
	if receivedUpdatedPost.IsRemote() {
		oldPost.RemoteId = model.NewPointer(*receivedUpdatedPost.RemoteId)
	}
	var rejectionReason string
	pluginContext := pluginContext(rctx)
	if newPost.Type != model.PostTypeBurnOnRead {
		a.ch.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
			newPost, rejectionReason = hooks.MessageWillBeUpdated(pluginContext, newPost.ForPlugin(), oldPost.ForPlugin())
			return newPost != nil
		}, plugin.MessageWillBeUpdatedID)
		if newPost == nil {
			return nil, false, model.NewAppError("UpdatePost", "Post rejected by plugin. "+rejectionReason, nil, "", http.StatusBadRequest)
		}
	}
	if receivedUpdatedPost.Metadata != nil {
		newPost.Metadata = receivedUpdatedPost.Metadata.Copy()
		newPost.Metadata.Embeds = nil
	} else {
		newPost.Metadata = oldPost.Metadata
	}
	rpost, nErr := a.Srv().Store().Post().Update(rctx, newPost, oldPost)
	if nErr != nil {
		switch {
		case errors.As(nErr, &appErr):
			return nil, false, appErr
		default:
			return nil, false, model.NewAppError("UpdatePost", "app.post.update.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
		}
	}
	pluginOldPost := oldPost.ForPlugin()
	pluginNewPost := newPost.ForPlugin()
	if newPost.Type != model.PostTypeBurnOnRead {
		a.Srv().Go(func() {
			a.ch.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
				hooks.MessageHasBeenUpdated(pluginContext, pluginNewPost, pluginOldPost)
				return true
			}, plugin.MessageHasBeenUpdatedID)
		})
	}
	rpost = a.PreparePostForClientWithEmbedsAndImages(rctx, rpost, &model.PreparePostForClientOpts{IsEditPost: true, IncludePriority: true})
	rpost.IsFollowing = nil
	rpost, nErr = a.addPostPreviewProp(rctx, rpost)
	if nErr != nil {
		return nil, false, model.NewAppError("UpdatePost", "app.post.update.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
	}
	if a.AutoTranslation() != nil && a.AutoTranslation().IsFeatureAvailable() {
		enabled, atErr := a.AutoTranslation().IsChannelEnabled(rpost.ChannelId)
		if atErr == nil && enabled {
			_, translateErr := a.AutoTranslation().Translate(rctx.Context(), model.TranslationObjectTypePost, rpost.Id, rpost.ChannelId, rpost.UserId, rpost)
			if translateErr != nil {
				var notAvailErr *model.ErrAutoTranslationNotAvailable
				switch {
				case errors.As(translateErr, &notAvailErr):
					rctx.Logger().Debug("Auto-translation feature not available for edited post", mlog.String("post_id", rpost.Id), mlog.Err(translateErr))
				case translateErr.Id == "ent.autotranslation.no_translatable_content":
				default:
					rctx.Logger().Warn("Failed to translate edited post", mlog.String("post_id", rpost.Id), mlog.Err(translateErr))
				}
			}
		} else if atErr != nil {
			rctx.Logger().Warn("Failed to check if channel is enabled for auto-translation", mlog.String("channel_id", rpost.ChannelId), mlog.Err(atErr))
		}
	}
	message := model.NewWebSocketEvent(model.WebsocketEventPostEdited, "", rpost.ChannelId, "", nil, "")
	appErr = a.publishWebsocketEventForPost(rctx, rpost, message)
	if appErr != nil {
		return nil, false, appErr
	}
	a.invalidateCacheForChannelPosts(rpost.ChannelId)
	userID := rctx.Session().UserId
	sanitizedPost, isMemberForPreviews, appErr := a.SanitizePostMetadataForUser(rctx, rpost, userID)
	if appErr != nil {
		mlog.Error("Failed to sanitize post metadata for user", mlog.String("user_id", userID), mlog.Err(appErr))
		sanitizedPost = rpost.Clone()
		sanitizedPost.Metadata = nil
		sanitizedPost.DelProp(model.PostPropsPreviewedPost)
	}
	rpost = sanitizedPost
	return rpost, isMemberForPreviews, nil
}
func (a *App) publishWebsocketEventForPost(rctx request.CTX, post *model.Post, message *model.WebSocketEvent) *model.AppError {
	if post.Type == model.PostTypeBurnOnRead {
		post.Message = ""
		post.FileIds = []string{}
	}
	permalinkPreviewedPost := post.GetPreviewPost()
	previewProp := post.GetPreviewedPostProp()
	channelMentionsProp := post.GetProp(model.PostPropsChannelMentions)
	var channelMentions map[string]any
	if channelMentionsProp != nil {
		channelMentions, _ = channelMentionsProp.(map[string]any)
	}
	removePermalinkMetadataFromPost(post)
	post.DelProp(model.PostPropsChannelMentions)
	postJSON, jsonErr := post.ToJSON()
	if jsonErr != nil {
		a.CountNotificationReason(model.NotificationStatusError, model.NotificationTypeAll, model.NotificationReasonMarshalError, model.NotificationNoPlatform)
		a.Log().LogM(mlog.MlvlNotificationError, "Error in marshalling post to JSON",
			mlog.String("type", model.NotificationTypeWebsocket),
			mlog.String("post_id", post.Id),
			mlog.String("status", model.NotificationStatusError),
			mlog.String("reason", model.NotificationReasonMarshalError),
		)
		return model.NewAppError("publishWebsocketEventForPost", "app.post.marshal.app_error", nil, "", http.StatusInternalServerError).Wrap(jsonErr)
	}
	message.Add("post", postJSON)
	appErr := a.setupBroadcastHookForPermalink(rctx, post, message, permalinkPreviewedPost, previewProp)
	if appErr != nil {
		return appErr
	}
	appErr = a.setupBroadcastHookForChannelMentions(rctx, post, message, channelMentions)
	if appErr != nil {
		return appErr
	}
	if post.Type == model.PostTypeBurnOnRead {
		appErr = a.processBroadcastHookForBurnOnRead(rctx, postJSON, post, message)
		if appErr != nil {
			return appErr
		}
	}
	a.Publish(message)
	return nil
}
func (a *App) setupBroadcastHookForPermalink(rctx request.CTX, post *model.Post, message *model.WebSocketEvent, permalinkPreviewedPost *model.PreviewPost, previewProp string) *model.AppError {
	if permalinkPreviewedPost == nil || previewProp == "" {
		return nil
	}
	if !model.IsValidId(previewProp) {
		a.CountNotificationReason(model.NotificationStatusError, model.NotificationTypeAll, model.NotificationReasonParseError, model.NotificationNoPlatform)
		a.Log().LogM(mlog.MlvlNotificationError, "Invalid post prop id for permalink post",
			mlog.String("type", model.NotificationTypeWebsocket),
			mlog.String("post_id", post.Id),
			mlog.String("status", model.NotificationStatusError),
			mlog.String("reason", model.NotificationReasonParseError),
			mlog.String("prop_value", previewProp),
		)
		rctx.Logger().Warn("invalid post prop value", mlog.String("prop_key", model.PostPropsPreviewedPost), mlog.String("prop_value", previewProp))
		return nil
	}
	previewedPost, appErr := a.GetSinglePost(rctx, previewProp, false)
	if appErr != nil {
		if appErr.StatusCode == http.StatusNotFound {
			a.CountNotificationReason(model.NotificationStatusError, model.NotificationTypeAll, model.NotificationReasonFetchError, model.NotificationNoPlatform)
			a.Log().LogM(mlog.MlvlNotificationError, "permalink post not found",
				mlog.String("type", model.NotificationTypeWebsocket),
				mlog.String("post_id", post.Id),
				mlog.String("status", model.NotificationStatusError),
				mlog.String("reason", model.NotificationReasonFetchError),
				mlog.String("referenced_post_id", previewProp),
				mlog.Err(appErr),
			)
			rctx.Logger().Warn("permalinked post not found", mlog.String("referenced_post_id", previewProp))
			return nil
		}
		return appErr
	}
	permalinkPreviewedChannel, appErr := a.GetChannel(rctx, previewedPost.ChannelId)
	if appErr != nil {
		if appErr.StatusCode == http.StatusNotFound {
			a.CountNotificationReason(model.NotificationStatusError, model.NotificationTypeAll, model.NotificationReasonFetchError, model.NotificationNoPlatform)
			a.Log().LogM(mlog.MlvlNotificationError, "Cannot get channel",
				mlog.String("type", model.NotificationTypeWebsocket),
				mlog.String("post_id", post.Id),
				mlog.String("status", model.NotificationStatusError),
				mlog.String("reason", model.NotificationReasonFetchError),
				mlog.String("referenced_post_id", previewedPost.Id),
			)
			rctx.Logger().Warn("channel containing permalinked post not found", mlog.String("referenced_channel_id", previewedPost.ChannelId))
			return nil
		}
		return appErr
	}
	if ok, _ := a.HasPermissionToReadChannel(rctx, post.UserId, permalinkPreviewedChannel); ok {
		post.AddProp(model.PostPropsPreviewedPost, previewProp)
		post.Metadata.Embeds = append(post.Metadata.Embeds, &model.PostEmbed{Type: model.PostEmbedPermalink, Data: permalinkPreviewedPost})
	}
	usePermalinkHook(message, permalinkPreviewedChannel, permalinkPreviewedPost, previewProp)
	return nil
}
func (a *App) setupBroadcastHookForChannelMentions(rctx request.CTX, post *model.Post, message *model.WebSocketEvent, channelMentions map[string]any) *model.AppError {
	if len(channelMentions) == 0 {
		return nil
	}
	post.AddProp(model.PostPropsChannelMentions, channelMentions)
	useChannelMentionsHook(message, channelMentions)
	return nil
}
func (a *App) processBroadcastHookForBurnOnRead(rctx request.CTX, postJSON string, post *model.Post, message *model.WebSocketEvent) *model.AppError {
	tmpPost, appErr := a.getBurnOnReadPost(rctx, post)
	if appErr != nil {
		return appErr
	}
	masterCtx := sqlstore.RequestContextWithMaster(rctx)
	tmpPost = a.PreparePostForClient(masterCtx, tmpPost, &model.PreparePostForClientOpts{IncludePriority: true, RetainContent: true})
	revealedPostJSON, err := tmpPost.ToJSON()
	if err != nil {
		return model.NewAppError("processBroadcastHookForBurnOnRead", "app.post.marshal.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	useBurnOnReadHook(message, post.UserId, revealedPostJSON, postJSON)
	return nil
}
func (a *App) PatchPost(rctx request.CTX, postID string, patch *model.PostPatch, patchPostOptions *model.UpdatePostOptions) (*model.Post, bool, *model.AppError) {
	if patchPostOptions == nil {
		patchPostOptions = model.DefaultUpdatePostOptions()
	}
	post, err := a.GetSinglePost(rctx, postID, false)
	if err != nil {
		return nil, false, err
	}
	if post.Type == model.PostTypeBurnOnRead {
		return nil, false, model.NewAppError("PatchPost", "api.post.patch_post.can_not_update_burn_on_read_post.error", nil, "", http.StatusBadRequest)
	}
	channel, err := a.GetChannel(rctx, post.ChannelId)
	if err != nil {
		return nil, false, err
	}
	if channel.DeleteAt != 0 {
		err = model.NewAppError("PatchPost", "api.post.patch_post.can_not_update_post_in_deleted.error", nil, "", http.StatusBadRequest)
		return nil, false, err
	}
	restrictDM, err := a.CheckIfChannelIsRestrictedDM(rctx, channel)
	if err != nil {
		return nil, false, err
	}
	if restrictDM {
		return nil, false, model.NewAppError("PatchPost", "api.post.patch_post.can_not_update_post_in_restricted_dm.error", nil, "", http.StatusBadRequest)
	}
	if ok, _ := a.HasPermissionToChannel(rctx, post.UserId, post.ChannelId, model.PermissionUseChannelMentions); !ok {
		patch.DisableMentionHighlights()
	}
	post.Patch(patch)
	patchPostOptions.SafeUpdate = false
	updatedPost, isMemberForPreviews, err := a.UpdatePost(rctx, post, patchPostOptions)
	if err != nil {
		return nil, false, err
	}
	return updatedPost, isMemberForPreviews, nil
}
func (a *App) GetPostsPage(rctx request.CTX, options model.GetPostsOptions) (*model.PostList, *model.AppError) {
	postList, err := a.Srv().Store().Post().GetPosts(rctx, options, false, a.Config().GetSanitizeOptions())
	if err != nil {
		var invErr *store.ErrInvalidInput
		switch {
		case errors.As(err, &invErr):
			return nil, model.NewAppError("GetPostsPage", "app.post.get_posts.app_error", nil, "", http.StatusBadRequest).Wrap(err)
		default:
			return nil, model.NewAppError("GetPostsPage", "app.post.get_root_posts.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	var appErr *model.AppError
	postList, appErr = a.revealBurnOnReadPostsForUser(rctx, postList, options.UserId)
	if appErr != nil {
		return nil, appErr
	}
	if appErr = a.filterInaccessiblePosts(postList, filterPostOptions{assumeSortedCreatedAt: true}); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(postList.Posts)
	return postList, nil
}
func (a *App) GetPosts(rctx request.CTX, channelID string, offset int, limit int) (*model.PostList, *model.AppError) {
	postList, err := a.Srv().Store().Post().GetPosts(rctx, model.GetPostsOptions{ChannelId: channelID, Page: offset, PerPage: limit}, true, a.Config().GetSanitizeOptions())
	if err != nil {
		var invErr *store.ErrInvalidInput
		switch {
		case errors.As(err, &invErr):
			return nil, model.NewAppError("GetPosts", "app.post.get_posts.app_error", nil, "", http.StatusBadRequest).Wrap(err)
		default:
			return nil, model.NewAppError("GetPosts", "app.post.get_root_posts.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	var appErr *model.AppError
	postList, appErr = a.revealBurnOnReadPostsForUser(rctx, postList, rctx.Session().UserId)
	if appErr != nil {
		return nil, appErr
	}
	if appErr = a.filterInaccessiblePosts(postList, filterPostOptions{}); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(postList.Posts)
	return postList, nil
}
func (a *App) GetPostsEtag(channelID string, collapsedThreads bool) string {
	if a.AutoTranslation() == nil || !a.AutoTranslation().IsFeatureAvailable() {
		return a.Srv().Store().Post().GetEtag(channelID, true, collapsedThreads, false)
	}
	channelEnabled, err := a.AutoTranslation().IsChannelEnabled(channelID)
	if err != nil || !channelEnabled {
		return a.Srv().Store().Post().GetEtag(channelID, true, collapsedThreads, false)
	}
	return a.Srv().Store().Post().GetEtag(channelID, true, collapsedThreads, true)
}
func (a *App) GetPostsSince(rctx request.CTX, options model.GetPostsSinceOptions) (*model.PostList, *model.AppError) {
	postList, err := a.Srv().Store().Post().GetPostsSince(rctx, options, true, a.Config().GetSanitizeOptions())
	if err != nil {
		return nil, model.NewAppError("GetPostsSince", "app.post.get_posts_since.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	a.supplementWithTranslationUpdatedPosts(rctx, postList, options.ChannelId, options.Time, options.CollapsedThreads)
	if appErr := a.filterInaccessiblePosts(postList, filterPostOptions{assumeSortedCreatedAt: true}); appErr != nil {
		return nil, appErr
	}
	var appErr *model.AppError
	postList, appErr = a.revealBurnOnReadPostsForUser(rctx, postList, options.UserId)
	if appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(postList.Posts)
	return postList, nil
}
func (a *App) supplementWithTranslationUpdatedPosts(rctx request.CTX, postList *model.PostList, channelID string, since int64, collapsedThreads bool) {
	if a.AutoTranslation() == nil || !a.AutoTranslation().IsFeatureAvailable() {
		return
	}
	userID := rctx.Session().UserId
	userLang, appErr := a.AutoTranslation().GetUserLanguage(userID, channelID)
	if appErr != nil {
		rctx.Logger().Debug("Failed to get user language for translation-since supplement", mlog.String("channel_id", channelID), mlog.Err(appErr))
		return
	}
	if userLang == "" {
		return
	}
	translationsMap, err := a.Srv().Store().AutoTranslation().GetTranslationsSinceForChannel(channelID, userLang, since)
	if err != nil {
		rctx.Logger().Warn("Failed to get translations since for channel", mlog.String("channel_id", channelID), mlog.Err(err))
		return
	}
	var missingPostIDs []string
	for postID := range translationsMap {
		if _, exists := postList.Posts[postID]; !exists {
			missingPostIDs = append(missingPostIDs, postID)
		}
	}
	if len(missingPostIDs) == 0 {
		return
	}
	posts, err := a.Srv().Store().Post().GetPostsByIds(missingPostIDs)
	if err != nil {
		rctx.Logger().Warn("Failed to fetch posts for translation-since supplement", mlog.Err(err))
		return
	}
	for _, post := range posts {
		if post.DeleteAt != 0 {
			continue
		}
		if collapsedThreads && post.RootId != "" {
			continue
		}
		t, ok := translationsMap[post.Id]
		if !ok {
			continue
		}
		if post.Metadata == nil {
			post.Metadata = &model.PostMetadata{}
		}
		if post.Metadata.Translations == nil {
			post.Metadata.Translations = make(map[string]*model.PostTranslation)
		}
		post.Metadata.Translations[t.Lang] = t.ToPostTranslation()
		postList.Posts[post.Id] = post
	}
}
func (a *App) GetSinglePost(rctx request.CTX, postID string, includeDeleted bool) (*model.Post, *model.AppError) {
	post, err := a.Srv().Store().Post().GetSingle(rctx, postID, includeDeleted)
	if err != nil {
		var nfErr *store.ErrNotFound
		switch {
		case errors.As(err, &nfErr):
			return nil, model.NewAppError("GetSinglePost", "app.post.get.app_error", nil, "", http.StatusNotFound).Wrap(err)
		default:
			return nil, model.NewAppError("GetSinglePost", "app.post.get.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	post, appErr := a.revealSingleBurnOnReadPost(rctx, post, rctx.Session().UserId)
	if appErr != nil {
		return nil, appErr
	}
	firstInaccessiblePostTime, appErr := a.isInaccessiblePost(post)
	if appErr != nil {
		return nil, appErr
	}
	if firstInaccessiblePostTime != 0 {
		return nil, model.NewAppError("GetSinglePost", "app.post.cloud.get.app_error", nil, "", http.StatusForbidden)
	}
	a.applyPostWillBeConsumedHook(&post)
	return post, nil
}
func (a *App) GetPostThread(rctx request.CTX, postID string, opts model.GetPostsOptions, userID string) (*model.PostList, *model.AppError) {
	posts, err := a.Srv().Store().Post().Get(rctx, postID, opts, userID, a.Config().GetSanitizeOptions())
	if err != nil {
		var nfErr *store.ErrNotFound
		var invErr *store.ErrInvalidInput
		switch {
		case errors.As(err, &invErr):
			return nil, model.NewAppError("GetPostThread", "app.post.get.app_error", nil, "", http.StatusBadRequest).Wrap(err)
		case errors.As(err, &nfErr):
			return nil, model.NewAppError("GetPostThread", "app.post.get.app_error", nil, "", http.StatusNotFound).Wrap(err)
		default:
			return nil, model.NewAppError("GetPostThread", "app.post.get.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	var appErr *model.AppError
	posts, appErr = a.revealBurnOnReadPostsForUser(rctx, posts, userID)
	if appErr != nil {
		return nil, appErr
	}
	filterOptions := filterPostOptions{}
	if opts.CollapsedThreads && opts.Direction != "" {
		filterOptions.assumeSortedCreatedAt = true
	}
	if appErr = a.filterInaccessiblePosts(posts, filterOptions); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(posts.Posts)
	return posts, nil
}
func (a *App) GetFlaggedPosts(rctx request.CTX, userID string, offset int, limit int) (*model.PostList, *model.AppError) {
	postList, err := a.Srv().Store().Post().GetFlaggedPosts(userID, offset, limit)
	if err != nil {
		return nil, model.NewAppError("GetFlaggedPosts", "app.post.get_flagged_posts.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	var appErr *model.AppError
	postList, appErr = a.revealBurnOnReadPostsForUser(rctx, postList, userID)
	if appErr != nil {
		return nil, appErr
	}
	if appErr = a.filterInaccessiblePosts(postList, filterPostOptions{assumeSortedCreatedAt: true}); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(postList.Posts)
	return postList, nil
}
func (a *App) GetFlaggedPostsForTeam(rctx request.CTX, userID, teamID string, offset int, limit int) (*model.PostList, *model.AppError) {
	postList, err := a.Srv().Store().Post().GetFlaggedPostsForTeam(userID, teamID, offset, limit)
	if err != nil {
		return nil, model.NewAppError("GetFlaggedPostsForTeam", "app.post.get_flagged_posts.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	var appErr *model.AppError
	postList, appErr = a.revealBurnOnReadPostsForUser(rctx, postList, userID)
	if appErr != nil {
		return nil, appErr
	}
	if appErr = a.filterInaccessiblePosts(postList, filterPostOptions{assumeSortedCreatedAt: true}); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(postList.Posts)
	return postList, nil
}
func (a *App) GetFlaggedPostsForChannel(rctx request.CTX, userID, channelID string, offset int, limit int) (*model.PostList, *model.AppError) {
	postList, err := a.Srv().Store().Post().GetFlaggedPostsForChannel(userID, channelID, offset, limit)
	if err != nil {
		return nil, model.NewAppError("GetFlaggedPostsForChannel", "app.post.get_flagged_posts.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	var appErr *model.AppError
	postList, appErr = a.revealBurnOnReadPostsForUser(rctx, postList, userID)
	if appErr != nil {
		return nil, appErr
	}
	if appErr = a.filterInaccessiblePosts(postList, filterPostOptions{assumeSortedCreatedAt: true}); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(postList.Posts)
	return postList, nil
}
func (a *App) GetPermalinkPost(rctx request.CTX, postID string, userID string) (*model.PostList, *model.AppError) {
	list, nErr := a.Srv().Store().Post().Get(rctx, postID, model.GetPostsOptions{}, userID, a.Config().GetSanitizeOptions())
	if nErr != nil {
		var nfErr *store.ErrNotFound
		var invErr *store.ErrInvalidInput
		switch {
		case errors.As(nErr, &invErr):
			return nil, model.NewAppError("GetPermalinkPost", "app.post.get.app_error", nil, "", http.StatusBadRequest).Wrap(nErr)
		case errors.As(nErr, &nfErr):
			return nil, model.NewAppError("GetPermalinkPost", "app.post.get.app_error", nil, "", http.StatusNotFound).Wrap(nErr)
		default:
			return nil, model.NewAppError("GetPermalinkPost", "app.post.get.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
		}
	}
	var appErr *model.AppError
	list, appErr = a.revealBurnOnReadPostsForUser(rctx, list, userID)
	if appErr != nil {
		return nil, appErr
	}
	if len(list.Order) != 1 {
		return nil, model.NewAppError("getPermalinkTmp", "api.post_get_post_by_id.get.app_error", nil, "", http.StatusNotFound)
	}
	post := list.Posts[list.Order[0]]
	channel, err := a.GetChannel(rctx, post.ChannelId)
	if err != nil {
		return nil, err
	}
	if err = a.JoinChannel(rctx, channel, userID); err != nil {
		return nil, err
	}
	if appErr := a.filterInaccessiblePosts(list, filterPostOptions{assumeSortedCreatedAt: true}); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(list.Posts)
	return list, nil
}
func (a *App) GetPostsBeforePost(rctx request.CTX, options model.GetPostsOptions) (*model.PostList, *model.AppError) {
	postList, err := a.Srv().Store().Post().GetPostsBefore(rctx, options, a.Config().GetSanitizeOptions())
	if err != nil {
		var invErr *store.ErrInvalidInput
		switch {
		case errors.As(err, &invErr):
			return nil, model.NewAppError("GetPostsBeforePost", "app.post.get_posts_around.get.app_error", nil, "", http.StatusBadRequest).Wrap(err)
		default:
			return nil, model.NewAppError("GetPostsBeforePost", "app.post.get_posts_around.get.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	var appErr *model.AppError
	postList, appErr = a.revealBurnOnReadPostsForUser(rctx, postList, options.UserId)
	if appErr != nil {
		return nil, appErr
	}
	filterOptions := filterPostOptions{}
	if options.ChannelId != "" {
		filterOptions.assumeSortedCreatedAt = true
	}
	if appErr := a.filterInaccessiblePosts(postList, filterOptions); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(postList.Posts)
	return postList, nil
}
func (a *App) GetPostsAfterPost(rctx request.CTX, options model.GetPostsOptions) (*model.PostList, *model.AppError) {
	postList, err := a.Srv().Store().Post().GetPostsAfter(rctx, options, a.Config().GetSanitizeOptions())
	if err != nil {
		var invErr *store.ErrInvalidInput
		switch {
		case errors.As(err, &invErr):
			return nil, model.NewAppError("GetPostsAfterPost", "app.post.get_posts_around.get.app_error", nil, "", http.StatusBadRequest).Wrap(err)
		default:
			return nil, model.NewAppError("GetPostsAfterPost", "app.post.get_posts_around.get.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	var appErr *model.AppError
	postList, appErr = a.revealBurnOnReadPostsForUser(rctx, postList, options.UserId)
	if appErr != nil {
		return nil, appErr
	}
	filterOptions := filterPostOptions{}
	if options.ChannelId != "" {
		filterOptions.assumeSortedCreatedAt = true
	}
	if appErr := a.filterInaccessiblePosts(postList, filterOptions); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(postList.Posts)
	return postList, nil
}
func (a *App) GetPostsAroundPost(rctx request.CTX, before bool, options model.GetPostsOptions) (*model.PostList, *model.AppError) {
	var postList *model.PostList
	var err error
	sanitize := a.Config().GetSanitizeOptions()
	if before {
		postList, err = a.Srv().Store().Post().GetPostsBefore(rctx, options, sanitize)
	} else {
		postList, err = a.Srv().Store().Post().GetPostsAfter(rctx, options, sanitize)
	}
	if err != nil {
		var invErr *store.ErrInvalidInput
		switch {
		case errors.As(err, &invErr):
			return nil, model.NewAppError("GetPostsAroundPost", "app.post.get_posts_around.get.app_error", nil, "", http.StatusBadRequest).Wrap(err)
		default:
			return nil, model.NewAppError("GetPostsAroundPost", "app.post.get_posts_around.get.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	var appErr *model.AppError
	postList, appErr = a.revealBurnOnReadPostsForUser(rctx, postList, options.UserId)
	if appErr != nil {
		return nil, appErr
	}
	filterOptions := filterPostOptions{}
	if options.ChannelId != "" {
		filterOptions.assumeSortedCreatedAt = true
	}
	if appErr := a.filterInaccessiblePosts(postList, filterOptions); appErr != nil {
		return nil, appErr
	}
	a.applyPostsWillBeConsumedHook(postList.Posts)
	return postList, nil
}
func (a *App) GetPostAfterTime(channelID string, time int64, collapsedThreads bool) (*model.Post, *model.AppError) {
	post, err := a.Srv().Store().Post().GetPostAfterTime(channelID, time, collapsedThreads)
	if err != nil {
		return nil, model.NewAppError("GetPostAfterTime", "app.post.get_post_after_time.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	a.applyPostWillBeConsumedHook(&post)
	return post, nil
}
func (a *App) GetPostIdAfterTime(channelID string, time int64, collapsedThreads bool) (string, *model.AppError) {
	postID, err := a.Srv().Store().Post().GetPostIdAfterTime(channelID, time, collapsedThreads)
	if err != nil {
		return "", model.NewAppError("GetPostIdAfterTime", "app.post.get_post_id_around.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return postID, nil
}
func (a *App) GetPostIdBeforeTime(channelID string, time int64, collapsedThreads bool) (string, *model.AppError) {
	postID, err := a.Srv().Store().Post().GetPostIdBeforeTime(channelID, time, collapsedThreads)
	if err != nil {
		return "", model.NewAppError("GetPostIdBeforeTime", "app.post.get_post_id_around.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return postID, nil
}
func (a *App) GetNextPostIdFromPostList(postList *model.PostList, collapsedThreads bool) string {
	if len(postList.Order) > 0 {
		firstPostId := postList.Order[0]
		firstPost := postList.Posts[firstPostId]
		nextPostId, err := a.GetPostIdAfterTime(firstPost.ChannelId, firstPost.CreateAt, collapsedThreads)
		if err != nil {
			mlog.Warn("GetNextPostIdFromPostList: failed in getting next post", mlog.Err(err))
		}
		return nextPostId
	}
	return ""
}
func (a *App) GetPrevPostIdFromPostList(postList *model.PostList, collapsedThreads bool) string {
	if len(postList.Order) > 0 {
		lastPostId := postList.Order[len(postList.Order)-1]
		lastPost := postList.Posts[lastPostId]
		previousPostId, err := a.GetPostIdBeforeTime(lastPost.ChannelId, lastPost.CreateAt, collapsedThreads)
		if err != nil {
			mlog.Warn("GetPrevPostIdFromPostList: failed in getting previous post", mlog.Err(err))
		}
		return previousPostId
	}
	return ""
}
func (a *App) AddCursorIdsForPostList(originalList *model.PostList, afterPost, beforePost string, since int64, page, perPage int, collapsedThreads bool) {
	prevPostIdSet := false
	prevPostId := ""
	nextPostIdSet := false
	nextPostId := ""
	if since > 0 {
		nextPostIdSet = true
		prevPostIdSet = true
	} else if afterPost != "" {
		if page == 0 {
			prevPostId = afterPost
			prevPostIdSet = true
		}
		if len(originalList.Order) < perPage {
			nextPostIdSet = true
		}
	} else if beforePost != "" {
		if page == 0 {
			nextPostId = beforePost
			nextPostIdSet = true
		}
		if len(originalList.Order) < perPage {
			prevPostIdSet = true
		}
	}
	if !nextPostIdSet {
		nextPostId = a.GetNextPostIdFromPostList(originalList, collapsedThreads)
	}
	if !prevPostIdSet {
		prevPostId = a.GetPrevPostIdFromPostList(originalList, collapsedThreads)
	}
	originalList.NextPostId = nextPostId
	originalList.PrevPostId = prevPostId
}
func (a *App) GetPostsForChannelAroundLastUnread(rctx request.CTX, channelID, userID string, limitBefore, limitAfter int, skipFetchThreads bool, collapsedThreads, collapsedThreadsExtended bool) (*model.PostList, *model.AppError) {
	var lastViewedAt int64
	var err *model.AppError
	if lastViewedAt, err = a.Srv().getChannelMemberLastViewedAt(rctx, channelID, userID); err != nil {
		return nil, err
	} else if lastViewedAt == 0 {
		return model.NewPostList(), nil
	}
	lastUnreadPostId, err := a.GetPostIdAfterTime(channelID, lastViewedAt, collapsedThreads)
	if err != nil {
		return nil, err
	} else if lastUnreadPostId == "" {
		return model.NewPostList(), nil
	}
	opts := model.GetPostsOptions{
		SkipFetchThreads:         skipFetchThreads,
		CollapsedThreads:         collapsedThreads,
		CollapsedThreadsExtended: collapsedThreadsExtended,
	}
	postList, err := a.GetPostThread(rctx, lastUnreadPostId, opts, userID)
	if err != nil {
		return nil, err
	}
	postList.Order = []string{}
	if _, ok := postList.Posts[lastUnreadPostId]; ok {
		postList.Order = []string{lastUnreadPostId}
		if postListBefore, err := a.GetPostsBeforePost(rctx, model.GetPostsOptions{ChannelId: channelID, PostId: lastUnreadPostId, Page: PageDefault, PerPage: limitBefore, SkipFetchThreads: skipFetchThreads, CollapsedThreads: collapsedThreads, CollapsedThreadsExtended: collapsedThreadsExtended, UserId: userID}); err != nil {
			return nil, err
		} else if postListBefore != nil {
			postList.Extend(postListBefore)
		}
	}
	if postListAfter, err := a.GetPostsAfterPost(rctx, model.GetPostsOptions{ChannelId: channelID, PostId: lastUnreadPostId, Page: PageDefault, PerPage: limitAfter - 1, SkipFetchThreads: skipFetchThreads, CollapsedThreads: collapsedThreads, CollapsedThreadsExtended: collapsedThreadsExtended, UserId: userID}); err != nil {
		return nil, err
	} else if postListAfter != nil {
		postList.Extend(postListAfter)
	}
	postList.SortByCreateAt()
	return postList, nil
}
func (a *App) DeletePost(rctx request.CTX, postID, deleteByID string) (*model.Post, *model.AppError) {
	post, err := a.Srv().Store().Post().GetSingle(sqlstore.RequestContextWithMaster(rctx), postID, false)
	if err != nil {
		return nil, model.NewAppError("DeletePost", "app.post.get.app_error", nil, "", http.StatusBadRequest).Wrap(err)
	}
	channel, appErr := a.GetChannel(rctx, post.ChannelId)
	if appErr != nil {
		return nil, appErr
	}
	if channel.DeleteAt != 0 {
		return nil, model.NewAppError("DeletePost", "api.post.delete_post.can_not_delete_post_in_deleted.error", nil, "", http.StatusBadRequest)
	}
	restrictDM, appErr := a.CheckIfChannelIsRestrictedDM(rctx, channel)
	if appErr != nil {
		return nil, appErr
	}
	if restrictDM {
		err := model.NewAppError("DeletePost", "api.post.delete_post.can_not_delete_from_restricted_dm.error", nil, "", http.StatusBadRequest)
		return nil, err
	}
	err = a.Srv().Store().Post().Delete(rctx, postID, model.GetMillis(), deleteByID)
	if err != nil {
		var nfErr *store.ErrNotFound
		switch {
		case errors.As(err, &nfErr):
			return nil, model.NewAppError("DeletePost", "app.post.delete.app_error", nil, "", http.StatusNotFound).Wrap(err)
		default:
			return nil, model.NewAppError("DeletePost", "app.post.delete.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	if len(post.FileIds) > 0 {
		a.Srv().Go(func() {
			a.deletePostFiles(rctx, post.Id)
		})
		a.Srv().Store().FileInfo().InvalidateFileInfosForPostCache(postID, true)
		a.Srv().Store().FileInfo().InvalidateFileInfosForPostCache(postID, false)
	}
	appErr = a.CleanUpAfterPostDeletion(rctx, post, deleteByID)
	if appErr != nil {
		return nil, appErr
	}
	return post, nil
}
func (a *App) deleteDraftsAssociatedWithPost(rctx request.CTX, channel *model.Channel, post *model.Post) {
	if err := a.Srv().Store().Draft().DeleteDraftsAssociatedWithPost(channel.Id, post.Id); err != nil {
		rctx.Logger().Error("Failed to delete drafts associated with post when deleting post", mlog.Err(err))
		return
	}
}
func (a *App) deleteFlaggedPosts(rctx request.CTX, postID string) {
	if err := a.Srv().Store().Preference().DeleteCategoryAndName(model.PreferenceCategoryFlaggedPost, postID); err != nil {
		rctx.Logger().Warn("Unable to delete flagged post preference when deleting post.", mlog.Err(err))
		return
	}
}
func (a *App) deletePostFiles(rctx request.CTX, postID string) {
	if _, err := a.Srv().Store().FileInfo().DeleteForPost(rctx, postID); err != nil {
		rctx.Logger().Warn("Encountered error when deleting files for post", mlog.String("post_id", postID), mlog.Err(err))
	}
}
func (a *App) parseAndFetchChannelIdByNameFromInFilter(rctx request.CTX, channelName, userID, teamID string, includeDeleted bool) (*model.Channel, error) {
	cleanChannelName := strings.TrimLeft(channelName, "~")
	if strings.HasPrefix(cleanChannelName, "@") && strings.Contains(cleanChannelName, ",") {
		var userIDs []string
		users, err := a.GetUsersByUsernames(strings.Split(cleanChannelName[1:], ","), false, nil)
		if err != nil {
			return nil, err
		}
		for _, user := range users {
			userIDs = append(userIDs, user.Id)
		}
		channel, err := a.GetGroupChannel(rctx, userIDs)
		if err != nil {
			return nil, err
		}
		return channel, nil
	}
	if strings.HasPrefix(cleanChannelName, "@") && !strings.Contains(cleanChannelName, ",") {
		user, err := a.GetUserByUsername(cleanChannelName[1:])
		if err != nil {
			return nil, err
		}
		channel, err := a.GetOrCreateDirectChannel(rctx, userID, user.Id)
		if err != nil {
			return nil, err
		}
		return channel, nil
	}
	channel, err := a.GetChannelByName(rctx, cleanChannelName, teamID, includeDeleted)
	if err != nil {
		return nil, err
	}
	return channel, nil
}
func (a *App) searchPostsInTeam(teamID string, userID string, paramsList []*model.SearchParams, modifierFun func(*model.SearchParams)) (*model.PostList, *model.AppError) {
	var wg sync.WaitGroup
	pchan := make(chan store.StoreResult[*model.PostList], len(paramsList))
	for _, params := range paramsList {
		if params.Terms == "*" {
			continue
		}
		modifierFun(params)
		wg.Add(1)
		go func(params *model.SearchParams) {
			defer wg.Done()
			postList, err := a.Srv().Store().Post().Search(teamID, userID, params)
			pchan <- store.StoreResult[*model.PostList]{Data: postList, NErr: err}
		}(params)
	}
	wg.Wait()
	close(pchan)
	posts := model.NewPostList()
	for result := range pchan {
		if result.NErr != nil {
			return nil, model.NewAppError("searchPostsInTeam", "app.post.search.app_error", nil, "", http.StatusInternalServerError).Wrap(result.NErr)
		}
		posts.Extend(result.Data)
	}
	posts.SortByCreateAt()
	if appErr := a.filterInaccessiblePosts(posts, filterPostOptions{assumeSortedCreatedAt: true}); appErr != nil {
		return nil, appErr
	}
	if appErr := a.filterBurnOnReadPosts(posts); appErr != nil {
		return nil, appErr
	}
	return posts, nil
}
func (a *App) convertChannelNamesToChannelIds(rctx request.CTX, channels []string, userID string, teamID string, includeDeletedChannels bool) []string {
	for idx, channelName := range channels {
		channel, err := a.parseAndFetchChannelIdByNameFromInFilter(rctx, channelName, userID, teamID, includeDeletedChannels)
		if err != nil {
			rctx.Logger().Warn("error getting channel id by name from in filter", mlog.Err(err))
			continue
		}
		channels[idx] = channel.Id
	}
	return channels
}
func (a *App) convertUserNameToUserIds(rctx request.CTX, usernames []string) []string {
	for idx, username := range usernames {
		user, err := a.GetUserByUsername(strings.TrimLeft(username, "@"))
		if err != nil {
			rctx.Logger().Warn("error getting user by username", mlog.String("user_name", username), mlog.Err(err))
			continue
		}
		usernames[idx] = user.Id
	}
	return usernames
}
func (a *App) GetLastAccessiblePostTime() (int64, *model.AppError) {
	license := a.Srv().License()
	if license == nil || license.Limits == nil || license.Limits.PostHistory == 0 {
		return 0, nil
	}
	system, err := a.Srv().Store().System().GetByName(model.SystemLastAccessiblePostTime)
	if err != nil {
		var nfErr *store.ErrNotFound
		switch {
		case errors.As(err, &nfErr):
			return 0, nil
		default:
			return 0, model.NewAppError("GetLastAccessiblePostTime", "app.system.get_by_name.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	lastAccessiblePostTime, err := strconv.ParseInt(system.Value, 10, 64)
	if err != nil {
		return 0, model.NewAppError("GetLastAccessiblePostTime", "common.parse_error_int64", map[string]any{"Value": system.Value}, "", http.StatusInternalServerError).Wrap(err)
	}
	return lastAccessiblePostTime, nil
}
func (a *App) ComputeLastAccessiblePostTime() error {
	limit := a.GetPostHistoryLimit()
	if limit == 0 {
		systemValue, err := a.Srv().Store().System().GetByName(model.SystemLastAccessiblePostTime)
		if err != nil {
			var nfErr *store.ErrNotFound
			switch {
			case errors.As(err, &nfErr):
				return nil
			default:
				return model.NewAppError("ComputeLastAccessiblePostTime", "app.system.get_by_name.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
		}
		if systemValue != nil {
			if _, err = a.Srv().Store().System().PermanentDeleteByName(model.SystemLastAccessiblePostTime); err != nil {
				return model.NewAppError("ComputeLastAccessiblePostTime", "app.system.permanent_delete_by_name.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
		}
		return nil
	}
	createdAt, err := a.Srv().GetStore().Post().GetNthRecentPostTime(limit)
	if err != nil {
		var nfErr *store.ErrNotFound
		if !errors.As(err, &nfErr) {
			return model.NewAppError("ComputeLastAccessiblePostTime", "app.last_accessible_post.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	err = a.Srv().Store().System().SaveOrUpdate(&model.System{
		Name:  model.SystemLastAccessiblePostTime,
		Value: strconv.FormatInt(createdAt, 10),
	})
	if err != nil {
		return model.NewAppError("ComputeLastAccessiblePostTime", "app.system.save.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return nil
}
func (a *App) SearchPostsInTeam(teamID string, paramsList []*model.SearchParams) (*model.PostList, *model.AppError) {
	if !*a.Config().ServiceSettings.EnablePostSearch {
		return nil, model.NewAppError("SearchPostsInTeam", "store.sql_post.search.disabled", nil, fmt.Sprintf("teamId=%v", teamID), http.StatusNotImplemented)
	}
	return a.searchPostsInTeam(teamID, "", paramsList, func(params *model.SearchParams) {
		params.SearchWithoutUserId = true
	})
}
func (a *App) SearchPostsForUser(rctx request.CTX, terms string, userID string, teamID string, isOrSearch bool, includeDeletedChannels bool, timeZoneOffset int, page, perPage int) (*model.PostSearchResults, bool, *model.AppError) {
	var postSearchResults *model.PostSearchResults
	paramsList := model.ParseSearchParams(strings.TrimSpace(terms), timeZoneOffset)
	if !*a.Config().ServiceSettings.EnablePostSearch {
		return nil, false, model.NewAppError("SearchPostsForUser", "store.sql_post.search.disabled", nil, fmt.Sprintf("teamId=%v userId=%v", teamID, userID), http.StatusNotImplemented)
	}
	finalParamsList := []*model.SearchParams{}
	for _, params := range paramsList {
		params.OrTerms = isOrSearch
		params.IncludeDeletedChannels = includeDeletedChannels
		if params.Terms != "*" {
			params.InChannels = a.convertChannelNamesToChannelIds(rctx, params.InChannels, userID, teamID, includeDeletedChannels)
			params.ExcludedChannels = a.convertChannelNamesToChannelIds(rctx, params.ExcludedChannels, userID, teamID, includeDeletedChannels)
			params.FromUsers = a.convertUserNameToUserIds(rctx, params.FromUsers)
			params.ExcludedUsers = a.convertUserNameToUserIds(rctx, params.ExcludedUsers)
			finalParamsList = append(finalParamsList, params)
		}
	}
	if len(finalParamsList) == 0 {
		return model.MakePostSearchResults(model.NewPostList(), nil), true, nil
	}
	postSearchResults, err := a.Srv().Store().Post().SearchPostsForUser(rctx, finalParamsList, userID, teamID, page, perPage)
	if err != nil {
		var appErr *model.AppError
		switch {
		case errors.As(err, &appErr):
			return nil, false, appErr
		default:
			return nil, false, model.NewAppError("SearchPostsForUser", "app.post.search.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	if appErr := a.filterInaccessiblePosts(postSearchResults.PostList, filterPostOptions{assumeSortedCreatedAt: true}); appErr != nil {
		return nil, false, appErr
	}
	allPostHaveMembership, appErr := a.FilterPostsByChannelPermissions(rctx, postSearchResults.PostList, userID)
	if appErr != nil {
		return nil, false, appErr
	}
	if appErr := a.filterBurnOnReadPosts(postSearchResults.PostList); appErr != nil {
		return nil, false, appErr
	}
	return postSearchResults, allPostHaveMembership, nil
}
func (a *App) FilterPostsByChannelPermissions(rctx request.CTX, postList *model.PostList, userID string) (bool, *model.AppError) {
	if postList == nil || postList.Posts == nil || len(postList.Posts) == 0 {
		return true, nil
	}
	channels := make(map[string]*model.Channel)
	for _, post := range postList.Posts {
		if post.ChannelId != "" {
			channels[post.ChannelId] = nil
		}
	}
	if len(channels) > 0 {
		channelIDs := slices.Collect(maps.Keys(channels))
		channelList, err := a.GetChannels(rctx, channelIDs)
		if err != nil && err.StatusCode != http.StatusNotFound {
			return false, err
		}
		for _, channel := range channelList {
			channels[channel.Id] = channel
		}
	}
	channelReadPermission := make(map[string]bool)
	filteredPosts := make(map[string]*model.Post)
	filteredOrder := []string{}
	allPostHaveMembership := true
	for _, postID := range postList.Order {
		post, ok := postList.Posts[postID]
		if !ok {
			continue
		}
		if _, ok := channelReadPermission[post.ChannelId]; !ok {
			channel := channels[post.ChannelId]
			allowed := false
			isMember := true
			if channel != nil {
				allowed, isMember = a.HasPermissionToReadChannel(rctx, userID, channel)
			}
			channelReadPermission[post.ChannelId] = allowed
			if allowed {
				allPostHaveMembership = allPostHaveMembership && isMember
			}
		}
		if channelReadPermission[post.ChannelId] {
			filteredPosts[postID] = post
			filteredOrder = append(filteredOrder, postID)
		}
	}
	postList.Posts = filteredPosts
	postList.Order = filteredOrder
	return allPostHaveMembership, nil
}
func (a *App) GetFileInfosForPostWithMigration(rctx request.CTX, postID string, includeDeleted bool) ([]*model.FileInfo, *model.AppError) {
	pchan := make(chan store.StoreResult[*model.Post], 1)
	go func() {
		post, err := a.Srv().Store().Post().GetSingle(rctx, postID, includeDeleted)
		pchan <- store.StoreResult[*model.Post]{Data: post, NErr: err}
		close(pchan)
	}()
	infos, firstInaccessibleFileTime, err := a.GetFileInfosForPost(rctx, postID, false, includeDeleted)
	if err != nil {
		return nil, err
	}
	if len(infos) == 0 && firstInaccessibleFileTime == 0 {
		result := <-pchan
		if result.NErr != nil {
			var nfErr *store.ErrNotFound
			switch {
			case errors.As(result.NErr, &nfErr):
				return nil, model.NewAppError("GetFileInfosForPostWithMigration", "app.post.get.app_error", nil, "", http.StatusNotFound).Wrap(result.NErr)
			default:
				return nil, model.NewAppError("GetFileInfosForPostWithMigration", "app.post.get.app_error", nil, "", http.StatusInternalServerError).Wrap(result.NErr)
			}
		}
		post := result.Data
		if len(post.Filenames) > 0 {
			a.Srv().Store().FileInfo().InvalidateFileInfosForPostCache(postID, false)
			a.Srv().Store().FileInfo().InvalidateFileInfosForPostCache(postID, true)
			infos = a.MigrateFilenamesToFileInfos(rctx, post)
		}
	}
	return infos, nil
}
func (a *App) GetFileInfosForPost(rctx request.CTX, postID string, fromMaster bool, includeDeleted bool) ([]*model.FileInfo, int64, *model.AppError) {
	fileInfos, err := a.Srv().Store().FileInfo().GetForPost(postID, fromMaster, includeDeleted, true)
	if err != nil {
		return nil, 0, model.NewAppError("GetFileInfosForPost", "app.file_info.get_for_post.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	firstInaccessibleFileTime, appErr := a.removeInaccessibleContentFromFilesSlice(fileInfos)
	if appErr != nil {
		return nil, 0, appErr
	}
	a.generateMiniPreviewForInfos(rctx, fileInfos)
	return fileInfos, firstInaccessibleFileTime, nil
}
func (a *App) PostWithProxyAddedToImageURLs(post *model.Post) *model.Post {
	if f := a.ImageProxyAdder(); f != nil {
		return post.WithRewrittenImageURLs(f)
	}
	return post
}
func (a *App) PostWithProxyRemovedFromImageURLs(post *model.Post) *model.Post {
	if f := a.ImageProxyRemover(); f != nil {
		return post.WithRewrittenImageURLs(f)
	}
	return post
}
func (a *App) PostPatchWithProxyRemovedFromImageURLs(patch *model.PostPatch) *model.PostPatch {
	if f := a.ImageProxyRemover(); f != nil {
		return patch.WithRewrittenImageURLs(f)
	}
	return patch
}
func (a *App) ImageProxyAdder() func(string) string {
	if !*a.Config().ImageProxySettings.Enable {
		return nil
	}
	return func(url string) string {
		return a.ImageProxy().GetProxiedImageURL(url)
	}
}
func (a *App) ImageProxyRemover() (f func(string) string) {
	if !*a.Config().ImageProxySettings.Enable {
		return nil
	}
	return func(url string) string {
		return a.ImageProxy().GetUnproxiedImageURL(url)
	}
}
func (a *App) MaxPostSize() int {
	return a.Srv().Platform().MaxPostSize()
}
func (a *App) countThreadMentions(rctx request.CTX, user *model.User, post *model.Post, teamID string, timestamp int64) (int64, *model.AppError) {
	channel, err := a.GetChannel(rctx, post.ChannelId)
	if err != nil {
		return 0, err
	}
	keywords := MentionKeywords{}
	keywords.AddUser(
		user,
		map[string]string{},
		&model.Status{Status: model.StatusOnline},
		true,
	)
	posts, nErr := a.Srv().Store().Post().GetPostsByThread(post.Id, timestamp)
	if nErr != nil {
		return 0, model.NewAppError("countThreadMentions", "app.channel.count_posts_since.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
	}
	count := 0
	if channel.Type == model.ChannelTypeDirect || channel.Type == model.ChannelTypeGroup {
		otherId := channel.GetOtherUserIdForDM(user.Id)
		for _, p := range posts {
			if p.UserId == otherId {
				count++
			}
		}
		return int64(count), nil
	}
	var team *model.Team
	if teamID != "" {
		team, err = a.GetTeam(teamID)
		if err != nil {
			return 0, err
		}
	}
	groups, nErr := a.getGroupsAllowedForReferenceInChannel(channel, team)
	if nErr != nil {
		return 0, model.NewAppError("countThreadMentions", "app.channel.count_posts_since.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
	}
	keywords.AddGroupsMap(groups)
	for _, p := range posts {
		if p.CreateAt >= timestamp {
			mentions := getExplicitMentions(p, keywords)
			if _, ok := mentions.Mentions[user.Id]; ok {
				count += 1
			}
		}
	}
	return int64(count), nil
}
func (a *App) countMentionsFromPost(rctx request.CTX, user *model.User, post *model.Post) (int, int, int, *model.AppError) {
	channel, appErr := a.GetChannel(rctx, post.ChannelId)
	if appErr != nil {
		return 0, 0, 0, appErr
	}
	if channel.Type == model.ChannelTypeDirect || channel.Type == model.ChannelTypeGroup {
		count, countRoot, nErr := a.Srv().Store().Channel().CountPostsAfter(post.ChannelId, post.CreateAt-1, user.Id)
		if nErr != nil {
			return 0, 0, 0, model.NewAppError("countMentionsFromPost", "app.channel.count_posts_since.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
		}
		var urgentCount int
		if a.IsPostPriorityEnabled() {
			urgentCount, nErr = a.Srv().Store().Channel().CountUrgentPostsAfter(post.ChannelId, post.CreateAt-1, user.Id)
			if nErr != nil {
				return 0, 0, 0, model.NewAppError("countMentionsFromPost", "app.channel.count_urgent_posts_since.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
			}
		}
		return count, countRoot, urgentCount, nil
	}
	members, err := a.Srv().Store().Channel().GetAllChannelMembersNotifyPropsForChannel(channel.Id, true)
	if err != nil {
		return 0, 0, 0, model.NewAppError("countMentionsFromPost", "app.channel.count_posts_since.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	keywords := MentionKeywords{}
	keywords.AddUser(
		user,
		members[user.Id],
		&model.Status{Status: model.StatusOnline},
		true,
	)
	commentMentions := user.NotifyProps[model.CommentsNotifyProp]
	checkForCommentMentions := commentMentions == model.CommentsNotifyRoot || commentMentions == model.CommentsNotifyAny
	mentionedByThread := make(map[string]bool)
	thread, appErr := a.GetPostThread(rctx, post.Id, model.GetPostsOptions{}, user.Id)
	if appErr != nil {
		return 0, 0, 0, appErr
	}
	count := 0
	countRoot := 0
	urgentCount := 0
	if isPostMention(user, post, keywords, thread.Posts, mentionedByThread, checkForCommentMentions) {
		count += 1
		if post.RootId == "" {
			countRoot += 1
			if a.IsPostPriorityEnabled() {
				priority, err := a.GetPriorityForPost(post.Id)
				if err != nil {
					return 0, 0, 0, err
				}
				if priority != nil && *priority.Priority == model.PostPriorityUrgent {
					urgentCount += 1
				}
			}
		}
	}
	page := 0
	perPage := 200
	for {
		postList, err := a.GetPostsAfterPost(rctx, model.GetPostsOptions{
			ChannelId: post.ChannelId,
			PostId:    post.Id,
			Page:      page,
			PerPage:   perPage,
			UserId:    rctx.Session().UserId,
		})
		if err != nil {
			return 0, 0, 0, err
		}
		mentionPostIds := make([]string, 0)
		for _, postID := range postList.Order {
			if isPostMention(user, postList.Posts[postID], keywords, postList.Posts, mentionedByThread, checkForCommentMentions) {
				count += 1
				if postList.Posts[postID].RootId == "" {
					mentionPostIds = append(mentionPostIds, postID)
					countRoot += 1
				}
			}
		}
		if a.IsPostPriorityEnabled() {
			priorityList, nErr := a.Srv().Store().PostPriority().GetForPosts(mentionPostIds)
			if nErr != nil {
				return 0, 0, 0, model.NewAppError("countMentionsFromPost", "app.channel.get_priority_for_posts.app_error", nil, "", http.StatusInternalServerError).Wrap(nErr)
			}
			for _, priority := range priorityList {
				if *priority.Priority == model.PostPriorityUrgent {
					urgentCount += 1
				}
			}
		}
		if len(postList.Order) < perPage {
			break
		}
		page += 1
	}
	return count, countRoot, urgentCount, nil
}
func isCommentMention(user *model.User, post *model.Post, otherPosts map[string]*model.Post, mentionedByThread map[string]bool) bool {
	if post.RootId == "" {
		return false
	}
	if mentioned, ok := mentionedByThread[post.RootId]; ok {
		return mentioned
	}
	if _, ok := otherPosts[post.RootId]; !ok {
		mlog.Warn("Can't determine the comment mentions as the rootPost is past the cloud plan's limit", mlog.String("rootPostID", post.RootId), mlog.String("commentID", post.Id))
		return false
	}
	mentioned := otherPosts[post.RootId].UserId == user.Id
	if !mentioned && user.NotifyProps[model.CommentsNotifyProp] == model.CommentsNotifyAny {
		for _, otherPost := range otherPosts {
			if otherPost.Id == post.Id {
				continue
			}
			if otherPost.RootId != post.RootId {
				continue
			}
			if otherPost.UserId == user.Id && otherPost.CreateAt < post.CreateAt {
				mentioned = true
				break
			}
		}
	}
	mentionedByThread[post.RootId] = mentioned
	return mentioned
}
func isPostMention(user *model.User, post *model.Post, keywords MentionKeywords, otherPosts map[string]*model.Post, mentionedByThread map[string]bool, checkForCommentMentions bool) bool {
	if post.UserId == user.Id && post.GetProp(model.PostPropsFromWebhook) != "true" {
		return false
	}
	mentions := getExplicitMentions(post, keywords)
	if _, ok := mentions.Mentions[user.Id]; ok {
		return true
	}
	if post.Type == model.PostTypeAddToChannel {
		if addedUserId, ok := post.GetProp(model.PostPropsAddedUserId).(string); ok && addedUserId == user.Id {
			return true
		}
	}
	if checkForCommentMentions && isCommentMention(user, post, otherPosts, mentionedByThread) {
		return true
	}
	return false
}
func (a *App) GetThreadMembershipsForUser(userID, teamID string) ([]*model.ThreadMembership, error) {
	return a.Srv().Store().Thread().GetMembershipsForUser(userID, teamID)
}
func (a *App) GetPostIfAuthorized(rctx request.CTX, postID string, session *model.Session, includeDeleted bool) (*model.Post, *model.AppError, bool) {
	post, err := a.GetSinglePost(rctx, postID, includeDeleted)
	if err != nil {
		return nil, err, false
	}
	channel, err := a.GetChannel(rctx, post.ChannelId)
	if err != nil {
		return nil, err, false
	}
	ok, isMember := a.SessionHasPermissionToReadChannel(rctx, *session, channel)
	if !ok {
		if channel.Type == model.ChannelTypeOpen && !*a.Config().ComplianceSettings.Enable {
			if !a.SessionHasPermissionToTeam(*session, channel.TeamId, model.PermissionReadPublicChannel) {
				return nil, model.MakePermissionError(session, []*model.Permission{model.PermissionReadPublicChannel}), false
			}
		} else {
			return nil, model.MakePermissionError(session, []*model.Permission{model.PermissionReadChannelContent}), false
		}
	}
	return post, nil, isMember
}
func (a *App) GetPostsByIds(postIDs []string) ([]*model.Post, int64, *model.AppError) {
	posts, err := a.Srv().Store().Post().GetPostsByIds(postIDs)
	if err != nil {
		var nfErr *store.ErrNotFound
		switch {
		case errors.As(err, &nfErr):
			return nil, 0, model.NewAppError("GetPostsByIds", "app.post.get.app_error", nil, "", http.StatusNotFound).Wrap(err)
		default:
			return nil, 0, model.NewAppError("GetPostsByIds", "app.post.get.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	posts, firstInaccessiblePostTime, appErr := a.getFilteredAccessiblePosts(posts, filterPostOptions{assumeSortedCreatedAt: true})
	if appErr != nil {
		return nil, 0, appErr
	}
	return posts, firstInaccessiblePostTime, nil
}
func (a *App) GetEditHistoryForPost(postID string) ([]*model.Post, *model.AppError) {
	posts, err := a.Srv().Store().Post().GetEditHistoryForPost(postID)
	if err != nil {
		var nfErr *store.ErrNotFound
		switch {
		case errors.As(err, &nfErr):
			return nil, model.NewAppError("GetEditHistoryForPost", "app.post.get.app_error", nil, "", http.StatusNotFound).Wrap(err)
		default:
			return nil, model.NewAppError("GetEditHistoryForPost", "app.post.get.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	if appErr := a.populateEditHistoryFileMetadata(posts); appErr != nil {
		return nil, appErr
	}
	return posts, nil
}
func (a *App) populateEditHistoryFileMetadata(editHistoryPosts []*model.Post) *model.AppError {
	for _, post := range editHistoryPosts {
		fileInfos, err := a.Srv().Store().FileInfo().GetByIds(post.FileIds, true, true)
		if err != nil {
			return model.NewAppError("app.populateEditHistoryFileMetadata", "app.file_info.get_by_ids.app_error", map[string]any{"post_id": post.Id}, "", http.StatusInternalServerError).Wrap(err)
		}
		if post.Metadata == nil {
			post.Metadata = &model.PostMetadata{}
		}
		post.Metadata.Files = fileInfos
	}
	return nil
}
func (a *App) SetPostReminder(rctx request.CTX, postID, userID string, targetTime int64) *model.AppError {
	reminder := &model.PostReminder{
		PostId:     postID,
		UserId:     userID,
		TargetTime: targetTime,
	}
	err := a.Srv().Store().Post().SetPostReminder(reminder)
	if err != nil {
		return model.NewAppError("SetPostReminder", model.NoTranslation, nil, "", http.StatusInternalServerError).Wrap(err)
	}
	metadata, err := a.Srv().Store().Post().GetPostReminderMetadata(postID)
	if err != nil {
		return model.NewAppError("SetPostReminder", model.NoTranslation, nil, "", http.StatusInternalServerError).Wrap(err)
	}
	parsedTime := time.Unix(targetTime, 0).UTC().Format(time.RFC822)
	siteURL := *a.Config().ServiceSettings.SiteURL
	var permalink string
	if metadata.TeamName == "" {
		permalink = fmt.Sprintf("%s/pl/%s", siteURL, postID)
	} else {
		permalink = fmt.Sprintf("%s/%s/pl/%s", siteURL, metadata.TeamName, postID)
	}
	ephemeralPost := &model.Post{
		Type:      model.PostTypeEphemeral,
		Id:        model.NewId(),
		CreateAt:  model.GetMillis(),
		UserId:    userID,
		RootId:    postID,
		ChannelId: metadata.ChannelID,
		Message: fmt.Sprintf("You will be reminded about %s by @%s at %s", permalink, metadata.Username, parsedTime),
		Props: model.StringInterface{
			"target_time": targetTime,
			"team_name":   metadata.TeamName,
			"post_id":     postID,
			"username":    metadata.Username,
			"type":        model.PostTypeReminder,
		},
	}
	message := model.NewWebSocketEvent(model.WebsocketEventEphemeralMessage, "", ephemeralPost.ChannelId, userID, nil, "")
	ephemeralPost = a.PreparePostForClientWithEmbedsAndImages(rctx, ephemeralPost, &model.PreparePostForClientOpts{IsNewPost: true, IncludePriority: true})
	ephemeralPost = model.AddPostActionCookies(ephemeralPost, a.PostActionCookieSecret())
	postJSON, jsonErr := ephemeralPost.ToJSON()
	if jsonErr != nil {
		rctx.Logger().Warn("Failed to encode post to JSON", mlog.Err(jsonErr))
	}
	message.Add("post", postJSON)
	a.Publish(message)
	return nil
}
func (a *App) CheckPostReminders(rctx request.CTX) {
	rctx = rctx.WithLogFields(mlog.String("component", "post_reminders"))
	systemBot, appErr := a.GetSystemBot(rctx)
	if appErr != nil {
		rctx.Logger().Error("Failed to get system bot", mlog.Err(appErr))
		return
	}
	reminders, err := a.Srv().Store().Post().GetPostReminders(time.Now().UTC().Unix())
	if err != nil {
		rctx.Logger().Error("Failed to get post reminders", mlog.Err(err))
		return
	}
	groupedReminders := make(map[string][]string)
	for _, r := range reminders {
		if groupedReminders[r.UserId] == nil {
			groupedReminders[r.UserId] = []string{r.PostId}
		} else {
			groupedReminders[r.UserId] = append(groupedReminders[r.UserId], r.PostId)
		}
	}
	siteURL := *a.Config().ServiceSettings.SiteURL
	for userID, postIDs := range groupedReminders {
		ch, appErr := a.GetOrCreateDirectChannel(request.EmptyContext(a.Log()), userID, systemBot.UserId)
		if appErr != nil {
			rctx.Logger().Error("Failed to get direct channel", mlog.Err(appErr))
			return
		}
		for _, postID := range postIDs {
			metadata, err := a.Srv().Store().Post().GetPostReminderMetadata(postID)
			if err != nil {
				rctx.Logger().Error("Failed to get post reminder metadata", mlog.Err(err), mlog.String("post_id", postID))
				continue
			}
			T := i18n.GetUserTranslations(metadata.UserLocale)
			dm := &model.Post{
				ChannelId: ch.Id,
				Message: T("app.post_reminder_dm", model.StringInterface{
					"SiteURL":  siteURL,
					"TeamName": metadata.TeamName,
					"PostId":   postID,
					"Username": metadata.Username,
				}),
				Type:   model.PostTypeReminder,
				UserId: systemBot.UserId,
				Props: model.StringInterface{
					"team_name": metadata.TeamName,
					"post_id":   postID,
					"username":  metadata.Username,
				},
			}
			if _, _, err := a.CreatePost(request.EmptyContext(a.Log()), dm, ch, model.CreatePostFlags{SetOnline: true}); err != nil {
				rctx.Logger().Error("Failed to post reminder message", mlog.Err(err))
			}
		}
	}
}
func (a *App) GetPostInfo(rctx request.CTX, postID string, channel *model.Channel, team *model.Team, userID string, hasJoinedChannel bool) (*model.PostInfo, *model.AppError) {
	info := model.PostInfo{
		ChannelId:          channel.Id,
		ChannelType:        channel.Type,
		ChannelDisplayName: channel.DisplayName,
		HasJoinedChannel:   hasJoinedChannel,
	}
	if team != nil {
		teamMember, teamMemberErr := a.GetTeamMember(rctx, team.Id, userID)
		teamType := model.TeamInvite
		if team.AllowOpenInvite {
			teamType = model.TeamOpen
		}
		info.TeamId = team.Id
		info.TeamType = teamType
		info.TeamDisplayName = team.DisplayName
		info.HasJoinedTeam = teamMemberErr == nil && teamMember.DeleteAt == 0
	}
	return &info, nil
}
func (a *App) applyPostsWillBeConsumedHook(posts map[string]*model.Post) {
	if !a.Config().FeatureFlags.ConsumePostHook {
		return
	}
	postsSlice := make([]*model.Post, 0, len(posts))
	for _, post := range posts {
		postsSlice = append(postsSlice, post.ForPlugin())
	}
	a.ch.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
		postReplacements := hooks.MessagesWillBeConsumed(postsSlice)
		for _, postReplacement := range postReplacements {
			posts[postReplacement.Id] = postReplacement
		}
		return true
	}, plugin.MessagesWillBeConsumedID)
}
func (a *App) applyPostWillBeConsumedHook(post **model.Post) {
	if !a.Config().FeatureFlags.ConsumePostHook || (*post).Type == model.PostTypeBurnOnRead {
		return
	}
	ps := []*model.Post{*post}
	a.ch.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
		rp := hooks.MessagesWillBeConsumed(ps)
		if len(rp) > 0 {
			(*post) = rp[0]
		}
		return true
	}, plugin.MessagesWillBeConsumedID)
}
func makePostLink(siteURL, teamName, postID string) string {
	return fmt.Sprintf("%s/%s/pl/%s", siteURL, teamName, postID)
}
func (a *App) ValidateMoveOrCopy(rctx request.CTX, wpl *model.WranglerPostList, originalChannel *model.Channel, targetChannel *model.Channel, user *model.User) error {
	if wpl.NumPosts() == 0 {
		return errors.New("The wrangler post list contains no posts")
	}
	config := a.Config().WranglerSettings
	switch originalChannel.Type {
	case model.ChannelTypePrivate:
		if !*config.MoveThreadFromPrivateChannelEnable {
			return errors.New("Wrangler is currently configured to not allow moving posts from private channels")
		}
	case model.ChannelTypeDirect:
		if !*config.MoveThreadFromDirectMessageChannelEnable {
			return errors.New("Wrangler is currently configured to not allow moving posts from direct message channels")
		}
	case model.ChannelTypeGroup:
		if !*config.MoveThreadFromGroupMessageChannelEnable {
			return errors.New("Wrangler is currently configured to not allow moving posts from group message channels")
		}
	}
	if !originalChannel.IsGroupOrDirect() && !targetChannel.IsGroupOrDirect() {
		if !*config.MoveThreadToAnotherTeamEnable && targetChannel.TeamId != originalChannel.TeamId {
			return errors.New("Wrangler is currently configured to not allow moving messages to different teams")
		}
	}
	if *config.MoveThreadMaxCount != int64(0) && *config.MoveThreadMaxCount < int64(wpl.NumPosts()) {
		return fmt.Errorf("the thread is %d posts long, but this command is configured to only move threads of up to %d posts", wpl.NumPosts(), *config.MoveThreadMaxCount)
	}
	_, appErr := a.GetChannelMember(rctx, targetChannel.Id, user.Id)
	if appErr != nil {
		return fmt.Errorf("channel with ID %s doesn't exist or you are not a member", targetChannel.Id)
	}
	_, appErr = a.GetChannelMember(rctx, originalChannel.Id, user.Id)
	if appErr != nil {
		return fmt.Errorf("channel with ID %s doesn't exist or you are not a member", originalChannel.Id)
	}
	return nil
}
func (a *App) CopyWranglerPostlist(rctx request.CTX, wpl *model.WranglerPostList, targetChannel *model.Channel) (*model.Post, bool, *model.AppError) {
	var appErr *model.AppError
	var newRootPost *model.Post
	if wpl.ContainsFileAttachments() {
		rctx.Logger().Info("Wrangler is re-uploading file attachments",
			mlog.String("file_count", fmt.Sprintf("%d", wpl.FileAttachmentCount)),
		)
		for _, post := range wpl.Posts {
			var newFileIDs []string
			var fileBytes []byte
			var oldFileInfo, newFileInfo *model.FileInfo
			for _, fileID := range post.FileIds {
				oldFileInfo, appErr = a.GetFileInfo(rctx, fileID)
				if appErr != nil {
					return nil, false, appErr
				}
				fileBytes, appErr = a.GetFile(rctx, fileID)
				if appErr != nil {
					return nil, false, appErr
				}
				newFileInfo, appErr = a.UploadFile(rctx, fileBytes, targetChannel.Id, oldFileInfo.Name)
				if appErr != nil {
					return nil, false, appErr
				}
				newFileIDs = append(newFileIDs, newFileInfo.Id)
			}
			post.FileIds = newFileIDs
		}
	}
	var isMemberForPreviews bool
	for i, post := range wpl.Posts {
		var reactions []*model.Reaction
		reactions, appErr = a.GetReactionsForPost(post.Id)
		if appErr != nil {
			rctx.Logger().Error("Failed to get reactions on original post")
		}
		newPost := post.Clone()
		newPost = newPost.CleanPost()
		newPost.ChannelId = targetChannel.Id
		if i == 0 {
			newPost, isMemberForPreviews, appErr = a.CreatePost(rctx, newPost, targetChannel, model.CreatePostFlags{})
			if appErr != nil {
				return nil, false, appErr
			}
			newRootPost = newPost.Clone()
		} else {
			newPost.RootId = newRootPost.Id
			newPost, _, appErr = a.CreatePost(rctx, newPost, targetChannel, model.CreatePostFlags{})
			if appErr != nil {
				return nil, false, appErr
			}
		}
		for _, reaction := range reactions {
			reaction.PostId = newPost.Id
			_, appErr = a.SaveReactionForPost(rctx, reaction)
			if appErr != nil {
				rctx.Logger().Error("Failed to reapply reactions to post")
			}
		}
	}
	return newRootPost, isMemberForPreviews, nil
}
func (a *App) MoveThread(rctx request.CTX, postID string, sourceChannelID, channelID string, user *model.User) *model.AppError {
	postListResponse, appErr := a.GetPostThread(rctx, postID, model.GetPostsOptions{}, user.Id)
	if appErr != nil {
		return model.NewAppError("getPostThread", "app.post.move_thread_command.error", nil, "postID="+postID+", "+"UserId="+user.Id+"", http.StatusBadRequest).Wrap(appErr)
	}
	wpl := postListResponse.BuildWranglerPostList()
	originalChannel, appErr := a.GetChannel(rctx, sourceChannelID)
	if appErr != nil {
		return appErr
	}
	targetChannel, appErr := a.GetChannel(rctx, channelID)
	if appErr != nil {
		return appErr
	}
	err := a.ValidateMoveOrCopy(rctx, wpl, originalChannel, targetChannel, user)
	if err != nil {
		return model.NewAppError("validateMoveOrCopy", "app.post.move_thread_command.error", nil, "", http.StatusBadRequest).Wrap(err)
	}
	var targetTeam *model.Team
	if targetChannel.IsGroupOrDirect() {
		if !originalChannel.IsGroupOrDirect() {
			targetTeam, appErr = a.GetTeam(originalChannel.TeamId)
		}
	} else {
		targetTeam, appErr = a.GetTeam(targetChannel.TeamId)
	}
	if appErr != nil {
		return appErr
	}
	if targetTeam == nil {
		return model.NewAppError("validateMoveOrCopy", "app.post.move_thread_command.error", nil, "target team is nil", http.StatusBadRequest)
	}
	rctx.Logger().Info("Wrangler is moving a thread", mlog.String("user_id", user.Id), mlog.String("original_post_id", wpl.RootPost().Id), mlog.String("original_channel_id", originalChannel.Id))
	newRootPost, _, appErr := a.CopyWranglerPostlist(rctx, wpl, targetChannel)
	if appErr != nil {
		return appErr
	}
	T, err := i18n.GetTranslationsBySystemLocale()
	if err != nil {
		return model.NewAppError("MoveThread", "app.post.move_thread_command.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	ephemeralPostProps := model.StringInterface{
		"TranslationID": "app.post.move_thread.from_another_channel",
	}
	_, _, appErr = a.CreatePost(rctx, &model.Post{
		UserId:    user.Id,
		Type:      model.PostTypeWrangler,
		RootId:    newRootPost.Id,
		ChannelId: channelID,
		Message:   T("app.post.move_thread.from_another_channel"),
		Props:     ephemeralPostProps,
	}, targetChannel, model.CreatePostFlags{})
	if appErr != nil {
		return appErr
	}
	_, appErr = a.DeletePost(rctx, wpl.RootPost().Id, user.Id)
	if appErr != nil {
		return appErr
	}
	rctx.Logger().Info("Wrangler thread move complete", mlog.String("user_id", user.Id), mlog.String("new_post_id", newRootPost.Id), mlog.String("channel_id", channelID))
	ephemeralPostProps = model.StringInterface{}
	msg := T("app.post.move_thread_command.direct_or_group.multiple_messages", model.StringInterface{"NumMessages": wpl.NumPosts()})
	ephemeralPostProps["TranslationID"] = "app.post.move_thread_command.direct_or_group.multiple_messages"
	if wpl.NumPosts() == 1 {
		msg = T("app.post.move_thread_command.direct_or_group.one_message")
		ephemeralPostProps["TranslationID"] = "app.post.move_thread_command.direct_or_group.one_message"
	}
	if targetChannel.TeamId != "" {
		targetTeam, teamErr := a.GetTeam(targetChannel.TeamId)
		if teamErr != nil {
			return teamErr
		}
		targetName := targetTeam.Name
		newPostLink := makePostLink(*a.Config().ServiceSettings.SiteURL, targetName, newRootPost.Id)
		msg = T("app.post.move_thread_command.channel.multiple_messages", model.StringInterface{"NumMessages": wpl.NumPosts(), "Link": newPostLink})
		ephemeralPostProps["TranslationID"] = "app.post.move_thread_command.channel.multiple_messages"
		if wpl.NumPosts() == 1 {
			msg = T("app.post.move_thread_command.channel.one_message", model.StringInterface{"Link": newPostLink})
			ephemeralPostProps["TranslationID"] = "app.post.move_thread_command.channel.one_message"
		}
		ephemeralPostProps["MovedThreadPermalink"] = newPostLink
	}
	ephemeralPostProps["NumMessages"] = wpl.NumPosts()
	_, _, appErr = a.CreatePost(rctx, &model.Post{
		UserId:    user.Id,
		Type:      model.PostTypeWrangler,
		ChannelId: originalChannel.Id,
		Message:   msg,
		Props:     ephemeralPostProps,
	}, originalChannel, model.CreatePostFlags{})
	if appErr != nil {
		return appErr
	}
	rctx.Logger().Info(msg)
	return nil
}
func (a *App) PermanentDeletePost(rctx request.CTX, postID, deleteByID string) *model.AppError {
	post, err := a.Srv().Store().Post().GetSingle(sqlstore.RequestContextWithMaster(rctx), postID, true)
	if err != nil {
		return model.NewAppError("DeletePost", "app.post.get.app_error", nil, "", http.StatusBadRequest).Wrap(err)
	}
	postHasFiles := len(post.FileIds) > 0
	if post.Type == model.PostTypeBurnOnRead {
		revealedPost, appErr := a.getBurnOnReadPost(rctx, post)
		if appErr != nil {
			rctx.Logger().Warn("Failed to get burn-on-read post", mlog.Err(appErr))
		}
		if revealedPost != nil {
			postHasFiles = len(revealedPost.FileIds) > 0
		}
	}
	if postHasFiles {
		appErr := a.PermanentDeleteFilesByPost(rctx, post.Id)
		if appErr != nil {
			return appErr
		}
	}
	err = a.Srv().Store().Post().PermanentDelete(rctx, post.Id)
	if err != nil {
		return model.NewAppError("PermanentDeletePost", "app.post.permanent_delete_post.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	appErr := a.CleanUpAfterPostDeletion(rctx, post, deleteByID)
	if appErr != nil {
		return appErr
	}
	return nil
}
func (a *App) CleanUpAfterPostDeletion(rctx request.CTX, post *model.Post, deleteByID string) *model.AppError {
	channel, appErr := a.GetChannel(rctx, post.ChannelId)
	if appErr != nil {
		return appErr
	}
	if post.RootId == "" {
		if appErr := a.DeletePersistentNotification(rctx, post); appErr != nil {
			return appErr
		}
	}
	postJSON, err := json.Marshal(post)
	if err != nil {
		return model.NewAppError("DeletePost", "api.marshal_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	userMessage := model.NewWebSocketEvent(model.WebsocketEventPostDeleted, "", post.ChannelId, "", nil, "")
	userMessage.Add("post", string(postJSON))
	userMessage.GetBroadcast().ContainsSanitizedData = true
	a.Publish(userMessage)
	adminMessage := model.NewWebSocketEvent(model.WebsocketEventPostDeleted, "", post.ChannelId, "", nil, "")
	adminMessage.Add("post", string(postJSON))
	adminMessage.Add("delete_by", deleteByID)
	adminMessage.GetBroadcast().ContainsSensitiveData = true
	a.Publish(adminMessage)
	a.Srv().Go(func() {
		a.deleteFlaggedPosts(rctx, post.Id)
	})
	pluginPost := post.ForPlugin()
	pluginContext := pluginContext(rctx)
	a.Srv().Go(func() {
		a.ch.RunMultiHook(func(hooks plugin.Hooks, _ *model.Manifest) bool {
			hooks.MessageHasBeenDeleted(pluginContext, pluginPost)
			return true
		}, plugin.MessageHasBeenDeletedID)
	})
	a.Srv().Go(func() {
		if err = a.RemoveNotifications(rctx, post, channel); err != nil {
			rctx.Logger().Error("DeletePost failed to delete notification", mlog.Err(err))
		}
	})
	a.Srv().Go(func() {
		a.deleteDraftsAssociatedWithPost(rctx, channel, post)
	})
	a.invalidateCacheForChannelPosts(post.ChannelId)
	if post.Type == model.PostTypeBurnOnRead {
		a.invalidateCacheForReadReceipts(post.Id)
		a.invalidateCacheForTemporaryPost(post.Id)
	}
	return nil
}
func (a *App) SendTestMessage(rctx request.CTX, userID string) (*model.Post, *model.AppError) {
	bot, err := a.GetSystemBot(rctx)
	if err != nil {
		return nil, model.NewAppError("SendTestMessage", "app.notifications.send_test_message.errors.no_bot", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	channel, err := a.GetOrCreateDirectChannel(rctx, userID, bot.UserId)
	if err != nil {
		return nil, model.NewAppError("SendTestMessage", "app.notifications.send_test_message.errors.no_channel", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	user, err := a.GetUser(userID)
	if err != nil {
		return nil, model.NewAppError("SendTestMessage", "app.notifications.send_test_message.errors.no_user", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	T := i18n.GetUserTranslations(user.Locale)
	post := &model.Post{
		ChannelId: channel.Id,
		Message:   T("app.notifications.send_test_message.message_body"),
		Type:      model.PostTypeDefault,
		UserId:    bot.UserId,
	}
	post, _, err = a.CreatePost(rctx, post, channel, model.CreatePostFlags{ForceNotification: true})
	if err != nil {
		return nil, model.NewAppError("SendTestMessage", "app.notifications.send_test_message.errors.create_post", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return post, nil
}
func (a *App) RewriteMessage(
	rctx request.CTX,
	agentID string,
	message string,
	action model.RewriteAction,
	customPrompt string,
	rootID string,
) (*model.RewriteResponse, *model.AppError) {
	var threadContext string
	if rootID != "" {
		context, appErr := a.buildThreadContextForRewrite(rctx, rootID)
		if appErr != nil {
			rctx.Logger().Warn("Failed to build thread context for rewrite", mlog.String("root_id", rootID), mlog.Err(appErr))
		} else {
			threadContext = context
		}
	}
	userPrompt := getRewritePromptForAction(action, message, customPrompt, threadContext)
	if userPrompt == "" {
		return nil, model.NewAppError("RewriteMessage", "app.post.rewrite.invalid_action", nil, fmt.Sprintf("invalid action: %s", action), 400)
	}
	userLocale := ""
	if session := rctx.Session(); session != nil && session.UserId != "" {
		user, appErr := a.GetUser(session.UserId)
		if appErr == nil {
			userLocale = user.Locale
		} else {
			rctx.Logger().Warn("Failed to get user for rewrite locale", mlog.Err(appErr), mlog.String("user_id", session.UserId))
		}
	}
	systemPrompt := buildRewriteSystemPrompt(userLocale)
	client := a.GetBridgeClient(rctx.Session().UserId)
	completionRequest := agentclient.CompletionRequest{
		Posts: []agentclient.Post{
			{Role: "system", Message: systemPrompt},
			{Role: "user", Message: userPrompt},
		},
		UserID:           rctx.Session().UserId,
		Operation:        "message_rewrite",
		OperationSubType: normalizeRewriteAction(action),
	}
	completion, err := client.AgentCompletion(agentID, completionRequest)
	if err != nil {
		return nil, model.NewAppError("RewriteMessage", "app.post.rewrite.agent_call_failed", nil, err.Error(), 500)
	}
	var response model.RewriteResponse
	if err := json.Unmarshal([]byte(completion), &response); err != nil {
		return nil, model.NewAppError("RewriteMessage", "app.post.rewrite.parse_response_failed", nil, err.Error(), 500)
	}
	if response.RewrittenText == "" {
		return nil, model.NewAppError("RewriteMessage", "app.post.rewrite.empty_response", nil, "", 500)
	}
	return &response, nil
}
func (a *App) buildThreadContextForRewrite(rctx request.CTX, rootID string) (string, *model.AppError) {
	const maxContextPosts = 10
	postList, appErr := a.GetPostThread(rctx, rootID, model.GetPostsOptions{}, rctx.Session().UserId)
	if appErr != nil {
		return "", appErr
	}
	if postList == nil || len(postList.Posts) == 0 {
		return "", nil
	}
	rootPost, ok := postList.Posts[rootID]
	if !ok {
		return "", nil
	}
	if strings.HasPrefix(rootPost.Type, model.PostSystemMessagePrefix) || rootPost.DeleteAt > 0 {
		return "", nil
	}
	var replies []*model.Post
	for _, postID := range postList.Order {
		if postID == rootID {
			continue
		}
		post, ok := postList.Posts[postID]
		if !ok {
			continue
		}
		if strings.HasPrefix(post.Type, model.PostSystemMessagePrefix) {
			continue
		}
		if post.DeleteAt > 0 {
			continue
		}
		replies = append(replies, post)
	}
	var contextReplies []*model.Post
	startIdx := 0
	if len(replies) > maxContextPosts {
		startIdx = len(replies) - maxContextPosts
	}
	contextReplies = replies[startIdx:]
	userIDs := []string{rootPost.UserId}
	for _, reply := range contextReplies {
		userIDs = append(userIDs, reply.UserId)
	}
	slices.Sort(userIDs)
	userIDs = slices.Compact(userIDs)
	users, appErr := a.GetUsersByIds(rctx, userIDs, &store.UserGetByIdsOpts{})
	if appErr != nil {
		return "", appErr
	}
	userMap := make(map[string]string, len(users))
	for _, user := range users {
		userMap[user.Id] = user.Username
	}
	var contextBuilder strings.Builder
	contextBuilder.WriteString("Thread context:\n")
	rootUsername := userMap[rootPost.UserId]
	if rootUsername == "" {
		rootUsername = "Unknown"
	}
	contextBuilder.WriteString(fmt.Sprintf("Root post (%s): %s\n", rootUsername, rootPost.Message))
	if len(contextReplies) > 0 {
		contextBuilder.WriteString("\nRecent replies:\n")
		for _, reply := range contextReplies {
			username := userMap[reply.UserId]
			if username == "" {
				username = "Unknown"
			}
			contextBuilder.WriteString(fmt.Sprintf("- %s: %s\n", username, reply.Message))
		}
	}
	return contextBuilder.String(), nil
}
func normalizeRewriteAction(action model.RewriteAction) string {
	switch action {
	case model.RewriteActionCustom,
		model.RewriteActionShorten,
		model.RewriteActionElaborate,
		model.RewriteActionImproveWriting,
		model.RewriteActionFixSpelling,
		model.RewriteActionSimplify,
		model.RewriteActionSummarize:
		return string(action)
	default:
		return "unknown"
	}
}
func getRewritePromptForAction(action model.RewriteAction, message string, customPrompt string, threadContext string) string {
	var actionPrompt string
	if message == "" {
		actionPrompt = fmt.Sprintf(`Write according to these instructions: %s`, customPrompt)
	} else {
		switch action {
		case model.RewriteActionCustom:
			actionPrompt = fmt.Sprintf(`%s
%s`, customPrompt, message)
		case model.RewriteActionShorten:
			actionPrompt = fmt.Sprintf(`Make this up to 2 to 3 times shorter: %s`, message)
		case model.RewriteActionElaborate:
			actionPrompt = fmt.Sprintf(`Make this up to 2 to 3 times longer, using Markdown if necessary: %s`, message)
		case model.RewriteActionImproveWriting:
			actionPrompt = fmt.Sprintf(`Improve this writing, using Markdown if necessary: %s`, message)
		case model.RewriteActionFixSpelling:
			actionPrompt = fmt.Sprintf(`Fix spelling and grammar: %s`, message)
		case model.RewriteActionSimplify:
			actionPrompt = fmt.Sprintf(`Simplify this: %s`, message)
		case model.RewriteActionSummarize:
			actionPrompt = fmt.Sprintf(`Summarize this, using Markdown if necessary: %s`, message)
		default:
			return ""
		}
	}
	if actionPrompt == "" {
		return ""
	}
	if threadContext != "" {
		var promptBuilder strings.Builder
		promptBuilder.WriteString("=== THREAD CONTEXT (for reference only) ===\n")
		promptBuilder.WriteString(threadContext)
		promptBuilder.WriteString("\n\n=== REWRITE TASK ===\n")
		promptBuilder.WriteString(actionPrompt)
		promptBuilder.WriteString("\n\nRewrite the message considering the thread context above.")
		return promptBuilder.String()
	}
	return actionPrompt
}
func buildRewriteSystemPrompt(userLocale string) string {
	locale := strings.TrimSpace(userLocale)
	if locale == "" {
		return model.RewriteSystemPrompt
	}
	return fmt.Sprintf(`%s
User locale: %s. Preserve locale-specific spelling, grammar, and formatting. Keep locale identifiers (like %s) unchanged. Do not translate between locales.`, model.RewriteSystemPrompt, locale, locale)
}
func (a *App) RevealPost(rctx request.CTX, post *model.Post, userID string, connectionID string) (*model.Post, *model.AppError) {
	if err := a.validateBurnOnReadPost(rctx, post); err != nil {
		return nil, err
	}
	postExpireAt, err := a.extractPostExpiration(post)
	if err != nil {
		return nil, err
	}
	currentTime := model.GetMillis()
	if err = a.validatePostNotExpired(post.Id, postExpireAt, currentTime); err != nil {
		return nil, err
	}
	receipt, isFirstReveal, err := a.getOrCreateReadReceipt(rctx, post, userID, postExpireAt, currentTime)
	if err != nil {
		return nil, err
	}
	if err = a.validateReadReceiptNotExpired(receipt, currentTime); err != nil {
		return nil, err
	}
	revealedPost, err := a.getBurnOnReadPost(rctx, post)
	if err != nil {
		return nil, err
	}
	a.enrichPostWithExpirationMetadata(revealedPost, receipt.ExpireAt)
	revealedPost = a.PreparePostForClientWithEmbedsAndImages(rctx, revealedPost, &model.PreparePostForClientOpts{
		IncludePriority: true,
		RetainContent:   true,
	})
	if isFirstReveal {
		if err := a.publishPostRevealedEventToAuthor(rctx, revealedPost, userID, connectionID); err != nil {
			return nil, err
		}
		if err := a.publishPostRevealedEventToUser(rctx, revealedPost, userID, connectionID); err != nil {
			return nil, err
		}
	}
	return revealedPost, nil
}
func (a *App) validateBurnOnReadPost(rctx request.CTX, post *model.Post) *model.AppError {
	if post.Type != model.PostTypeBurnOnRead {
		return model.NewAppError("RevealPost", "app.reveal_post.not_burn_on_read.app_error", nil, fmt.Sprintf("postId=%s", post.Id), http.StatusBadRequest)
	}
	if post.UserId == rctx.Session().UserId {
		return model.NewAppError("RevealPost", "app.reveal_post.cannot_reveal_own_post.app_error", nil, fmt.Sprintf("postId=%s", post.Id), http.StatusBadRequest)
	}
	return nil
}
func (a *App) extractPostExpiration(post *model.Post) (int64, *model.AppError) {
	expirationProp := post.GetProp(model.PostPropsExpireAt)
	if expirationProp == nil {
		return 0, model.NewAppError("RevealPost", "app.reveal_post.missing_expire_at.app_error", nil, fmt.Sprintf("postId=%s", post.Id), http.StatusBadRequest)
	}
	var expireAt int64
	switch v := expirationProp.(type) {
	case int64:
		expireAt = v
	case float64:
		expireAt = int64(v)
	default:
		return 0, model.NewAppError("RevealPost", "app.reveal_post.missing_expire_at.app_error", nil, fmt.Sprintf("postId=%s", post.Id), http.StatusBadRequest)
	}
	if expireAt == 0 {
		return 0, model.NewAppError("RevealPost", "app.reveal_post.missing_expire_at.app_error", nil, fmt.Sprintf("postId=%s", post.Id), http.StatusBadRequest)
	}
	return expireAt, nil
}
func (a *App) validatePostNotExpired(postID string, expireAt, currentTime int64) *model.AppError {
	if currentTime >= expireAt {
		return model.NewAppError("RevealPost", "app.reveal_post.post_expired.app_error", nil, fmt.Sprintf("postId=%s", postID), http.StatusBadRequest)
	}
	return nil
}
func (a *App) getOrCreateReadReceipt(rctx request.CTX, post *model.Post, userID string, postExpireAt int64, currentTime int64) (*model.ReadReceipt, bool, *model.AppError) {
	receipt, err := a.Srv().Store().ReadReceipt().Get(rctx, post.Id, userID)
	if err != nil && !store.IsErrNotFound(err) {
		return nil, false, model.NewAppError("RevealPost", "app.reveal_post.read_receipt.get.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if receipt != nil {
		return receipt, false, nil
	}
	burnOnReadDurationSeconds := int64(model.SafeDereference(a.Config().ServiceSettings.BurnOnReadDurationSeconds))
	readDurationMillis := burnOnReadDurationSeconds * 1000
	userExpireAt := min(postExpireAt, currentTime+readDurationMillis)
	receipt = &model.ReadReceipt{
		UserID:   userID,
		PostID:   post.Id,
		ExpireAt: userExpireAt,
	}
	if _, err := a.Srv().Store().ReadReceipt().Save(rctx, receipt); err != nil {
		return nil, false, model.NewAppError("RevealPost", "app.reveal_post.read_receipt.save.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if err := a.updateTemporaryPostIfAllRead(rctx, post, receipt); err != nil {
		rctx.Logger().Warn("Failed to update temporary post expiration after all recipients read", mlog.String("post_id", post.Id), mlog.Err(err))
	}
	return receipt, true, nil
}
func (a *App) updateTemporaryPostIfAllRead(rctx request.CTX, post *model.Post, receipt *model.ReadReceipt) *model.AppError {
	unreadCount, err := a.Srv().Store().ReadReceipt().GetUnreadCountForPost(rctx, post)
	if err != nil {
		return model.NewAppError("RevealPost", "app.reveal_post.read_receipt.get_unread_count.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if unreadCount > 0 {
		return nil
	}
	tmpPost, err := a.Srv().Store().TemporaryPost().Get(rctx, post.Id, false)
	if err != nil {
		return model.NewAppError("RevealPost", "app.post.get_post.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	tmpPost.ExpireAt = receipt.ExpireAt
	if _, err := a.Srv().Store().TemporaryPost().Save(rctx, tmpPost); err != nil {
		return model.NewAppError("RevealPost", "app.post.get_post.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if err := a.publishAllRecipientsRevealedEvent(rctx, post, receipt.ExpireAt); err != nil {
		rctx.Logger().Warn("Failed to publish all recipients revealed event", mlog.String("post_id", post.Id), mlog.Err(err))
	}
	return nil
}
func (a *App) validateReadReceiptNotExpired(receipt *model.ReadReceipt, currentTime int64) *model.AppError {
	if receipt.ExpireAt < currentTime {
		return model.NewAppError("RevealPost", "app.reveal_post.read_receipt_expired.error", nil, "", http.StatusForbidden)
	}
	return nil
}
func (a *App) publishPostRevealedEventToAuthor(rctx request.CTX, post *model.Post, revealingUserID string, connectionID string) *model.AppError {
	event := model.NewWebSocketEvent(
		model.WebsocketEventPostRevealed,
		"",
		"",
		post.UserId,
		nil,
		connectionID,
	)
	postJSON, err := post.ToJSON()
	if err != nil {
		return model.NewAppError("RevealPost", "app.post.marshal.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	event.Add("post", postJSON)
	if revealingUserID != "" {
		event.Add("recipients", []string{revealingUserID})
	} else {
		event.Add("recipients", []string{})
	}
	a.Publish(event)
	return nil
}
func (a *App) publishPostRevealedEventToUser(rctx request.CTX, post *model.Post, userID string, connectionID string) *model.AppError {
	event := model.NewWebSocketEvent(
		model.WebsocketEventPostRevealed,
		"",
		"",
		userID,
		nil,
		connectionID,
	)
	postJSON, err := post.ToJSON()
	if err != nil {
		return model.NewAppError("RevealPost", "app.post.marshal.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	event.Add("post", postJSON)
	a.Publish(event)
	return nil
}
func (a *App) publishPostBurnedEvent(postID string, channelID string, userID string, connectionID string) *model.AppError {
	event := model.NewWebSocketEvent(
		model.WebsocketEventPostBurned,
		"",
		channelID,
		userID,
		nil,
		connectionID,
	)
	event.Add("post_id", postID)
	a.Publish(event)
	return nil
}
func (a *App) publishAllRecipientsRevealedEvent(rctx request.CTX, post *model.Post, senderExpireAt int64) *model.AppError {
	event := model.NewWebSocketEvent(
		model.WebsocketEventBurnOnReadAllRevealed,
		"",
		post.ChannelId,
		post.UserId,
		nil,
		"",
	)
	event.Add("post_id", post.Id)
	event.Add("sender_expire_at", senderExpireAt)
	a.Publish(event)
	return nil
}
func (a *App) enrichPostWithExpirationMetadata(post *model.Post, expireAt int64) {
	if post.Metadata == nil {
		post.Metadata = &model.PostMetadata{}
	}
	post.Metadata.ExpireAt = expireAt
}
func (a *App) getBurnOnReadPost(rctx request.CTX, post *model.Post) (*model.Post, *model.AppError) {
	tmpPost, err := a.Srv().Store().TemporaryPost().Get(rctx, post.Id, true)
	if err != nil {
		return nil, model.NewAppError("getBurnOnReadPost", "app.post.get_post.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	clone := post.Clone()
	clone.Message = tmpPost.Message
	clone.FileIds = tmpPost.FileIDs
	return clone, nil
}
func (a *App) revealPostForAuthor(rctx request.CTX, postList *model.PostList, post *model.Post) *model.AppError {
	revealedPost, appErr := a.getBurnOnReadPost(rctx, post)
	if appErr != nil {
		return appErr
	}
	a.ensurePostMetadata(revealedPost)
	recipients, err := a.Srv().Store().ReadReceipt().GetByPost(rctx, post.Id)
	if err != nil {
		return model.NewAppError("RevealBurnOnReadPostsForUser", "app.post.get_posts.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	for _, recipient := range recipients {
		revealedPost.Metadata.Recipients = append(revealedPost.Metadata.Recipients, recipient.UserID)
	}
	postList.Posts[post.Id] = revealedPost
	return nil
}
func (a *App) getUserReadReceipt(rctx request.CTX, postID, userID string) (*model.ReadReceipt, *model.AppError) {
	receipt, err := a.Srv().Store().ReadReceipt().Get(rctx, postID, userID)
	if err != nil && !store.IsErrNotFound(err) {
		return nil, model.NewAppError("RevealBurnOnReadPostsForUser", "app.post.get_posts.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return receipt, nil
}
func (a *App) setUnrevealedPost(postList *model.PostList, postID string) {
	unrevealedPost := postList.Posts[postID].Clone()
	a.ensurePostMetadata(unrevealedPost)
	unrevealedPost.Metadata.Emojis = []*model.Emoji{}
	unrevealedPost.Metadata.Reactions = []*model.Reaction{}
	unrevealedPost.Metadata.Files = []*model.FileInfo{}
	unrevealedPost.Metadata.Images = map[string]*model.PostImage{}
	unrevealedPost.Metadata.Acknowledgements = []*model.PostAcknowledgement{}
	unrevealedPost.Message = ""
	postList.Posts[postID] = unrevealedPost
}
func (a *App) isReceiptExpired(receipt *model.ReadReceipt) bool {
	return receipt.ExpireAt < model.GetMillis()
}
func (a *App) removePostFromList(postList *model.PostList, postID string) {
	for i, orderPostID := range postList.Order {
		if orderPostID == postID {
			postList.Order = append(postList.Order[:i], postList.Order[i+1:]...)
			break
		}
	}
	delete(postList.Posts, postID)
}
func (a *App) revealPostForUser(rctx request.CTX, postList *model.PostList, post *model.Post, receipt *model.ReadReceipt) *model.AppError {
	revealedPost, err := a.getBurnOnReadPost(rctx, post)
	if err != nil {
		return err
	}
	a.ensurePostMetadata(revealedPost)
	revealedPost.Metadata.ExpireAt = receipt.ExpireAt
	postList.Posts[post.Id] = revealedPost
	return nil
}
func (a *App) ensurePostMetadata(post *model.Post) {
	if post.Metadata == nil {
		post.Metadata = &model.PostMetadata{}
	}
}
func (a *App) BurnPost(rctx request.CTX, post *model.Post, userID string, connectionID string) *model.AppError {
	if post.Type != model.PostTypeBurnOnRead {
		return model.NewAppError("BurnPost", "app.burn_post.not_burn_on_read.app_error", nil, fmt.Sprintf("postId=%s", post.Id), http.StatusBadRequest)
	}
	if post.UserId == userID {
		return a.PermanentDeletePostDataRetainStub(rctx, post, userID)
	}
	receipt, err := a.Srv().Store().ReadReceipt().Get(rctx, post.Id, userID)
	if err != nil {
		if store.IsErrNotFound(err) {
			return model.NewAppError("BurnPost", "app.burn_post.not_revealed.app_error", nil, fmt.Sprintf("postId=%s", post.Id), http.StatusBadRequest)
		}
		return model.NewAppError("BurnPost", "app.burn_post.read_receipt.get.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	currentTime := model.GetMillis()
	if receipt.ExpireAt < currentTime {
		return nil
	}
	receipt.ExpireAt = currentTime
	_, err = a.Srv().Store().ReadReceipt().Update(rctx, receipt)
	if err != nil {
		return model.NewAppError("BurnPost", "app.burn_post.read_receipt.update.error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	if err := a.publishPostBurnedEvent(post.Id, post.ChannelId, userID, connectionID); err != nil {
		rctx.Logger().Warn("Failed to publish post burned websocket event", mlog.String("post_id", post.Id), mlog.String("user_id", userID), mlog.Err(err))
	}
	return nil
}