package sharedchannel
import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"sync"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/einterfaces"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
	"github.com/mattermost/mattermost/server/v8/platform/shared/filestore"
)
const (
	TopicSync                    = "sharedchannel_sync"
	TopicChannelInvite           = "sharedchannel_invite"
	TopicUploadCreate            = "sharedchannel_upload"
	TopicChannelMembership       = "sharedchannel_membership"
	TopicGlobalUserSync          = "sharedchannel_global_user_sync"
	MaxRetries                   = 3
	MaxUsersPerSync              = 25
	NotifyRemoteOfflineThreshold = time.Second * 10
	NotifyMinimumDelay           = time.Second * 2
	MaxUpsertRetries             = 25
	ProfileImageSyncTimeout      = time.Second * 5
	UnshareMessage               = "This channel is no longer shared."
)
type ServerIface interface {
	Config() *model.Config
	IsLeader() bool
	AddClusterLeaderChangedListener(listener func()) string
	RemoveClusterLeaderChangedListener(id string)
	GetStore() store.Store
	Log() *mlog.Logger
	GetRemoteClusterService() remotecluster.RemoteClusterServiceIFace
	GetMetrics() einterfaces.MetricsInterface
}
type PlatformIface interface {
	InvalidateCacheForUser(userID string)
	InvalidateCacheForChannel(channel *model.Channel)
}
type AppIface interface {
	SendEphemeralPost(rctx request.CTX, userId string, post *model.Post) (*model.Post, bool)
	CreateChannelWithUser(rctx request.CTX, channel *model.Channel, userId string) (*model.Channel, *model.AppError)
	GetOrCreateDirectChannel(rctx request.CTX, userId, otherUserId string, channelOptions ...model.ChannelOption) (*model.Channel, *model.AppError)
	CreateGroupChannel(rctx request.CTX, userIDs []string, creatorId string, channelOptions ...model.ChannelOption) (*model.Channel, *model.AppError)
	UserCanSeeOtherUser(rctx request.CTX, userID string, otherUserId string) (bool, *model.AppError)
	AddUserToChannel(rctx request.CTX, user *model.User, channel *model.Channel, skipTeamMemberIntegrityCheck bool) (*model.ChannelMember, *model.AppError)
	AddUserToTeamByTeamId(rctx request.CTX, teamId string, user *model.User) *model.AppError
	RemoveUserFromChannel(rctx request.CTX, userID string, removerUserId string, channel *model.Channel) *model.AppError
	PermanentDeleteChannel(rctx request.CTX, channel *model.Channel) *model.AppError
	CreatePost(rctx request.CTX, post *model.Post, channel *model.Channel, flags model.CreatePostFlags) (savedPost *model.Post, isMemberForPreviews bool, err *model.AppError)
	UpdatePost(rctx request.CTX, post *model.Post, updatePostOptions *model.UpdatePostOptions) (*model.Post, bool, *model.AppError)
	DeletePost(rctx request.CTX, postID, deleteByID string) (*model.Post, *model.AppError)
	SaveReactionForPost(rctx request.CTX, reaction *model.Reaction) (*model.Reaction, *model.AppError)
	DeleteReactionForPost(rctx request.CTX, reaction *model.Reaction) *model.AppError
	SaveAndBroadcastStatus(status *model.Status)
	PatchChannelModerationsForChannel(rctx request.CTX, channel *model.Channel, channelModerationsPatch []*model.ChannelModerationPatch) ([]*model.ChannelModeration, *model.AppError)
	CreateUploadSession(rctx request.CTX, us *model.UploadSession) (*model.UploadSession, *model.AppError)
	FileReader(path string) (filestore.ReadCloseSeeker, *model.AppError)
	MentionsToTeamMembers(rctx request.CTX, message, teamID string) model.UserMentionMap
	GetProfileImage(user *model.User) ([]byte, bool, *model.AppError)
	NotifySharedChannelUserUpdate(user *model.User)
	OnSharedChannelsSyncMsg(msg *model.SyncMsg, rc *model.RemoteCluster) (model.SyncResponse, error)
	OnSharedChannelsAttachmentSyncMsg(fi *model.FileInfo, post *model.Post, rc *model.RemoteCluster) error
	OnSharedChannelsProfileImageSyncMsg(user *model.User, rc *model.RemoteCluster) error
	Publish(message *model.WebSocketEvent)
	SaveAcknowledgementForPostWithModel(rctx request.CTX, acknowledgement *model.PostAcknowledgement) (*model.PostAcknowledgement, *model.AppError)
	DeleteAcknowledgementForPostWithModel(rctx request.CTX, acknowledgement *model.PostAcknowledgement) *model.AppError
	SaveAcknowledgementsForPost(rctx request.CTX, postID string, userIDs []string) ([]*model.PostAcknowledgement, *model.AppError)
	GetAcknowledgementsForPost(postID string) ([]*model.PostAcknowledgement, *model.AppError)
	PreparePostForClient(rctx request.CTX, post *model.Post, opts *model.PreparePostForClientOpts) *model.Post
}
type errNotFound interface {
	IsErrNotFound() bool
}
type Service struct {
	server       ServerIface
	platform     PlatformIface
	app          AppIface
	changeSignal chan struct{}
	mux              sync.RWMutex
	active           bool
	leaderListenerId string
	connectionStateListenerId string
	done                      chan struct{}
	tasks                     map[string]syncTask
	syncTopicListenerId       string
	inviteTopicListenerId     string
	uploadTopicListenerId     string
	globalSyncTopicListenerId string
	siteURL                   *url.URL
}
func NewSharedChannelService(server ServerIface, platform PlatformIface, app AppIface) (*Service, error) {
	service := &Service{
		server:       server,
		platform:     platform,
		app:          app,
		changeSignal: make(chan struct{}, 1),
		tasks:        make(map[string]syncTask),
	}
	parsed, err := url.Parse(*server.Config().ServiceSettings.SiteURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse SiteURL: %w", err)
	}
	service.siteURL = parsed
	return service, nil
}
func (scs *Service) Start() error {
	rcs := scs.server.GetRemoteClusterService()
	if rcs == nil || !rcs.Active() {
		return errors.New("Shared Channel Service cannot activate: requires Remote Cluster Service")
	}
	scs.mux.Lock()
	scs.leaderListenerId = scs.server.AddClusterLeaderChangedListener(scs.onClusterLeaderChange)
	scs.syncTopicListenerId = rcs.AddTopicListener(TopicSync, scs.onReceiveSyncMessage)
	scs.inviteTopicListenerId = rcs.AddTopicListener(TopicChannelInvite, scs.onReceiveChannelInvite)
	scs.uploadTopicListenerId = rcs.AddTopicListener(TopicUploadCreate, scs.onReceiveUploadCreate)
	scs.globalSyncTopicListenerId = rcs.AddTopicListener(TopicGlobalUserSync, scs.onReceiveSyncMessage)
	scs.connectionStateListenerId = rcs.AddConnectionStateListener(scs.onConnectionStateChange)
	scs.mux.Unlock()
	rcs.AddTopicListener(TopicChannelMembership, scs.onReceiveSyncMessage)
	scs.onClusterLeaderChange()
	return nil
}
func (scs *Service) Shutdown() error {
	rcs := scs.server.GetRemoteClusterService()
	if rcs == nil || !rcs.Active() {
		return errors.New("Shared Channel Service cannot shutdown: requires Remote Cluster Service")
	}
	scs.mux.Lock()
	id := scs.leaderListenerId
	rcs.RemoveTopicListener(scs.syncTopicListenerId)
	scs.syncTopicListenerId = ""
	rcs.RemoveTopicListener(scs.inviteTopicListenerId)
	scs.inviteTopicListenerId = ""
	rcs.RemoveConnectionStateListener(scs.connectionStateListenerId)
	scs.connectionStateListenerId = ""
	scs.mux.Unlock()
	scs.server.RemoveClusterLeaderChangedListener(id)
	scs.pause()
	return nil
}
func (scs *Service) Active() bool {
	scs.mux.Lock()
	defer scs.mux.Unlock()
	return scs.active
}
func (scs *Service) sendEphemeralPost(channelId string, userId string, text string) {
	ephemeral := &model.Post{
		ChannelId: channelId,
		Message:   text,
		CreateAt:  model.GetMillis(),
	}
	scs.app.SendEphemeralPost(request.EmptyContext(scs.server.Log()), userId, ephemeral)
}
func (scs *Service) onClusterLeaderChange() {
	if scs.server.IsLeader() {
		scs.resume()
	} else {
		scs.pause()
	}
}
func (scs *Service) resume() {
	scs.mux.Lock()
	defer scs.mux.Unlock()
	if scs.active {
		return
	}
	scs.active = true
	scs.done = make(chan struct{})
	go scs.syncLoop(scs.done)
	scs.server.Log().Debug("Shared Channel Service active")
}
func (scs *Service) pause() {
	scs.mux.Lock()
	defer scs.mux.Unlock()
	if !scs.active {
		return
	}
	scs.active = false
	close(scs.done)
	scs.done = nil
	scs.server.Log().Debug("Shared Channel Service inactive")
}
func (scs *Service) GetMemberSyncBatchSize() int {
	if scs.server.Config().ConnectedWorkspacesSettings.MemberSyncBatchSize != nil {
		return *scs.server.Config().ConnectedWorkspacesSettings.MemberSyncBatchSize
	}
	return model.ConnectedWorkspacesSettingsDefaultMemberSyncBatchSize
}
func (scs *Service) makeChannelReadOnly(channel *model.Channel) *model.AppError {
	createPostPermission := model.ChannelModeratedPermissionsMap[model.PermissionCreatePost.Id]
	createReactionPermission := model.ChannelModeratedPermissionsMap[model.PermissionAddReaction.Id]
	updateMap := model.ChannelModeratedRolesPatch{
		Guests:  model.NewPointer(false),
		Members: model.NewPointer(false),
	}
	readonlyChannelModerations := []*model.ChannelModerationPatch{
		{
			Name:  &createPostPermission,
			Roles: &updateMap,
		},
		{
			Name:  &createReactionPermission,
			Roles: &updateMap,
		},
	}
	_, err := scs.app.PatchChannelModerationsForChannel(request.EmptyContext(scs.server.Log()), channel, readonlyChannelModerations)
	return err
}
func (scs *Service) onConnectionStateChange(rc *model.RemoteCluster, online bool) {
	if online {
		scs.SendPendingInvitesForRemote(rc)
		scs.ForceSyncForRemote(rc)
		scs.ForceMembershipSyncForRemote(rc)
		scs.scheduleGlobalUserSync(rc)
	}
	scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Remote cluster connection status changed",
		mlog.String("remote", rc.DisplayName),
		mlog.String("remoteId", rc.RemoteId),
		mlog.Bool("online", online),
	)
}
func (scs *Service) notifyClientsForSharedChannelConverted(channel *model.Channel) {
	scs.platform.InvalidateCacheForChannel(channel)
	messageWs := model.NewWebSocketEvent(model.WebsocketEventChannelUpdated, "", channel.Id, "", nil, "")
	channelJSON, err := json.Marshal(channel)
	if err != nil {
		scs.server.Log().Log(mlog.LvlSharedChannelServiceWarn, "Cannot marshal channel to notify clients",
			mlog.String("channel_id", channel.Id),
			mlog.Err(err),
		)
		return
	}
	messageWs.Add("channel", string(channelJSON))
	scs.app.Publish(messageWs)
}
func (scs *Service) notifyClientsForSharedChannelUpdate(channel *model.Channel) {
	messageWs := model.NewWebSocketEvent(model.WebsocketEventChannelUpdated, channel.TeamId, "", "", nil, "")
	messageWs.Add("channel_id", channel.Id)
	scs.app.Publish(messageWs)
}
func (scs *Service) postUnshareNotification(channelID string, creatorID string, channel *model.Channel, rc *model.RemoteCluster) {
	post := &model.Post{
		UserId:    creatorID,
		ChannelId: channelID,
		Message:   UnshareMessage,
		Type:      model.PostTypeSystemGeneric,
	}
	logger := scs.server.Log()
	_, _, appErr := scs.app.CreatePost(request.EmptyContext(logger), post, channel, model.CreatePostFlags{})
	if appErr != nil {
		scs.server.Log().Log(
			mlog.LvlSharedChannelServiceError,
			"Error creating unshare notification post",
			mlog.String("channel_id", channelID),
			mlog.String("remote_id", rc.RemoteId),
			mlog.String("remote_name", rc.Name),
			mlog.Err(appErr),
		)
	}
}
func (scs *Service) IsRemoteClusterDirectlyConnected(remoteId string) bool {
	if remoteId == "" {
		return true
	}
	rc, err := scs.server.GetStore().RemoteCluster().Get(remoteId, false)
	if err != nil {
		return false
	}
	isConfirmed := rc.IsConfirmed()
	hasCreator := rc.CreatorId != ""
	directConnection := isConfirmed && hasCreator
	return directConnection
}
func (scs *Service) isGlobalUserSyncEnabled() bool {
	cfg := scs.server.Config()
	return cfg.FeatureFlags.EnableSyncAllUsersForRemoteCluster ||
		(cfg.ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen != nil && *cfg.ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen)
}
func (scs *Service) scheduleGlobalUserSync(rc *model.RemoteCluster) {
	if !scs.isGlobalUserSyncEnabled() {
		return
	}
	go func() {
		task := newSyncTask("", "", rc.RemoteId, nil, nil)
		task.schedule = time.Now().Add(NotifyMinimumDelay)
		scs.addTask(task)
		scs.server.Log().Log(mlog.LvlSharedChannelServiceDebug, "Scheduled global user sync task for remote",
			mlog.String("remote", rc.DisplayName),
			mlog.String("remoteId", rc.RemoteId),
		)
	}()
}
func (scs *Service) HasPendingTasksForTesting() bool {
	scs.mux.RLock()
	defer scs.mux.RUnlock()
	return len(scs.tasks) > 0
}
func (scs *Service) HandleSyncAllUsersForTesting(rc *model.RemoteCluster) error {
	return scs.syncAllUsers(rc)
}
func (scs *Service) OnReceiveSyncMessageForTesting(msg model.RemoteClusterMsg, rc *model.RemoteCluster, response *remotecluster.Response) error {
	return scs.onReceiveSyncMessage(msg, rc, response)
}
func (scs *Service) HandleChannelNotSharedErrorForTesting(msg *model.SyncMsg, rc *model.RemoteCluster) {
	scs.handleChannelNotSharedError(msg, rc)
}
func (scs *Service) TransformMentionsOnReceiveForTesting(rctx request.CTX, post *model.Post, targetChannel *model.Channel, rc *model.RemoteCluster, mentionTransforms map[string]string) {
	scs.transformMentionsOnReceive(rctx, post, targetChannel, rc, mentionTransforms)
}