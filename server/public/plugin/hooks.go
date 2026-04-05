package plugin
import (
	"io"
	"net/http"
	saml2 "github.com/mattermost/gosaml2"
	"github.com/mattermost/mattermost/server/public/model"
)
const (
	OnActivateID                              = 0
	OnDeactivateID                            = 1
	ServeHTTPID                               = 2
	OnConfigurationChangeID                   = 3
	ExecuteCommandID                          = 4
	MessageWillBePostedID                     = 5
	MessageWillBeUpdatedID                    = 6
	MessageHasBeenPostedID                    = 7
	MessageHasBeenUpdatedID                   = 8
	UserHasJoinedChannelID                    = 9
	UserHasLeftChannelID                      = 10
	UserHasJoinedTeamID                       = 11
	UserHasLeftTeamID                         = 12
	ChannelHasBeenCreatedID                   = 13
	FileWillBeUploadedID                      = 14
	UserWillLogInID                           = 15
	UserHasLoggedInID                         = 16
	UserHasBeenCreatedID                      = 17
	ReactionHasBeenAddedID                    = 18
	ReactionHasBeenRemovedID                  = 19
	OnPluginClusterEventID                    = 20
	OnWebSocketConnectID                      = 21
	OnWebSocketDisconnectID                   = 22
	WebSocketMessageHasBeenPostedID           = 23
	RunDataRetentionID                        = 24
	OnInstallID                               = 25
	OnSendDailyTelemetryID                    = 26
	OnCloudLimitsUpdatedID                    = 27
	deprecatedUserHasPermissionToCollectionID = 28
	deprecatedGetAllUserIdsForCollectionID    = 29
	deprecatedGetAllCollectionIDsForUserID    = 30
	deprecatedGetTopicRedirectID              = 31
	deprecatedGetCollectionMetadataByIdsID    = 32
	deprecatedGetTopicMetadataByIdsID         = 33
	ConfigurationWillBeSavedID                = 34
	NotificationWillBePushedID                = 35
	UserHasBeenDeactivatedID                  = 36
	MessageHasBeenDeletedID                   = 37
	MessagesWillBeConsumedID                  = 38
	ServeMetricsID                            = 39
	OnSharedChannelsSyncMsgID                 = 40
	OnSharedChannelsPingID                    = 41
	PreferencesHaveChangedID                  = 42
	OnSharedChannelsAttachmentSyncMsgID       = 43
	OnSharedChannelsProfileImageSyncMsgID     = 44
	GenerateSupportDataID                     = 45
	OnSAMLLoginID                             = 46
	EmailNotificationWillBeSentID             = 47
	FileWillBeDownloadedID                    = 48
	ChannelMemberWillBeAddedID                = 49
	TeamMemberWillBeAddedID                   = 50
	ChannelWillBeArchivedID                   = 51
	TotalHooksID                              = iota
)
const (
	DismissPostError = "plugin.message_will_be_posted.dismiss_post"
)
type Hooks interface {
	OnActivate() error
	Implemented() ([]string, error)
	OnDeactivate() error
	OnConfigurationChange() error
	ServeHTTP(c *Context, w http.ResponseWriter, r *http.Request)
	ExecuteCommand(c *Context, args *model.CommandArgs) (*model.CommandResponse, *model.AppError)
	UserHasBeenCreated(c *Context, user *model.User)
	UserWillLogIn(c *Context, user *model.User) string
	UserHasLoggedIn(c *Context, user *model.User)
	MessageWillBePosted(c *Context, post *model.Post) (*model.Post, string)
	MessageWillBeUpdated(c *Context, newPost, oldPost *model.Post) (*model.Post, string)
	MessageHasBeenPosted(c *Context, post *model.Post)
	MessageHasBeenUpdated(c *Context, newPost, oldPost *model.Post)
	MessagesWillBeConsumed(posts []*model.Post) []*model.Post
	MessageHasBeenDeleted(c *Context, post *model.Post)
	ChannelHasBeenCreated(c *Context, channel *model.Channel)
	ChannelWillBeArchived(c *Context, channel *model.Channel) string
	ChannelMemberWillBeAdded(c *Context, channelMember *model.ChannelMember) (*model.ChannelMember, string)
	UserHasJoinedChannel(c *Context, channelMember *model.ChannelMember, actor *model.User)
	UserHasLeftChannel(c *Context, channelMember *model.ChannelMember, actor *model.User)
	TeamMemberWillBeAdded(c *Context, teamMember *model.TeamMember) (*model.TeamMember, string)
	UserHasJoinedTeam(c *Context, teamMember *model.TeamMember, actor *model.User)
	UserHasLeftTeam(c *Context, teamMember *model.TeamMember, actor *model.User)
	FileWillBeUploaded(c *Context, info *model.FileInfo, file io.Reader, output io.Writer) (*model.FileInfo, string)
	FileWillBeDownloaded(c *Context, fileInfo *model.FileInfo, userID string, downloadType model.FileDownloadType) string
	ReactionHasBeenAdded(c *Context, reaction *model.Reaction)
	ReactionHasBeenRemoved(c *Context, reaction *model.Reaction)
	OnPluginClusterEvent(c *Context, ev model.PluginClusterEvent)
	OnWebSocketConnect(webConnID, userID string)
	OnWebSocketDisconnect(webConnID, userID string)
	WebSocketMessageHasBeenPosted(webConnID, userID string, req *model.WebSocketRequest)
	RunDataRetention(nowTime, batchSize int64) (int64, error)
	OnInstall(c *Context, event model.OnInstallEvent) error
	OnSendDailyTelemetry()
	OnCloudLimitsUpdated(limits *model.ProductLimits)
	ConfigurationWillBeSaved(newCfg *model.Config) (*model.Config, error)
	EmailNotificationWillBeSent(emailNotification *model.EmailNotification) (*model.EmailNotificationContent, string)
	NotificationWillBePushed(pushNotification *model.PushNotification, userID string) (*model.PushNotification, string)
	UserHasBeenDeactivated(c *Context, user *model.User)
	ServeMetrics(c *Context, w http.ResponseWriter, r *http.Request)
	OnSharedChannelsSyncMsg(msg *model.SyncMsg, rc *model.RemoteCluster) (model.SyncResponse, error)
	OnSharedChannelsPing(rc *model.RemoteCluster) bool
	PreferencesHaveChanged(c *Context, preferences []model.Preference)
	OnSharedChannelsAttachmentSyncMsg(fi *model.FileInfo, post *model.Post, rc *model.RemoteCluster) error
	OnSharedChannelsProfileImageSyncMsg(user *model.User, rc *model.RemoteCluster) error
	GenerateSupportData(c *Context) ([]*model.FileData, error)
	OnSAMLLogin(c *Context, user *model.User, assertion *saml2.AssertionInfo) error
}