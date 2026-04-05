package plugin
import (
	"io"
	"net/http"
	plugin "github.com/hashicorp/go-plugin"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
type API interface {
	LoadPluginConfiguration(dest any) error
	RegisterCommand(command *model.Command) error
	UnregisterCommand(teamID, trigger string) error
	ExecuteSlashCommand(commandArgs *model.CommandArgs) (*model.CommandResponse, error)
	GetConfig() *model.Config
	GetUnsanitizedConfig() *model.Config
	SaveConfig(config *model.Config) *model.AppError
	GetPluginConfig() map[string]any
	SavePluginConfig(config map[string]any) *model.AppError
	GetBundlePath() (string, error)
	GetLicense() *model.License
	IsEnterpriseReady() bool
	GetServerVersion() string
	GetSystemInstallDate() (int64, *model.AppError)
	GetDiagnosticId() string
	GetTelemetryId() string
	CreateUser(user *model.User) (*model.User, *model.AppError)
	DeleteUser(userID string) *model.AppError
	GetUsers(options *model.UserGetOptions) ([]*model.User, *model.AppError)
	GetUsersByIds(userIDs []string) ([]*model.User, *model.AppError)
	GetUser(userID string) (*model.User, *model.AppError)
	GetUserByEmail(email string) (*model.User, *model.AppError)
	GetUserByUsername(name string) (*model.User, *model.AppError)
	GetUsersByUsernames(usernames []string) ([]*model.User, *model.AppError)
	GetUsersInTeam(teamID string, page int, perPage int) ([]*model.User, *model.AppError)
	GetPreferenceForUser(userID, category, name string) (model.Preference, *model.AppError)
	GetPreferencesForUser(userID string) ([]model.Preference, *model.AppError)
	UpdatePreferencesForUser(userID string, preferences []model.Preference) *model.AppError
	DeletePreferencesForUser(userID string, preferences []model.Preference) *model.AppError
	GetSession(sessionID string) (*model.Session, *model.AppError)
	CreateSession(session *model.Session) (*model.Session, *model.AppError)
	ExtendSessionExpiry(sessionID string, newExpiry int64) *model.AppError
	RevokeSession(sessionID string) *model.AppError
	CreateUserAccessToken(token *model.UserAccessToken) (*model.UserAccessToken, *model.AppError)
	RevokeUserAccessToken(tokenID string) *model.AppError
	GetTeamIcon(teamID string) ([]byte, *model.AppError)
	SetTeamIcon(teamID string, data []byte) *model.AppError
	RemoveTeamIcon(teamID string) *model.AppError
	UpdateUser(user *model.User) (*model.User, *model.AppError)
	GetUserStatus(userID string) (*model.Status, *model.AppError)
	GetUserStatusesByIds(userIds []string) ([]*model.Status, *model.AppError)
	UpdateUserStatus(userID, status string) (*model.Status, *model.AppError)
	SetUserStatusTimedDND(userId string, endtime int64) (*model.Status, *model.AppError)
	UpdateUserActive(userID string, active bool) *model.AppError
	UpdateUserCustomStatus(userID string, customStatus *model.CustomStatus) *model.AppError
	RemoveUserCustomStatus(userID string) *model.AppError
	GetUsersInChannel(channelID, sortBy string, page, perPage int) ([]*model.User, *model.AppError)
	GetLDAPUserAttributes(userID string, attributes []string) (map[string]string, *model.AppError)
	CreateTeam(team *model.Team) (*model.Team, *model.AppError)
	DeleteTeam(teamID string) *model.AppError
	GetTeams() ([]*model.Team, *model.AppError)
	GetTeam(teamID string) (*model.Team, *model.AppError)
	GetTeamByName(name string) (*model.Team, *model.AppError)
	GetTeamsUnreadForUser(userID string) ([]*model.TeamUnread, *model.AppError)
	UpdateTeam(team *model.Team) (*model.Team, *model.AppError)
	SearchTeams(term string) ([]*model.Team, *model.AppError)
	GetTeamsForUser(userID string) ([]*model.Team, *model.AppError)
	CreateTeamMember(teamID, userID string) (*model.TeamMember, *model.AppError)
	CreateTeamMembers(teamID string, userIds []string, requestorId string) ([]*model.TeamMember, *model.AppError)
	CreateTeamMembersGracefully(teamID string, userIds []string, requestorId string) ([]*model.TeamMemberWithError, *model.AppError)
	DeleteTeamMember(teamID, userID, requestorId string) *model.AppError
	GetTeamMembers(teamID string, page, perPage int) ([]*model.TeamMember, *model.AppError)
	GetTeamMember(teamID, userID string) (*model.TeamMember, *model.AppError)
	GetTeamMembersForUser(userID string, page int, perPage int) ([]*model.TeamMember, *model.AppError)
	UpdateTeamMemberRoles(teamID, userID, newRoles string) (*model.TeamMember, *model.AppError)
	CreateChannel(channel *model.Channel) (*model.Channel, *model.AppError)
	DeleteChannel(channelId string) *model.AppError
	GetPublicChannelsForTeam(teamID string, page, perPage int) ([]*model.Channel, *model.AppError)
	GetChannel(channelId string) (*model.Channel, *model.AppError)
	GetChannelByName(teamID, name string, includeDeleted bool) (*model.Channel, *model.AppError)
	GetChannelByNameForTeamName(teamName, channelName string, includeDeleted bool) (*model.Channel, *model.AppError)
	GetChannelsForTeamForUser(teamID, userID string, includeDeleted bool) ([]*model.Channel, *model.AppError)
	GetChannelStats(channelId string) (*model.ChannelStats, *model.AppError)
	GetDirectChannel(userId1, userId2 string) (*model.Channel, *model.AppError)
	GetGroupChannel(userIds []string) (*model.Channel, *model.AppError)
	UpdateChannel(channel *model.Channel) (*model.Channel, *model.AppError)
	SearchChannels(teamID string, term string) ([]*model.Channel, *model.AppError)
	CreateChannelSidebarCategory(userID, teamID string, newCategory *model.SidebarCategoryWithChannels) (*model.SidebarCategoryWithChannels, *model.AppError)
	GetChannelSidebarCategories(userID, teamID string) (*model.OrderedSidebarCategories, *model.AppError)
	UpdateChannelSidebarCategories(userID, teamID string, categories []*model.SidebarCategoryWithChannels) ([]*model.SidebarCategoryWithChannels, *model.AppError)
	SearchUsers(search *model.UserSearch) ([]*model.User, *model.AppError)
	SearchPostsInTeam(teamID string, paramsList []*model.SearchParams) ([]*model.Post, *model.AppError)
	SearchPostsInTeamForUser(teamID string, userID string, searchParams model.SearchParameter) (*model.PostSearchResults, *model.AppError)
	AddChannelMember(channelId, userID string) (*model.ChannelMember, *model.AppError)
	AddUserToChannel(channelId, userID, asUserId string) (*model.ChannelMember, *model.AppError)
	GetChannelMember(channelId, userID string) (*model.ChannelMember, *model.AppError)
	GetChannelMembers(channelId string, page, perPage int) (model.ChannelMembers, *model.AppError)
	GetChannelMembersByIds(channelId string, userIds []string) (model.ChannelMembers, *model.AppError)
	GetChannelMembersForUser(teamID, userID string, page, perPage int) ([]*model.ChannelMember, *model.AppError)
	UpdateChannelMemberRoles(channelId, userID, newRoles string) (*model.ChannelMember, *model.AppError)
	UpdateChannelMemberNotifications(channelId, userID string, notifications map[string]string) (*model.ChannelMember, *model.AppError)
	PatchChannelMembersNotifications(members []*model.ChannelMemberIdentifier, notifyProps map[string]string) *model.AppError
	GetGroup(groupId string) (*model.Group, *model.AppError)
	GetGroupByName(name string) (*model.Group, *model.AppError)
	GetGroupMemberUsers(groupID string, page, perPage int) ([]*model.User, *model.AppError)
	GetGroupsBySource(groupSource model.GroupSource) ([]*model.Group, *model.AppError)
	GetGroupsForUser(userID string) ([]*model.Group, *model.AppError)
	DeleteChannelMember(channelId, userID string) *model.AppError
	CreatePost(post *model.Post) (*model.Post, *model.AppError)
	AddReaction(reaction *model.Reaction) (*model.Reaction, *model.AppError)
	RemoveReaction(reaction *model.Reaction) *model.AppError
	GetReactions(postId string) ([]*model.Reaction, *model.AppError)
	SendEphemeralPost(userID string, post *model.Post) *model.Post
	UpdateEphemeralPost(userID string, post *model.Post) *model.Post
	DeleteEphemeralPost(userID, postId string)
	DeletePost(postId string) *model.AppError
	GetPostThread(postId string) (*model.PostList, *model.AppError)
	GetPost(postId string) (*model.Post, *model.AppError)
	GetPostsSince(channelId string, time int64) (*model.PostList, *model.AppError)
	GetPostsAfter(channelId, postId string, page, perPage int) (*model.PostList, *model.AppError)
	GetPostsBefore(channelId, postId string, page, perPage int) (*model.PostList, *model.AppError)
	GetPostsForChannel(channelId string, page, perPage int) (*model.PostList, *model.AppError)
	GetTeamStats(teamID string) (*model.TeamStats, *model.AppError)
	UpdatePost(post *model.Post) (*model.Post, *model.AppError)
	GetProfileImage(userID string) ([]byte, *model.AppError)
	SetProfileImage(userID string, data []byte) *model.AppError
	GetEmojiList(sortBy string, page, perPage int) ([]*model.Emoji, *model.AppError)
	GetEmojiByName(name string) (*model.Emoji, *model.AppError)
	GetEmoji(emojiId string) (*model.Emoji, *model.AppError)
	CopyFileInfos(userID string, fileIds []string) ([]string, *model.AppError)
	GetFileInfo(fileId string) (*model.FileInfo, *model.AppError)
	SetFileSearchableContent(fileID string, content string) *model.AppError
	GetFileInfos(page, perPage int, opt *model.GetFileInfosOptions) ([]*model.FileInfo, *model.AppError)
	GetFile(fileId string) ([]byte, *model.AppError)
	GetFileLink(fileId string) (string, *model.AppError)
	ReadFile(path string) ([]byte, *model.AppError)
	GetEmojiImage(emojiId string) ([]byte, string, *model.AppError)
	UploadFile(data []byte, channelId string, filename string) (*model.FileInfo, *model.AppError)
	OpenInteractiveDialog(dialog model.OpenDialogRequest) *model.AppError
	SendToastMessage(userID, connectionID, message string, options model.SendToastMessageOptions) *model.AppError
	GetPlugins() ([]*model.Manifest, *model.AppError)
	EnablePlugin(id string) *model.AppError
	DisablePlugin(id string) *model.AppError
	RemovePlugin(id string) *model.AppError
	GetPluginStatus(id string) (*model.PluginStatus, *model.AppError)
	InstallPlugin(file io.Reader, replace bool) (*model.Manifest, *model.AppError)
	KVSet(key string, value []byte) *model.AppError
	KVCompareAndSet(key string, oldValue, newValue []byte) (bool, *model.AppError)
	KVCompareAndDelete(key string, oldValue []byte) (bool, *model.AppError)
	KVSetWithOptions(key string, value []byte, options model.PluginKVSetOptions) (bool, *model.AppError)
	KVSetWithExpiry(key string, value []byte, expireInSeconds int64) *model.AppError
	KVGet(key string) ([]byte, *model.AppError)
	KVDelete(key string) *model.AppError
	KVDeleteAll() *model.AppError
	KVList(page, perPage int) ([]string, *model.AppError)
	PublishWebSocketEvent(event string, payload map[string]any, broadcast *model.WebsocketBroadcast)
	HasPermissionTo(userID string, permission *model.Permission) bool
	HasPermissionToTeam(userID, teamID string, permission *model.Permission) bool
	HasPermissionToChannel(userID, channelId string, permission *model.Permission) bool
	RolesGrantPermission(roleNames []string, permissionId string) bool
	LogDebug(msg string, keyValuePairs ...any)
	LogInfo(msg string, keyValuePairs ...any)
	LogError(msg string, keyValuePairs ...any)
	LogWarn(msg string, keyValuePairs ...any)
	SendMail(to, subject, htmlBody string) *model.AppError
	CreateBot(bot *model.Bot) (*model.Bot, *model.AppError)
	PatchBot(botUserId string, botPatch *model.BotPatch) (*model.Bot, *model.AppError)
	GetBot(botUserId string, includeDeleted bool) (*model.Bot, *model.AppError)
	GetBots(options *model.BotGetOptions) ([]*model.Bot, *model.AppError)
	UpdateBotActive(botUserId string, active bool) (*model.Bot, *model.AppError)
	PermanentDeleteBot(botUserId string) *model.AppError
	PluginHTTP(request *http.Request) *http.Response
	PublishUserTyping(userID, channelId, parentId string) *model.AppError
	CreateCommand(cmd *model.Command) (*model.Command, error)
	ListCommands(teamID string) ([]*model.Command, error)
	ListCustomCommands(teamID string) ([]*model.Command, error)
	ListPluginCommands(teamID string) ([]*model.Command, error)
	ListBuiltInCommands() ([]*model.Command, error)
	GetCommand(commandID string) (*model.Command, error)
	UpdateCommand(commandID string, updatedCmd *model.Command) (*model.Command, error)
	DeleteCommand(commandID string) error
	CreateOAuthApp(app *model.OAuthApp) (*model.OAuthApp, *model.AppError)
	GetOAuthApp(appID string) (*model.OAuthApp, *model.AppError)
	UpdateOAuthApp(app *model.OAuthApp) (*model.OAuthApp, *model.AppError)
	DeleteOAuthApp(appID string) *model.AppError
	PublishPluginClusterEvent(ev model.PluginClusterEvent, opts model.PluginClusterEventSendOptions) error
	RequestTrialLicense(requesterID string, users int, termsAccepted bool, receiveEmailsAccepted bool) *model.AppError
	GetCloudLimits() (*model.ProductLimits, error)
	EnsureBotUser(bot *model.Bot) (string, error)
	RegisterCollectionAndTopic(collectionType, topicType string) error
	CreateUploadSession(us *model.UploadSession) (*model.UploadSession, error)
	UploadData(us *model.UploadSession, rd io.Reader) (*model.FileInfo, error)
	GetUploadSession(uploadID string) (*model.UploadSession, error)
	SendPushNotification(notification *model.PushNotification, userID string) *model.AppError
	UpdateUserAuth(userID string, userAuth *model.UserAuth) (*model.UserAuth, *model.AppError)
	RegisterPluginForSharedChannels(opts model.RegisterPluginOpts) (remoteID string, err error)
	UnregisterPluginForSharedChannels(pluginID string) error
	ShareChannel(sc *model.SharedChannel) (*model.SharedChannel, error)
	UpdateSharedChannel(sc *model.SharedChannel) (*model.SharedChannel, error)
	UnshareChannel(channelID string) (unshared bool, err error)
	UpdateSharedChannelCursor(channelID, remoteID string, cusror model.GetPostsSinceForSyncCursor) error
	SyncSharedChannel(channelID string) error
	InviteRemoteToChannel(channelID string, remoteID string, userID string, shareIfNotShared bool) error
	UninviteRemoteFromChannel(channelID string, remoteID string) error
	UpsertGroupMember(groupID string, userID string) (*model.GroupMember, *model.AppError)
	UpsertGroupMembers(groupID string, userIDs []string) ([]*model.GroupMember, *model.AppError)
	GetGroupByRemoteID(remoteID string, groupSource model.GroupSource) (*model.Group, *model.AppError)
	CreateGroup(group *model.Group) (*model.Group, *model.AppError)
	UpdateGroup(group *model.Group) (*model.Group, *model.AppError)
	DeleteGroup(groupID string) (*model.Group, *model.AppError)
	RestoreGroup(groupID string) (*model.Group, *model.AppError)
	DeleteGroupMember(groupID string, userID string) (*model.GroupMember, *model.AppError)
	GetGroupSyncable(groupID string, syncableID string, syncableType model.GroupSyncableType) (*model.GroupSyncable, *model.AppError)
	GetGroupSyncables(groupID string, syncableType model.GroupSyncableType) ([]*model.GroupSyncable, *model.AppError)
	UpsertGroupSyncable(groupSyncable *model.GroupSyncable) (*model.GroupSyncable, *model.AppError)
	UpdateGroupSyncable(groupSyncable *model.GroupSyncable) (*model.GroupSyncable, *model.AppError)
	DeleteGroupSyncable(groupID string, syncableID string, syncableType model.GroupSyncableType) (*model.GroupSyncable, *model.AppError)
	UpdateUserRoles(userID, newRoles string) (*model.User, *model.AppError)
	GetPluginID() string
	GetGroups(page, perPage int, opts model.GroupSearchOpts, viewRestrictions *model.ViewUsersRestrictions) ([]*model.Group, *model.AppError)
	CreateDefaultSyncableMemberships(params model.CreateDefaultMembershipParams) *model.AppError
	DeleteGroupConstrainedMemberships() *model.AppError
	CreatePropertyField(field *model.PropertyField) (*model.PropertyField, error)
	GetPropertyField(groupID, fieldID string) (*model.PropertyField, error)
	GetPropertyFields(groupID string, ids []string) ([]*model.PropertyField, error)
	UpdatePropertyField(groupID string, field *model.PropertyField) (*model.PropertyField, error)
	DeletePropertyField(groupID, fieldID string) error
	SearchPropertyFields(groupID string, opts model.PropertyFieldSearchOpts) ([]*model.PropertyField, error)
	CountPropertyFields(groupID string, includeDeleted bool) (int64, error)
	CountPropertyFieldsForTarget(groupID, targetType, targetID string, includeDeleted bool) (int64, error)
	CreatePropertyValue(value *model.PropertyValue) (*model.PropertyValue, error)
	GetPropertyValue(groupID, valueID string) (*model.PropertyValue, error)
	GetPropertyValues(groupID string, ids []string) ([]*model.PropertyValue, error)
	UpdatePropertyValue(groupID string, value *model.PropertyValue) (*model.PropertyValue, error)
	UpsertPropertyValue(value *model.PropertyValue) (*model.PropertyValue, error)
	DeletePropertyValue(groupID, valueID string) error
	SearchPropertyValues(groupID string, opts model.PropertyValueSearchOpts) ([]*model.PropertyValue, error)
	RegisterPropertyGroup(name string) (*model.PropertyGroup, error)
	GetPropertyGroup(name string) (*model.PropertyGroup, error)
	GetPropertyFieldByName(groupID, targetID, name string) (*model.PropertyField, error)
	UpdatePropertyFields(groupID string, fields []*model.PropertyField) ([]*model.PropertyField, error)
	UpdatePropertyValues(groupID string, values []*model.PropertyValue) ([]*model.PropertyValue, error)
	UpsertPropertyValues(values []*model.PropertyValue) ([]*model.PropertyValue, error)
	DeletePropertyValuesForTarget(groupID, targetType, targetID string) error
	DeletePropertyValuesForField(groupID, fieldID string) error
	LogAuditRec(rec *model.AuditRecord)
	LogAuditRecWithLevel(rec *model.AuditRecord, level mlog.Level)
}
var handshake = plugin.HandshakeConfig{
	ProtocolVersion:  1,
	MagicCookieKey:   "MATTERMOST_PLUGIN",
	MagicCookieValue: "Securely message teams, anywhere.",
}