package api4
import (
	"net/http"
	"github.com/gorilla/mux"
	_ "github.com/mattermost/go-i18n/i18n"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/app"
	"github.com/mattermost/mattermost/server/v8/channels/manualtesting"
	"github.com/mattermost/mattermost/server/v8/channels/web"
)
type Routes struct {
	Root     *mux.Router
	APIRoot  *mux.Router
	APIRoot5 *mux.Router
	Users          *mux.Router
	User           *mux.Router
	UserByUsername *mux.Router
	UserByEmail    *mux.Router
	Bots *mux.Router
	Bot  *mux.Router
	Teams              *mux.Router
	TeamsForUser       *mux.Router
	Team               *mux.Router
	TeamForUser        *mux.Router
	UserThreads        *mux.Router
	UserThread         *mux.Router
	TeamByName         *mux.Router
	TeamMembers        *mux.Router
	TeamMember         *mux.Router
	TeamMembersForUser *mux.Router
	Channels                 *mux.Router
	Channel                  *mux.Router
	ChannelForUser           *mux.Router
	ChannelByName            *mux.Router
	ChannelByNameForTeamName *mux.Router
	ChannelsForTeam          *mux.Router
	ChannelMembers           *mux.Router
	ChannelMember            *mux.Router
	ChannelMembersForUser    *mux.Router
	ChannelModerations       *mux.Router
	ChannelCategories        *mux.Router
	ChannelBookmarks         *mux.Router
	ChannelBookmark          *mux.Router
	Posts           *mux.Router
	Post            *mux.Router
	PostsForChannel *mux.Router
	PostsForUser    *mux.Router
	PostForUser     *mux.Router
	Files *mux.Router
	File  *mux.Router
	Uploads *mux.Router
	Upload  *mux.Router
	Plugins *mux.Router
	Plugin  *mux.Router
	PublicFile *mux.Router
	Commands *mux.Router
	Command  *mux.Router
	Hooks         *mux.Router
	IncomingHooks *mux.Router
	IncomingHook  *mux.Router
	OutgoingHooks *mux.Router
	OutgoingHook  *mux.Router
	OAuth     *mux.Router
	OAuthApps *mux.Router
	OAuthApp  *mux.Router
	SAML       *mux.Router
	Compliance *mux.Router
	Cluster    *mux.Router
	Image *mux.Router
	LDAP *mux.Router
	Elasticsearch *mux.Router
	DataRetention *mux.Router
	Brand *mux.Router
	System *mux.Router
	Jobs *mux.Router
	Recaps *mux.Router
	Preferences *mux.Router
	License *mux.Router
	Public *mux.Router
	Reactions *mux.Router
	Roles   *mux.Router
	Schemes *mux.Router
	Emojis      *mux.Router
	Emoji       *mux.Router
	EmojiByName *mux.Router
	ReactionByNameForPostForUser *mux.Router
	TermsOfService *mux.Router
	Groups         *mux.Router
	Cloud *mux.Router
	Imports *mux.Router
	Import  *mux.Router
	Exports *mux.Router
	Export  *mux.Router
	RemoteCluster        *mux.Router
	SharedChannels       *mux.Router
	ChannelForRemote     *mux.Router
	SharedChannelRemotes *mux.Router
	Permissions *mux.Router
	Usage *mux.Router
	HostedCustomer *mux.Router
	Drafts *mux.Router
	IPFiltering *mux.Router
	Reports *mux.Router
	Limits *mux.Router
	OutgoingOAuthConnections *mux.Router
	OutgoingOAuthConnection  *mux.Router
	CustomProfileAttributes       *mux.Router
	CustomProfileAttributesFields *mux.Router
	CustomProfileAttributesField  *mux.Router
	CustomProfileAttributesValues *mux.Router
	AuditLogs *mux.Router
	AccessControlPolicies *mux.Router
	AccessControlPolicy   *mux.Router
	ContentFlagging *mux.Router
	Agents      *mux.Router
	LLMServices *mux.Router
}
type API struct {
	srv        *app.Server
	BaseRoutes *Routes
}
func Init(srv *app.Server) (*API, error) {
	api := &API{
		srv:        srv,
		BaseRoutes: &Routes{},
	}
	api.BaseRoutes.Root = srv.Router
	api.BaseRoutes.APIRoot = srv.Router.PathPrefix(model.APIURLSuffix).Subrouter()
	api.BaseRoutes.APIRoot5 = srv.Router.PathPrefix(model.APIURLSuffixV5).Subrouter()
	api.BaseRoutes.Users = api.BaseRoutes.APIRoot.PathPrefix("/users").Subrouter()
	api.BaseRoutes.User = api.BaseRoutes.APIRoot.PathPrefix("/users/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.UserByUsername = api.BaseRoutes.Users.PathPrefix("/username/{username:[A-Za-z0-9\\_\\-\\.]+}").Subrouter()
	api.BaseRoutes.UserByEmail = api.BaseRoutes.Users.PathPrefix("/email/{email:.+}").Subrouter()
	api.BaseRoutes.Bots = api.BaseRoutes.APIRoot.PathPrefix("/bots").Subrouter()
	api.BaseRoutes.Bot = api.BaseRoutes.APIRoot.PathPrefix("/bots/{bot_user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Teams = api.BaseRoutes.APIRoot.PathPrefix("/teams").Subrouter()
	api.BaseRoutes.TeamsForUser = api.BaseRoutes.User.PathPrefix("/teams").Subrouter()
	api.BaseRoutes.Team = api.BaseRoutes.Teams.PathPrefix("/{team_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.TeamForUser = api.BaseRoutes.TeamsForUser.PathPrefix("/{team_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.UserThreads = api.BaseRoutes.TeamForUser.PathPrefix("/threads").Subrouter()
	api.BaseRoutes.UserThread = api.BaseRoutes.TeamForUser.PathPrefix("/threads/{thread_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.TeamByName = api.BaseRoutes.Teams.PathPrefix("/name/{team_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.TeamMembers = api.BaseRoutes.Team.PathPrefix("/members").Subrouter()
	api.BaseRoutes.TeamMember = api.BaseRoutes.TeamMembers.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.TeamMembersForUser = api.BaseRoutes.User.PathPrefix("/teams/members").Subrouter()
	api.BaseRoutes.Channels = api.BaseRoutes.APIRoot.PathPrefix("/channels").Subrouter()
	api.BaseRoutes.Channel = api.BaseRoutes.Channels.PathPrefix("/{channel_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelForUser = api.BaseRoutes.User.PathPrefix("/channels/{channel_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelByName = api.BaseRoutes.Team.PathPrefix("/channels/name/{channel_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.ChannelByNameForTeamName = api.BaseRoutes.TeamByName.PathPrefix("/channels/name/{channel_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.ChannelsForTeam = api.BaseRoutes.Team.PathPrefix("/channels").Subrouter()
	api.BaseRoutes.ChannelMembers = api.BaseRoutes.Channel.PathPrefix("/members").Subrouter()
	api.BaseRoutes.ChannelMember = api.BaseRoutes.ChannelMembers.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelMembersForUser = api.BaseRoutes.User.PathPrefix("/teams/{team_id:[A-Za-z0-9]+}/channels/members").Subrouter()
	api.BaseRoutes.ChannelModerations = api.BaseRoutes.Channel.PathPrefix("/moderations").Subrouter()
	api.BaseRoutes.ChannelCategories = api.BaseRoutes.User.PathPrefix("/teams/{team_id:[A-Za-z0-9]+}/channels/categories").Subrouter()
	api.BaseRoutes.ChannelBookmarks = api.BaseRoutes.Channel.PathPrefix("/bookmarks").Subrouter()
	api.BaseRoutes.ChannelBookmark = api.BaseRoutes.ChannelBookmarks.PathPrefix("/{bookmark_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Posts = api.BaseRoutes.APIRoot.PathPrefix("/posts").Subrouter()
	api.BaseRoutes.Post = api.BaseRoutes.Posts.PathPrefix("/{post_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.PostsForChannel = api.BaseRoutes.Channel.PathPrefix("/posts").Subrouter()
	api.BaseRoutes.PostsForUser = api.BaseRoutes.User.PathPrefix("/posts").Subrouter()
	api.BaseRoutes.PostForUser = api.BaseRoutes.PostsForUser.PathPrefix("/{post_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Files = api.BaseRoutes.APIRoot.PathPrefix("/files").Subrouter()
	api.BaseRoutes.File = api.BaseRoutes.Files.PathPrefix("/{file_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.PublicFile = api.BaseRoutes.Root.PathPrefix("/files/{file_id:[A-Za-z0-9]+}/public").Subrouter()
	api.BaseRoutes.Uploads = api.BaseRoutes.APIRoot.PathPrefix("/uploads").Subrouter()
	api.BaseRoutes.Upload = api.BaseRoutes.Uploads.PathPrefix("/{upload_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Plugins = api.BaseRoutes.APIRoot.PathPrefix("/plugins").Subrouter()
	api.BaseRoutes.Plugin = api.BaseRoutes.Plugins.PathPrefix("/{plugin_id:[A-Za-z0-9\\_\\-\\.]+}").Subrouter()
	api.BaseRoutes.Commands = api.BaseRoutes.APIRoot.PathPrefix("/commands").Subrouter()
	api.BaseRoutes.Command = api.BaseRoutes.Commands.PathPrefix("/{command_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Hooks = api.BaseRoutes.APIRoot.PathPrefix("/hooks").Subrouter()
	api.BaseRoutes.IncomingHooks = api.BaseRoutes.Hooks.PathPrefix("/incoming").Subrouter()
	api.BaseRoutes.IncomingHook = api.BaseRoutes.IncomingHooks.PathPrefix("/{hook_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.OutgoingHooks = api.BaseRoutes.Hooks.PathPrefix("/outgoing").Subrouter()
	api.BaseRoutes.OutgoingHook = api.BaseRoutes.OutgoingHooks.PathPrefix("/{hook_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.SAML = api.BaseRoutes.APIRoot.PathPrefix("/saml").Subrouter()
	api.BaseRoutes.OAuth = api.BaseRoutes.APIRoot.PathPrefix("/oauth").Subrouter()
	api.BaseRoutes.OAuthApps = api.BaseRoutes.OAuth.PathPrefix("/apps").Subrouter()
	api.BaseRoutes.OAuthApp = api.BaseRoutes.OAuthApps.PathPrefix("/{app_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Compliance = api.BaseRoutes.APIRoot.PathPrefix("/compliance").Subrouter()
	api.BaseRoutes.Cluster = api.BaseRoutes.APIRoot.PathPrefix("/cluster").Subrouter()
	api.BaseRoutes.LDAP = api.BaseRoutes.APIRoot.PathPrefix("/ldap").Subrouter()
	api.BaseRoutes.Brand = api.BaseRoutes.APIRoot.PathPrefix("/brand").Subrouter()
	api.BaseRoutes.System = api.BaseRoutes.APIRoot.PathPrefix("/system").Subrouter()
	api.BaseRoutes.Preferences = api.BaseRoutes.User.PathPrefix("/preferences").Subrouter()
	api.BaseRoutes.License = api.BaseRoutes.APIRoot.PathPrefix("/license").Subrouter()
	api.BaseRoutes.Public = api.BaseRoutes.APIRoot.PathPrefix("/public").Subrouter()
	api.BaseRoutes.Reactions = api.BaseRoutes.APIRoot.PathPrefix("/reactions").Subrouter()
	api.BaseRoutes.Jobs = api.BaseRoutes.APIRoot.PathPrefix("/jobs").Subrouter()
	api.BaseRoutes.Recaps = api.BaseRoutes.APIRoot.PathPrefix("/recaps").Subrouter()
	api.BaseRoutes.Elasticsearch = api.BaseRoutes.APIRoot.PathPrefix("/elasticsearch").Subrouter()
	api.BaseRoutes.DataRetention = api.BaseRoutes.APIRoot.PathPrefix("/data_retention").Subrouter()
	api.BaseRoutes.Emojis = api.BaseRoutes.APIRoot.PathPrefix("/emoji").Subrouter()
	api.BaseRoutes.Emoji = api.BaseRoutes.APIRoot.PathPrefix("/emoji/{emoji_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.EmojiByName = api.BaseRoutes.Emojis.PathPrefix("/name/{emoji_name:[A-Za-z0-9\\_\\-\\+]+}").Subrouter()
	api.BaseRoutes.ReactionByNameForPostForUser = api.BaseRoutes.PostForUser.PathPrefix("/reactions/{emoji_name:[A-Za-z0-9\\_\\-\\+]+}").Subrouter()
	api.BaseRoutes.Roles = api.BaseRoutes.APIRoot.PathPrefix("/roles").Subrouter()
	api.BaseRoutes.Schemes = api.BaseRoutes.APIRoot.PathPrefix("/schemes").Subrouter()
	api.BaseRoutes.Image = api.BaseRoutes.APIRoot.PathPrefix("/image").Subrouter()
	api.BaseRoutes.TermsOfService = api.BaseRoutes.APIRoot.PathPrefix("/terms_of_service").Subrouter()
	api.BaseRoutes.Groups = api.BaseRoutes.APIRoot.PathPrefix("/groups").Subrouter()
	api.BaseRoutes.Cloud = api.BaseRoutes.APIRoot.PathPrefix("/cloud").Subrouter()
	api.BaseRoutes.Imports = api.BaseRoutes.APIRoot.PathPrefix("/imports").Subrouter()
	api.BaseRoutes.Import = api.BaseRoutes.Imports.PathPrefix("/{import_name:.+\\.zip}").Subrouter()
	api.BaseRoutes.Exports = api.BaseRoutes.APIRoot.PathPrefix("/exports").Subrouter()
	api.BaseRoutes.Export = api.BaseRoutes.Exports.PathPrefix("/{export_name:.+\\.zip}").Subrouter()
	api.BaseRoutes.RemoteCluster = api.BaseRoutes.APIRoot.PathPrefix("/remotecluster").Subrouter()
	api.BaseRoutes.SharedChannels = api.BaseRoutes.APIRoot.PathPrefix("/sharedchannels").Subrouter()
	api.BaseRoutes.SharedChannelRemotes = api.BaseRoutes.RemoteCluster.PathPrefix("/{remote_id:[A-Za-z0-9]+}/sharedchannelremotes").Subrouter()
	api.BaseRoutes.ChannelForRemote = api.BaseRoutes.RemoteCluster.PathPrefix("/{remote_id:[A-Za-z0-9]+}/channels/{channel_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Permissions = api.BaseRoutes.APIRoot.PathPrefix("/permissions").Subrouter()
	api.BaseRoutes.Usage = api.BaseRoutes.APIRoot.PathPrefix("/usage").Subrouter()
	api.BaseRoutes.HostedCustomer = api.BaseRoutes.APIRoot.PathPrefix("/hosted_customer").Subrouter()
	api.BaseRoutes.Drafts = api.BaseRoutes.APIRoot.PathPrefix("/drafts").Subrouter()
	api.BaseRoutes.IPFiltering = api.BaseRoutes.APIRoot.PathPrefix("/ip_filtering").Subrouter()
	api.BaseRoutes.Reports = api.BaseRoutes.APIRoot.PathPrefix("/reports").Subrouter()
	api.BaseRoutes.Limits = api.BaseRoutes.APIRoot.PathPrefix("/limits").Subrouter()
	api.BaseRoutes.OutgoingOAuthConnections = api.BaseRoutes.APIRoot.PathPrefix("/oauth/outgoing_connections").Subrouter()
	api.BaseRoutes.OutgoingOAuthConnection = api.BaseRoutes.OutgoingOAuthConnections.PathPrefix("/{outgoing_oauth_connection_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.CustomProfileAttributes = api.BaseRoutes.APIRoot.PathPrefix("/custom_profile_attributes").Subrouter()
	api.BaseRoutes.CustomProfileAttributesFields = api.BaseRoutes.CustomProfileAttributes.PathPrefix("/fields").Subrouter()
	api.BaseRoutes.CustomProfileAttributesField = api.BaseRoutes.CustomProfileAttributesFields.PathPrefix("/{field_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.CustomProfileAttributesValues = api.BaseRoutes.CustomProfileAttributes.PathPrefix("/values").Subrouter()
	api.BaseRoutes.AuditLogs = api.BaseRoutes.APIRoot.PathPrefix("/audit_logs").Subrouter()
	api.BaseRoutes.AccessControlPolicies = api.BaseRoutes.APIRoot.PathPrefix("/access_control_policies").Subrouter()
	api.BaseRoutes.AccessControlPolicy = api.BaseRoutes.APIRoot.PathPrefix("/access_control_policies/{policy_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ContentFlagging = api.BaseRoutes.APIRoot.PathPrefix("/content_flagging").Subrouter()
	api.BaseRoutes.Agents = api.BaseRoutes.APIRoot.PathPrefix("/agents").Subrouter()
	api.BaseRoutes.LLMServices = api.BaseRoutes.APIRoot.PathPrefix("/llmservices").Subrouter()
	api.InitUser()
	api.InitBot()
	api.InitTeam()
	api.InitChannel()
	api.InitPost()
	api.InitFile()
	api.InitUpload()
	api.InitSystem()
	api.InitLicense()
	api.InitConfig()
	api.InitWebhook()
	api.InitPreference()
	api.InitSaml()
	api.InitCompliance()
	api.InitCluster()
	api.InitLdap()
	api.InitElasticsearch()
	api.InitDataRetention()
	api.InitBrand()
	api.InitJob()
	api.InitRecap()
	api.InitCommand()
	api.InitStatus()
	api.InitWebSocket()
	api.InitEmoji()
	api.InitOAuth()
	api.InitReaction()
	api.InitPlugin()
	api.InitRole()
	api.InitScheme()
	api.InitImage()
	api.InitTermsOfService()
	api.InitGroup()
	api.InitAction()
	api.InitCloud()
	api.InitImport()
	api.InitRemoteCluster()
	api.InitSharedChannels()
	api.InitPermissions()
	api.InitExport()
	api.InitUsage()
	api.InitHostedCustomer()
	api.InitDrafts()
	api.InitIPFiltering()
	api.InitChannelBookmarks()
	api.InitReports()
	api.InitLimits()
	api.InitOutgoingOAuthConnection()
	api.InitClientPerformanceMetrics()
	api.InitScheduledPost()
	api.InitCustomProfileAttributes()
	api.InitAuditLogging()
	api.InitAccessControlPolicy()
	api.InitContentFlagging()
	api.InitAgents()
	if *srv.Config().ServiceSettings.EnableTesting {
		api.BaseRoutes.Root.Handle("/manualtest", api.APIHandler(manualtesting.ManualTest)).Methods(http.MethodGet)
	}
	srv.Router.Handle("/api/v4/{anything:.*}", http.HandlerFunc(api.Handle404))
	InitLocal(srv)
	return api, nil
}
func InitLocal(srv *app.Server) *API {
	api := &API{
		srv:        srv,
		BaseRoutes: &Routes{},
	}
	api.BaseRoutes.Root = srv.LocalRouter
	api.BaseRoutes.APIRoot = srv.LocalRouter.PathPrefix(model.APIURLSuffix).Subrouter()
	api.BaseRoutes.Users = api.BaseRoutes.APIRoot.PathPrefix("/users").Subrouter()
	api.BaseRoutes.User = api.BaseRoutes.Users.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.UserByUsername = api.BaseRoutes.Users.PathPrefix("/username/{username:[A-Za-z0-9\\_\\-\\.]+}").Subrouter()
	api.BaseRoutes.UserByEmail = api.BaseRoutes.Users.PathPrefix("/email/{email:.+}").Subrouter()
	api.BaseRoutes.Bots = api.BaseRoutes.APIRoot.PathPrefix("/bots").Subrouter()
	api.BaseRoutes.Bot = api.BaseRoutes.APIRoot.PathPrefix("/bots/{bot_user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Teams = api.BaseRoutes.APIRoot.PathPrefix("/teams").Subrouter()
	api.BaseRoutes.Team = api.BaseRoutes.Teams.PathPrefix("/{team_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.TeamByName = api.BaseRoutes.Teams.PathPrefix("/name/{team_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.TeamMembers = api.BaseRoutes.Team.PathPrefix("/members").Subrouter()
	api.BaseRoutes.TeamMember = api.BaseRoutes.TeamMembers.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Channels = api.BaseRoutes.APIRoot.PathPrefix("/channels").Subrouter()
	api.BaseRoutes.Channel = api.BaseRoutes.Channels.PathPrefix("/{channel_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelByName = api.BaseRoutes.Team.PathPrefix("/channels/name/{channel_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.ChannelByNameForTeamName = api.BaseRoutes.TeamByName.PathPrefix("/channels/name/{channel_name:[A-Za-z0-9_-]+}").Subrouter()
	api.BaseRoutes.ChannelsForTeam = api.BaseRoutes.Team.PathPrefix("/channels").Subrouter()
	api.BaseRoutes.ChannelMembers = api.BaseRoutes.Channel.PathPrefix("/members").Subrouter()
	api.BaseRoutes.ChannelMember = api.BaseRoutes.ChannelMembers.PathPrefix("/{user_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.ChannelMembersForUser = api.BaseRoutes.User.PathPrefix("/teams/{team_id:[A-Za-z0-9]+}/channels/members").Subrouter()
	api.BaseRoutes.Plugins = api.BaseRoutes.APIRoot.PathPrefix("/plugins").Subrouter()
	api.BaseRoutes.Plugin = api.BaseRoutes.Plugins.PathPrefix("/{plugin_id:[A-Za-z0-9\\_\\-\\.]+}").Subrouter()
	api.BaseRoutes.Commands = api.BaseRoutes.APIRoot.PathPrefix("/commands").Subrouter()
	api.BaseRoutes.Command = api.BaseRoutes.Commands.PathPrefix("/{command_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Hooks = api.BaseRoutes.APIRoot.PathPrefix("/hooks").Subrouter()
	api.BaseRoutes.IncomingHooks = api.BaseRoutes.Hooks.PathPrefix("/incoming").Subrouter()
	api.BaseRoutes.IncomingHook = api.BaseRoutes.IncomingHooks.PathPrefix("/{hook_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.OutgoingHooks = api.BaseRoutes.Hooks.PathPrefix("/outgoing").Subrouter()
	api.BaseRoutes.OutgoingHook = api.BaseRoutes.OutgoingHooks.PathPrefix("/{hook_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.License = api.BaseRoutes.APIRoot.PathPrefix("/license").Subrouter()
	api.BaseRoutes.Groups = api.BaseRoutes.APIRoot.PathPrefix("/groups").Subrouter()
	api.BaseRoutes.LDAP = api.BaseRoutes.APIRoot.PathPrefix("/ldap").Subrouter()
	api.BaseRoutes.System = api.BaseRoutes.APIRoot.PathPrefix("/system").Subrouter()
	api.BaseRoutes.Preferences = api.BaseRoutes.User.PathPrefix("/preferences").Subrouter()
	api.BaseRoutes.Posts = api.BaseRoutes.APIRoot.PathPrefix("/posts").Subrouter()
	api.BaseRoutes.Post = api.BaseRoutes.Posts.PathPrefix("/{post_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.PostsForChannel = api.BaseRoutes.Channel.PathPrefix("/posts").Subrouter()
	api.BaseRoutes.Roles = api.BaseRoutes.APIRoot.PathPrefix("/roles").Subrouter()
	api.BaseRoutes.Uploads = api.BaseRoutes.APIRoot.PathPrefix("/uploads").Subrouter()
	api.BaseRoutes.Upload = api.BaseRoutes.Uploads.PathPrefix("/{upload_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.Imports = api.BaseRoutes.APIRoot.PathPrefix("/imports").Subrouter()
	api.BaseRoutes.Import = api.BaseRoutes.Imports.PathPrefix("/{import_name:.+\\.zip}").Subrouter()
	api.BaseRoutes.Exports = api.BaseRoutes.APIRoot.PathPrefix("/exports").Subrouter()
	api.BaseRoutes.Export = api.BaseRoutes.Exports.PathPrefix("/{export_name:.+\\.zip}").Subrouter()
	api.BaseRoutes.Jobs = api.BaseRoutes.APIRoot.PathPrefix("/jobs").Subrouter()
	api.BaseRoutes.SAML = api.BaseRoutes.APIRoot.PathPrefix("/saml").Subrouter()
	api.BaseRoutes.CustomProfileAttributes = api.BaseRoutes.APIRoot.PathPrefix("/custom_profile_attributes").Subrouter()
	api.BaseRoutes.CustomProfileAttributesFields = api.BaseRoutes.CustomProfileAttributes.PathPrefix("/fields").Subrouter()
	api.BaseRoutes.CustomProfileAttributesField = api.BaseRoutes.CustomProfileAttributesFields.PathPrefix("/{field_id:[A-Za-z0-9]+}").Subrouter()
	api.BaseRoutes.CustomProfileAttributesValues = api.BaseRoutes.CustomProfileAttributes.PathPrefix("/values").Subrouter()
	api.BaseRoutes.AccessControlPolicies = api.BaseRoutes.APIRoot.PathPrefix("/access_control_policies").Subrouter()
	api.BaseRoutes.AccessControlPolicy = api.BaseRoutes.APIRoot.PathPrefix("/access_control_policies/{policy_id:[A-Za-z0-9]+}").Subrouter()
	api.InitUserLocal()
	api.InitTeamLocal()
	api.InitChannelLocal()
	api.InitConfigLocal()
	api.InitWebhookLocal()
	api.InitPluginLocal()
	api.InitCommandLocal()
	api.InitLicenseLocal()
	api.InitBotLocal()
	api.InitGroupLocal()
	api.InitLdapLocal()
	api.InitSystemLocal()
	api.InitPostLocal()
	api.InitPreferenceLocal()
	api.InitRoleLocal()
	api.InitUploadLocal()
	api.InitImportLocal()
	api.InitExportLocal()
	api.InitJobLocal()
	api.InitSamlLocal()
	api.InitCustomProfileAttributesLocal()
	api.InitAccessControlPolicyLocal()
	srv.LocalRouter.Handle("/api/v4/{anything:.*}", http.HandlerFunc(api.Handle404))
	return api
}
func (api *API) Handle404(w http.ResponseWriter, r *http.Request) {
	app := app.New(app.ServerConnector(api.srv.Channels()))
	web.Handle404(app, w, r)
}
var ReturnStatusOK = web.ReturnStatusOK