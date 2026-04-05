package model
import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)
const (
	HeaderRequestId                 = "X-Request-ID"
	HeaderVersionId                 = "X-Version-ID"
	HeaderClusterId                 = "X-Cluster-ID"
	HeaderEtagServer                = "ETag"
	HeaderEtagClient                = "If-None-Match"
	HeaderForwarded                 = "X-Forwarded-For"
	HeaderRealIP                    = "X-Real-IP"
	HeaderForwardedProto            = "X-Forwarded-Proto"
	HeaderToken                     = "token"
	HeaderCsrfToken                 = "X-CSRF-Token"
	HeaderBearer                    = "BEARER"
	HeaderAuth                      = "Authorization"
	HeaderCloudToken                = "X-Cloud-Token"
	HeaderRemoteclusterToken        = "X-RemoteCluster-Token"
	HeaderRemoteclusterId           = "X-RemoteCluster-Id"
	HeaderRequestedWith             = "X-Requested-With"
	HeaderRequestedWithXML          = "XMLHttpRequest"
	HeaderFirstInaccessiblePostTime = "First-Inaccessible-Post-Time"
	HeaderFirstInaccessibleFileTime = "First-Inaccessible-File-Time"
	HeaderRange                     = "Range"
	HeaderRejectReason              = "X-Reject-Reason"
	STATUS                          = "status"
	StatusOk                        = "OK"
	StatusFail                      = "FAIL"
	StatusUnhealthy                 = "UNHEALTHY"
	StatusRemove                    = "REMOVE"
	ConnectionId                    = "Connection-Id"
	ClientDir = "client"
	APIURLSuffixV1 = "/api/v1"
	APIURLSuffixV4 = "/api/v4"
	APIURLSuffixV5 = "/api/v5"
	APIURLSuffix   = APIURLSuffixV4
)
type Response struct {
	StatusCode    int
	RequestId     string
	Etag          string
	ServerVersion string
	Header        http.Header
}
type Client4 struct {
	URL        string
	APIURL     string
	HTTPClient *http.Client
	AuthToken  string
	AuthType   string
	HTTPHeader map[string]string
	trueString string
	falseString string
}
func (c *Client4) SetBoolString(value bool, valueStr string) {
	if value {
		c.trueString = valueStr
	} else {
		c.falseString = valueStr
	}
}
func (c *Client4) boolString(value bool) string {
	if value && c.trueString != "" {
		return c.trueString
	} else if !value && c.falseString != "" {
		return c.falseString
	}
	if value {
		return "true"
	}
	return "false"
}
func closeBody(r *http.Response) {
	if r.Body != nil {
		_, _ = io.Copy(io.Discard, r.Body)
		_ = r.Body.Close()
	}
}
func NewAPIv4Client(url string) *Client4 {
	url = strings.TrimRight(url, "/")
	return &Client4{url, url + APIURLSuffix, &http.Client{}, "", "", map[string]string{}, "", ""}
}
func NewAPIv4SocketClient(socketPath string) *Client4 {
	tr := &http.Transport{
		Dial: func(network, addr string) (net.Conn, error) {
			return net.Dial("unix", socketPath)
		},
	}
	client := NewAPIv4Client("http://_")
	client.HTTPClient = &http.Client{Transport: tr}
	return client
}
func BuildResponse(r *http.Response) *Response {
	if r == nil {
		return nil
	}
	return &Response{
		StatusCode:    r.StatusCode,
		RequestId:     r.Header.Get(HeaderRequestId),
		Etag:          r.Header.Get(HeaderEtagServer),
		ServerVersion: r.Header.Get(HeaderVersionId),
		Header:        r.Header,
	}
}
func DecodeJSONFromResponse[T any](r *http.Response) (T, *Response, error) {
	var result T
	if r.StatusCode == http.StatusNotModified {
		return result, BuildResponse(r), nil
	}
	if err := json.NewDecoder(r.Body).Decode(&result); err != nil {
		return result, BuildResponse(r), fmt.Errorf("failed to decode JSON response: %w", err)
	}
	return result, BuildResponse(r), nil
}
func ReadBytesFromResponse(r *http.Response) ([]byte, *Response, error) {
	if r.StatusCode == http.StatusNotModified {
		return nil, BuildResponse(r), nil
	}
	data, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return data, BuildResponse(r), nil
}
func (c *Client4) SetToken(token string) {
	c.AuthToken = token
	c.AuthType = HeaderBearer
}
func (c *Client4) MockSession(token string) {
	c.SetToken(token)
}
func (c *Client4) SetOAuthToken(token string) {
	c.AuthToken = token
	c.AuthType = HeaderToken
}
func (c *Client4) ClearOAuthToken() {
	c.AuthToken = ""
	c.AuthType = HeaderBearer
}
func (c *Client4) usersRoute() clientRoute {
	return newClientRoute("users")
}
func (c *Client4) reportsRoute() clientRoute {
	return newClientRoute("reports")
}
func (c *Client4) userRoute(userId string) clientRoute {
	return c.usersRoute().Join(userId)
}
func (c *Client4) userThreadsRoute(userID, teamID string) clientRoute {
	return c.userRoute(userID).Join(c.teamRoute(teamID), "threads")
}
func (c *Client4) userThreadRoute(userId, teamId, threadId string) clientRoute {
	return c.userThreadsRoute(userId, teamId).Join(threadId)
}
func (c *Client4) userCategoryRoute(userID, teamID string) clientRoute {
	return c.userRoute(userID).Join(c.teamRoute(teamID), "channels", "categories")
}
func (c *Client4) userAccessTokensRoute() clientRoute {
	return c.usersRoute().Join("tokens")
}
func (c *Client4) userAccessTokenRoute(tokenId string) clientRoute {
	return c.usersRoute().Join("tokens", tokenId)
}
func (c *Client4) userByUsernameRoute(userName string) clientRoute {
	return c.usersRoute().Join("username", userName)
}
func (c *Client4) userByEmailRoute(email string) clientRoute {
	return c.usersRoute().Join("email", email)
}
func (c *Client4) botsRoute() clientRoute {
	return newClientRoute("bots")
}
func (c *Client4) botRoute(botUserId string) clientRoute {
	return c.botsRoute().Join(botUserId)
}
func (c *Client4) teamsRoute() clientRoute {
	return newClientRoute("teams")
}
func (c *Client4) teamRoute(teamId string) clientRoute {
	return c.teamsRoute().Join(teamId)
}
func (c *Client4) teamAutoCompleteCommandsRoute(teamId string) clientRoute {
	return c.teamsRoute().Join(teamId, "commands", "autocomplete")
}
func (c *Client4) teamByNameRoute(teamName string) clientRoute {
	return c.teamsRoute().Join("name", teamName)
}
func (c *Client4) teamMemberRoute(teamId, userId string) clientRoute {
	return c.teamRoute(teamId).Join("members", userId)
}
func (c *Client4) teamMembersRoute(teamId string) clientRoute {
	return c.teamRoute(teamId).Join("members")
}
func (c *Client4) teamStatsRoute(teamId string) clientRoute {
	return c.teamRoute(teamId).Join("stats")
}
func (c *Client4) teamImportRoute(teamId string) clientRoute {
	return c.teamRoute(teamId).Join("import")
}
func (c *Client4) channelsRoute() clientRoute {
	return newClientRoute("channels")
}
func (c *Client4) channelsForTeamRoute(teamId string) clientRoute {
	return c.teamRoute(teamId).Join("channels")
}
func (c *Client4) channelRoute(channelId string) clientRoute {
	return c.channelsRoute().Join(channelId)
}
func (c *Client4) channelByNameRoute(channelName, teamId string) clientRoute {
	return c.teamRoute(teamId).Join("channels", "name", channelName)
}
func (c *Client4) channelsForTeamForUserRoute(teamId, userId string) clientRoute {
	return c.userRoute(userId).Join(c.teamRoute(teamId), "channels")
}
func (c *Client4) channelByNameForTeamNameRoute(channelName, teamName string) clientRoute {
	return c.teamByNameRoute(teamName).Join("channels", "name", channelName)
}
func (c *Client4) channelMembersRoute(channelId string) clientRoute {
	return c.channelRoute(channelId).Join("members")
}
func (c *Client4) channelMemberRoute(channelId, userId string) clientRoute {
	return c.channelMembersRoute(channelId).Join(userId)
}
func (c *Client4) postsRoute() clientRoute {
	return newClientRoute("posts")
}
func (c *Client4) contentFlaggingRoute() clientRoute {
	return newClientRoute("content_flagging")
}
func (c *Client4) postsEphemeralRoute() clientRoute {
	return newClientRoute("posts").Join("ephemeral")
}
func (c *Client4) configRoute() clientRoute {
	return newClientRoute("config")
}
func (c *Client4) licenseRoute() clientRoute {
	return newClientRoute("license")
}
func (c *Client4) postRoute(postId string) clientRoute {
	return c.postsRoute().Join(postId)
}
func (c *Client4) filesRoute() clientRoute {
	return newClientRoute("files")
}
func (c *Client4) fileRoute(fileId string) clientRoute {
	return c.filesRoute().Join(fileId)
}
func (c *Client4) uploadsRoute() clientRoute {
	return newClientRoute("uploads")
}
func (c *Client4) uploadRoute(uploadId string) clientRoute {
	return c.uploadsRoute().Join(uploadId)
}
func (c *Client4) pluginsRoute() clientRoute {
	return newClientRoute("plugins")
}
func (c *Client4) pluginRoute(pluginId string) clientRoute {
	return c.pluginsRoute().Join(pluginId)
}
func (c *Client4) systemRoute() clientRoute {
	return newClientRoute("system")
}
func (c *Client4) cloudRoute() clientRoute {
	return newClientRoute("cloud")
}
func (c *Client4) testEmailRoute() clientRoute {
	return newClientRoute("email").Join("test")
}
func (c *Client4) testNotificationRoute() clientRoute {
	return newClientRoute("notifications").Join("test")
}
func (c *Client4) usageRoute() clientRoute {
	return newClientRoute("usage")
}
func (c *Client4) testSiteURLRoute() clientRoute {
	return newClientRoute("site_url").Join("test")
}
func (c *Client4) testS3Route() clientRoute {
	return newClientRoute("file").Join("s3_test")
}
func (c *Client4) databaseRoute() clientRoute {
	return newClientRoute("database")
}
func (c *Client4) cacheRoute() clientRoute {
	return newClientRoute("caches")
}
func (c *Client4) clusterRoute() clientRoute {
	return newClientRoute("cluster")
}
func (c *Client4) incomingWebhooksRoute() clientRoute {
	return newClientRoute("hooks").Join("incoming")
}
func (c *Client4) incomingWebhookRoute(hookID string) clientRoute {
	return c.incomingWebhooksRoute().Join(hookID)
}
func (c *Client4) complianceReportsRoute() clientRoute {
	return newClientRoute("compliance").Join("reports")
}
func (c *Client4) complianceReportRoute(reportId string) clientRoute {
	return c.complianceReportsRoute().Join(reportId)
}
func (c *Client4) complianceReportDownloadRoute(reportId string) clientRoute {
	return c.complianceReportsRoute().Join(reportId, "download")
}
func (c *Client4) outgoingWebhooksRoute() clientRoute {
	return newClientRoute("hooks").Join("outgoing")
}
func (c *Client4) outgoingWebhookRoute(hookID string) clientRoute {
	return c.outgoingWebhooksRoute().Join(hookID)
}
func (c *Client4) preferencesRoute(userId string) clientRoute {
	return c.userRoute(userId).Join("preferences")
}
func (c *Client4) userStatusRoute(userId string) clientRoute {
	return c.userRoute(userId).Join("status")
}
func (c *Client4) userStatusesRoute() clientRoute {
	return c.usersRoute().Join("status")
}
func (c *Client4) samlRoute() clientRoute {
	return newClientRoute("saml")
}
func (c *Client4) ldapRoute() clientRoute {
	return newClientRoute("ldap")
}
func (c *Client4) brandRoute() clientRoute {
	return newClientRoute("brand")
}
func (c *Client4) dataRetentionRoute() clientRoute {
	return newClientRoute("data_retention")
}
func (c *Client4) dataRetentionPolicyRoute(policyID string) clientRoute {
	return c.dataRetentionRoute().Join("policies", policyID)
}
func (c *Client4) elasticsearchRoute() clientRoute {
	return newClientRoute("elasticsearch")
}
func (c *Client4) commandsRoute() clientRoute {
	return newClientRoute("commands")
}
func (c *Client4) commandRoute(commandId string) clientRoute {
	return c.commandsRoute().Join(commandId)
}
func (c *Client4) commandMoveRoute(commandId string) clientRoute {
	return c.commandsRoute().Join(commandId, "move")
}
func (c *Client4) draftsRoute() clientRoute {
	return newClientRoute("drafts")
}
func (c *Client4) emojisRoute() clientRoute {
	return newClientRoute("emoji")
}
func (c *Client4) emojiRoute(emojiId string) clientRoute {
	return c.emojisRoute().Join(emojiId)
}
func (c *Client4) emojiByNameRoute(name string) clientRoute {
	return c.emojisRoute().Join("name", name)
}
func (c *Client4) reactionsRoute() clientRoute {
	return newClientRoute("reactions")
}
func (c *Client4) oAuthRoute() clientRoute {
	return newClientRoute("oauth")
}
func (c *Client4) oAuthAppsRoute() clientRoute {
	return c.oAuthRoute().Join("apps")
}
func (c *Client4) oAuthAppRoute(appId string) clientRoute {
	return c.oAuthAppsRoute().Join(appId)
}
func (c *Client4) oAuthRegisterRoute() clientRoute {
	return c.oAuthAppsRoute().Join("register")
}
func (c *Client4) outgoingOAuthConnectionsRoute() clientRoute {
	return c.oAuthRoute().Join("outgoing_connections")
}
func (c *Client4) outgoingOAuthConnectionRoute(id string) clientRoute {
	return c.outgoingOAuthConnectionsRoute().Join(id)
}
func (c *Client4) jobsRoute() clientRoute {
	return newClientRoute("jobs")
}
func (c *Client4) rolesRoute() clientRoute {
	return newClientRoute("roles")
}
func (c *Client4) schemesRoute() clientRoute {
	return newClientRoute("schemes")
}
func (c *Client4) schemeRoute(id string) clientRoute {
	return c.schemesRoute().Join(id)
}
func (c *Client4) analyticsRoute() clientRoute {
	return newClientRoute("analytics")
}
func (c *Client4) timezonesRoute() clientRoute {
	return c.systemRoute().Join("timezones")
}
func (c *Client4) channelSchemeRoute(channelId string) clientRoute {
	return c.channelsRoute().Join(channelId, "scheme")
}
func (c *Client4) teamSchemeRoute(teamId string) clientRoute {
	return c.teamsRoute().Join(teamId, "scheme")
}
func (c *Client4) totalUsersStatsRoute() clientRoute {
	return c.usersRoute().Join("stats")
}
func (c *Client4) redirectLocationRoute() clientRoute {
	return newClientRoute("redirect_location")
}
func (c *Client4) serverBusyRoute() clientRoute {
	return newClientRoute("server_busy")
}
func (c *Client4) userTermsOfServiceRoute(userId string) clientRoute {
	return c.userRoute(userId).Join("terms_of_service")
}
func (c *Client4) termsOfServiceRoute() clientRoute {
	return newClientRoute("terms_of_service")
}
func (c *Client4) groupsRoute() clientRoute {
	return newClientRoute("groups")
}
func (c *Client4) publishUserTypingRoute(userId string) clientRoute {
	return c.userRoute(userId).Join("typing")
}
func (c *Client4) groupRoute(groupID string) clientRoute {
	return c.groupsRoute().Join(groupID)
}
func (c *Client4) groupSyncablesRoute(groupID string, syncableType GroupSyncableType) clientRoute {
	syncTypeElem := strings.ToLower(syncableType.String()) + "s"
	return c.groupRoute(groupID).Join(syncTypeElem)
}
func (c *Client4) groupSyncableRoute(groupID, syncableID string, syncableType GroupSyncableType) clientRoute {
	return c.groupSyncablesRoute(groupID, syncableType).Join(syncableID)
}
func (c *Client4) importsRoute() clientRoute {
	return newClientRoute("imports")
}
func (c *Client4) exportsRoute() clientRoute {
	return newClientRoute("exports")
}
func (c *Client4) exportRoute(name string) clientRoute {
	return c.exportsRoute().Join(name)
}
func (c *Client4) importRoute(name string) clientRoute {
	return c.importsRoute().Join(name)
}
func (c *Client4) remoteClusterRoute() clientRoute {
	return newClientRoute("remotecluster")
}
func (c *Client4) sharedChannelRemotesRoute(remoteId string) clientRoute {
	return c.remoteClusterRoute().Join(remoteId, "sharedchannelremotes")
}
func (c *Client4) channelRemoteRoute(remoteId, channelId string) clientRoute {
	return c.remoteClusterRoute().Join(remoteId, "channels", channelId)
}
func (c *Client4) sharedChannelsRoute() clientRoute {
	return newClientRoute("sharedchannels")
}
func (c *Client4) ipFiltersRoute() clientRoute {
	return newClientRoute("ip_filtering")
}
func (c *Client4) permissionsRoute() clientRoute {
	return newClientRoute("permissions")
}
func (c *Client4) limitsRoute() clientRoute {
	return newClientRoute("limits")
}
func (c *Client4) customProfileAttributesRoute() clientRoute {
	return newClientRoute("custom_profile_attributes")
}
func (c *Client4) bookmarksRoute(channelId string) clientRoute {
	return c.channelRoute(channelId).Join("bookmarks")
}
func (c *Client4) bookmarkRoute(channelId, bookmarkId string) clientRoute {
	return c.bookmarksRoute(channelId).Join(bookmarkId)
}
func (c *Client4) clientPerfMetricsRoute() clientRoute {
	return newClientRoute("client_perf")
}
func (c *Client4) userCustomProfileAttributesRoute(userID string) clientRoute {
	return c.userRoute(userID).Join("custom_profile_attributes")
}
func (c *Client4) customProfileAttributeFieldsRoute() clientRoute {
	return c.customProfileAttributesRoute().Join("fields")
}
func (c *Client4) customProfileAttributeFieldRoute(fieldID string) clientRoute {
	return c.customProfileAttributeFieldsRoute().Join(fieldID)
}
func (c *Client4) customProfileAttributeValuesRoute() clientRoute {
	return c.customProfileAttributesRoute().Join("values")
}
func (c *Client4) accessControlPoliciesRoute() clientRoute {
	return newClientRoute("access_control_policies")
}
func (c *Client4) celRoute() clientRoute {
	return c.accessControlPoliciesRoute().Join("cel")
}
func (c *Client4) accessControlPolicyRoute(policyID string) clientRoute {
	return c.accessControlPoliciesRoute().Join(url.PathEscape(policyID))
}
func (c *Client4) logsRoute() clientRoute {
	return newClientRoute("logs")
}
func (c *Client4) actionsRoute() clientRoute {
	return newClientRoute("actions")
}
func (c *Client4) dialogsRoute() clientRoute {
	return c.actionsRoute().Join("dialogs")
}
func (c *Client4) trialLicenseRoute() clientRoute {
	return newClientRoute("trial-license")
}
func (c *Client4) integrityRoute() clientRoute {
	return newClientRoute("integrity")
}
func (c *Client4) DoAPIGet(ctx context.Context, url string, etag string) (*http.Response, error) {
	return c.doAPIRequest(ctx, http.MethodGet, c.APIURL+url, "", etag)
}
func (c *Client4) DoAPIPost(ctx context.Context, url, data string) (*http.Response, error) {
	return c.doAPIRequest(ctx, http.MethodPost, c.APIURL+url, data, "")
}
func (c *Client4) DoAPIPostJSON(ctx context.Context, url string, data any) (*http.Response, error) {
	buf, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	return c.doAPIRequestBytes(ctx, http.MethodPost, c.APIURL+url, buf, "")
}
func (c *Client4) DoAPIPut(ctx context.Context, url, data string) (*http.Response, error) {
	return c.doAPIRequest(ctx, http.MethodPut, c.APIURL+url, data, "")
}
func (c *Client4) DoAPIPutJSON(ctx context.Context, url string, data any) (*http.Response, error) {
	buf, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	return c.doAPIRequestBytes(ctx, http.MethodPut, c.APIURL+url, buf, "")
}
func (c *Client4) DoAPIPatchJSON(ctx context.Context, url string, data any) (*http.Response, error) {
	buf, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	return c.doAPIRequestBytes(ctx, http.MethodPatch, c.APIURL+url, buf, "")
}
func (c *Client4) DoAPIDelete(ctx context.Context, url string) (*http.Response, error) {
	return c.doAPIRequest(ctx, http.MethodDelete, c.APIURL+url, "", "")
}
func (c *Client4) DoAPIDeleteJSON(ctx context.Context, url string, data any) (*http.Response, error) {
	buf, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	return c.doAPIRequestBytes(ctx, http.MethodDelete, c.APIURL+url, buf, "")
}
func (c *Client4) DoAPIRequestWithHeaders(ctx context.Context, method, url, data string, headers map[string]string) (*http.Response, error) {
	return c.doAPIRequestReader(ctx, method, c.APIURL+url, "", strings.NewReader(data), headers)
}
func (c *Client4) doAPIRequestWithHeadersRoute(ctx context.Context, method string, route clientRoute, data string, headers map[string]string) (*http.Response, error) {
	routePath, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.DoAPIRequestWithHeaders(ctx, method, routePath, data, headers)
}
func (c *Client4) doAPIRequest(ctx context.Context, method, url, data, etag string) (*http.Response, error) {
	return c.doAPIRequestReader(ctx, method, url, "", strings.NewReader(data), map[string]string{HeaderEtagClient: etag})
}
func (c *Client4) doAPIRequestBytes(ctx context.Context, method, url string, data []byte, etag string) (*http.Response, error) {
	return c.doAPIRequestReader(ctx, method, url, "", bytes.NewReader(data), map[string]string{HeaderEtagClient: etag})
}
func (c *Client4) doAPIGet(ctx context.Context, route clientRoute, etag string) (*http.Response, error) {
	routePath, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.DoAPIGet(ctx, routePath, etag)
}
func (c *Client4) doAPIGetWithQuery(ctx context.Context, route clientRoute, query url.Values, etag string) (*http.Response, error) {
	routeURL, err := route.URL()
	if err != nil {
		return nil, err
	}
	routeURL.RawQuery = query.Encode()
	return c.DoAPIGet(ctx, routeURL.String(), etag)
}
func (c *Client4) doAPIPostWithQuery(ctx context.Context, route clientRoute, query url.Values, data string) (*http.Response, error) {
	routeURL, err := route.URL()
	if err != nil {
		return nil, err
	}
	routeURL.RawQuery = query.Encode()
	return c.DoAPIPost(ctx, routeURL.String(), data)
}
func (c *Client4) doAPIPostJSONWithQuery(ctx context.Context, route clientRoute, query url.Values, data any) (*http.Response, error) {
	routeURL, err := route.URL()
	if err != nil {
		return nil, err
	}
	routeURL.RawQuery = query.Encode()
	return c.DoAPIPostJSON(ctx, routeURL.String(), data)
}
func (c *Client4) doAPIDeleteWithQuery(ctx context.Context, route clientRoute, query url.Values) (*http.Response, error) {
	routeURL, err := route.URL()
	if err != nil {
		return nil, err
	}
	routeURL.RawQuery = query.Encode()
	return c.DoAPIDelete(ctx, routeURL.String())
}
func (c *Client4) doAPIPost(ctx context.Context, route clientRoute, data string) (*http.Response, error) {
	routePath, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.DoAPIPost(ctx, routePath, data)
}
func (c *Client4) doAPIPostJSON(ctx context.Context, route clientRoute, data any) (*http.Response, error) {
	routePath, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.DoAPIPostJSON(ctx, routePath, data)
}
func (c *Client4) doAPIPut(ctx context.Context, route clientRoute, data string) (*http.Response, error) {
	routePath, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.DoAPIPut(ctx, routePath, data)
}
func (c *Client4) doAPIPutJSON(ctx context.Context, route clientRoute, data any) (*http.Response, error) {
	routePath, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.DoAPIPutJSON(ctx, routePath, data)
}
func (c *Client4) doAPIPatchJSON(ctx context.Context, route clientRoute, data any) (*http.Response, error) {
	routePath, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.DoAPIPatchJSON(ctx, routePath, data)
}
func (c *Client4) doAPIDelete(ctx context.Context, route clientRoute) (*http.Response, error) {
	routePath, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.DoAPIDelete(ctx, routePath)
}
func (c *Client4) doAPIDeleteJSON(ctx context.Context, route clientRoute, data any) (*http.Response, error) {
	routePath, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.DoAPIDeleteJSON(ctx, routePath, data)
}
func (c *Client4) doAPIRequestReader(ctx context.Context, method, url, contentType string, data io.Reader, headers map[string]string) (*http.Response, error) {
	rq, err := http.NewRequestWithContext(ctx, method, url, data)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		rq.Header.Set(k, v)
	}
	if c.AuthToken != "" {
		rq.Header.Set(HeaderAuth, c.AuthType+" "+c.AuthToken)
	}
	if contentType != "" {
		rq.Header.Set("Content-Type", contentType)
	}
	if len(c.HTTPHeader) > 0 {
		for k, v := range c.HTTPHeader {
			rq.Header.Set(k, v)
		}
	}
	rp, err := c.HTTPClient.Do(rq)
	if err != nil {
		return rp, err
	}
	if rp.StatusCode == 304 {
		return rp, nil
	}
	if rp.StatusCode >= 300 {
		defer closeBody(rp)
		return rp, AppErrorFromJSON(rp.Body)
	}
	return rp, nil
}
func (c *Client4) DoUploadFile(ctx context.Context, url string, data []byte, contentType string) (*FileUploadResponse, *Response, error) {
	r, err := c.doAPIRequestReader(ctx, http.MethodPost, c.APIURL+url, contentType, bytes.NewReader(data), nil)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*FileUploadResponse](r)
}
func (c *Client4) doUploadFile(ctx context.Context, route clientRoute, data []byte, contentType string) (*FileUploadResponse, *Response, error) {
	r, err := c.doAPIRequestReaderRoute(ctx, http.MethodPost, route, contentType, bytes.NewReader(data), nil)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*FileUploadResponse](r)
}
func (c *Client4) doUploadFileWithQuery(ctx context.Context, route clientRoute, query url.Values, data []byte, contentType string) (*FileUploadResponse, *Response, error) {
	routeURL, err := route.URL()
	if err != nil {
		return nil, nil, err
	}
	routeURL.RawQuery = query.Encode()
	return c.DoUploadFile(ctx, routeURL.String(), data, contentType)
}
func (c *Client4) doAPIRequestReaderRoute(ctx context.Context, method string, route clientRoute, contentType string, data io.Reader, headers map[string]string) (*http.Response, error) {
	routeStr, err := route.String()
	if err != nil {
		return nil, err
	}
	return c.doAPIRequestReader(ctx, method, c.APIURL+routeStr, contentType, data, headers)
}
func (c *Client4) LoginById(ctx context.Context, id string, password string) (*User, *Response, error) {
	m := make(map[string]string)
	m["id"] = id
	m["password"] = password
	return c.login(ctx, m)
}
func (c *Client4) Login(ctx context.Context, loginId string, password string) (*User, *Response, error) {
	m := make(map[string]string)
	m["login_id"] = loginId
	m["password"] = password
	return c.login(ctx, m)
}
func (c *Client4) LoginByLdap(ctx context.Context, loginId string, password string) (*User, *Response, error) {
	m := make(map[string]string)
	m["login_id"] = loginId
	m["password"] = password
	m["ldap_only"] = c.boolString(true)
	return c.login(ctx, m)
}
func (c *Client4) LoginWithDevice(ctx context.Context, loginId string, password string, deviceId string) (*User, *Response, error) {
	m := make(map[string]string)
	m["login_id"] = loginId
	m["password"] = password
	m["device_id"] = deviceId
	return c.login(ctx, m)
}
func (c *Client4) LoginWithMFA(ctx context.Context, loginId, password, mfaToken string) (*User, *Response, error) {
	m := make(map[string]string)
	m["login_id"] = loginId
	m["password"] = password
	m["token"] = mfaToken
	return c.login(ctx, m)
}
func (c *Client4) login(ctx context.Context, m map[string]string) (*User, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("login"), m)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	c.AuthToken = r.Header.Get(HeaderToken)
	c.AuthType = HeaderBearer
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) LoginWithDesktopToken(ctx context.Context, token, deviceId string) (*User, *Response, error) {
	m := make(map[string]string)
	m["token"] = token
	m["deviceId"] = deviceId
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("login", "desktop_token"), m)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	c.AuthToken = r.Header.Get(HeaderToken)
	c.AuthType = HeaderBearer
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) LoginType(ctx context.Context, loginId string) (*LoginTypeResponse, *Response, error) {
	m := make(map[string]string)
	m["login_id"] = loginId
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("login", "type"), m)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*LoginTypeResponse](r)
}
func (c *Client4) Logout(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.usersRoute().Join("logout"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	c.AuthToken = ""
	c.AuthType = HeaderBearer
	return BuildResponse(r), nil
}
func (c *Client4) SwitchAccountType(ctx context.Context, switchRequest *SwitchRequest) (string, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("login", "switch"), switchRequest)
	if err != nil {
		return "", BuildResponse(r), err
	}
	defer closeBody(r)
	result, resp, err := DecodeJSONFromResponse[map[string]string](r)
	if err != nil {
		return "", resp, err
	}
	return result["follow_link"], resp, nil
}
func (c *Client4) CreateUser(ctx context.Context, user *User) (*User, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute(), user)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) CreateUserWithToken(ctx context.Context, user *User, tokenId string) (*User, *Response, error) {
	if tokenId == "" {
		return nil, nil, errors.New("token ID is required")
	}
	values := url.Values{}
	values.Set("t", tokenId)
	r, err := c.doAPIPostJSONWithQuery(ctx, c.usersRoute(), values, user)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) CreateUserWithInviteId(ctx context.Context, user *User, inviteId string) (*User, *Response, error) {
	if inviteId == "" {
		return nil, nil, errors.New("invite ID is required")
	}
	values := url.Values{}
	values.Set("iid", inviteId)
	r, err := c.doAPIPostJSONWithQuery(ctx, c.usersRoute(), values, user)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) GetMe(ctx context.Context, etag string) (*User, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(Me), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) GetUser(ctx context.Context, userId, etag string) (*User, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) GetUserByUsername(ctx context.Context, userName, etag string) (*User, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userByUsernameRoute(userName), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) GetUserByEmail(ctx context.Context, email, etag string) (*User, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userByEmailRoute(email), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) AutocompleteUsersInTeam(ctx context.Context, teamId string, username string, limit int, etag string) (*UserAutocomplete, *Response, error) {
	values := url.Values{}
	values.Set("in_team", teamId)
	values.Set("name", username)
	values.Set("limit", strconv.Itoa(limit))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute().Join("autocomplete"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UserAutocomplete](r)
}
func (c *Client4) AutocompleteUsersInChannel(ctx context.Context, teamId string, channelId string, username string, limit int, etag string) (*UserAutocomplete, *Response, error) {
	values := url.Values{}
	values.Set("in_team", teamId)
	values.Set("in_channel", channelId)
	values.Set("name", username)
	values.Set("limit", strconv.Itoa(limit))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute().Join("autocomplete"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UserAutocomplete](r)
}
func (c *Client4) AutocompleteUsers(ctx context.Context, username string, limit int, etag string) (*UserAutocomplete, *Response, error) {
	values := url.Values{}
	values.Set("name", username)
	values.Set("limit", strconv.Itoa(limit))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute().Join("autocomplete"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UserAutocomplete](r)
}
func (c *Client4) GetDefaultProfileImage(ctx context.Context, userId string) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join("image", "default"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) GetProfileImage(ctx context.Context, userId, etag string) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join("image"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) GetUsers(ctx context.Context, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersWithCustomQueryParameters(ctx context.Context, page int, perPage int, queryParameters, etag string) ([]*User, *Response, error) {
	values, err := url.ParseQuery(queryParameters)
	if err != nil {
		return nil, nil, err
	}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersInTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("in_team", teamId)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetNewUsersInTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("sort", "create_at")
	values.Set("in_team", teamId)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetRecentlyActiveUsersInTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("sort", "last_activity_at")
	values.Set("in_team", teamId)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetActiveUsersInTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("active", "true")
	values.Set("in_team", teamId)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersNotInTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("not_in_team", teamId)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersInChannel(ctx context.Context, channelId string, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("in_channel", channelId)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersInChannelByStatus(ctx context.Context, channelId string, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("in_channel", channelId)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("sort", "status")
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersNotInChannel(ctx context.Context, teamId, channelId string, page int, perPage int, etag string) ([]*User, *Response, error) {
	options := &GetUsersNotInChannelOptions{
		TeamID:   teamId,
		Page:     page,
		Limit:    perPage,
		Etag:     etag,
		CursorID: "",
	}
	return c.GetUsersNotInChannelWithOptions(ctx, channelId, options)
}
func (c *Client4) GetUsersNotInChannelWithOptions(ctx context.Context, channelId string, options *GetUsersNotInChannelOptions) ([]*User, *Response, error) {
	values := url.Values{}
	if options != nil {
		values.Set("in_team", options.TeamID)
		values.Set("not_in_channel", channelId)
		values.Set("page", strconv.Itoa(options.Page))
		values.Set("per_page", strconv.Itoa(options.Limit))
		values.Set("cursor_id", options.CursorID)
	}
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, options.Etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersWithoutTeam(ctx context.Context, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("without_team", "1")
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersInGroup(ctx context.Context, groupID string, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("in_group", groupID)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersInGroupByDisplayName(ctx context.Context, groupID string, page int, perPage int, etag string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("sort", "display_name")
	values.Set("in_group", groupID)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersByIds(ctx context.Context, userIds []string) ([]*User, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("ids"), userIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersByIdsWithOptions(ctx context.Context, userIds []string, options *UserGetByIdsOptions) ([]*User, *Response, error) {
	values := url.Values{}
	if options.Since != 0 {
		values.Set("since", fmt.Sprintf("%d", options.Since))
	}
	r, err := c.doAPIPostJSONWithQuery(ctx, c.usersRoute().Join("ids"), values, userIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersByUsernames(ctx context.Context, usernames []string) ([]*User, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("usernames"), usernames)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetUsersByGroupChannelIds(ctx context.Context, groupChannelIds []string) (map[string][]*User, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("group_channels"), groupChannelIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string][]*User](r)
}
func (c *Client4) SearchUsers(ctx context.Context, search *UserSearch) ([]*User, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("search"), search)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) UpdateUser(ctx context.Context, user *User) (*User, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.userRoute(user.Id), user)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) PatchUser(ctx context.Context, userId string, patch *UserPatch) (*User, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.userRoute(userId).Join("patch"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) UpdateUserAuth(ctx context.Context, userId string, userAuth *UserAuth) (*UserAuth, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.userRoute(userId).Join("auth"), userAuth)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UserAuth](r)
}
func (c *Client4) UpdateUserMfa(ctx context.Context, userId, code string, activate bool) (*Response, error) {
	requestBody := make(map[string]any)
	requestBody["activate"] = activate
	requestBody["code"] = code
	r, err := c.doAPIPutJSON(ctx, c.userRoute(userId).Join("mfa"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GenerateMfaSecret(ctx context.Context, userId string) (*MfaSecret, *Response, error) {
	r, err := c.doAPIPost(ctx, c.userRoute(userId).Join("mfa", "generate"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*MfaSecret](r)
}
func (c *Client4) UpdateUserPassword(ctx context.Context, userId, currentPassword, newPassword string) (*Response, error) {
	requestBody := map[string]string{"current_password": currentPassword, "new_password": newPassword}
	r, err := c.doAPIPutJSON(ctx, c.userRoute(userId).Join("password"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateUserHashedPassword(ctx context.Context, userId, newHashedPassword string) (*Response, error) {
	requestBody := map[string]string{"already_hashed": "true", "new_password": newHashedPassword}
	r, err := c.doAPIPutJSON(ctx, c.userRoute(userId).Join("password"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) PromoteGuestToUser(ctx context.Context, guestId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.userRoute(guestId).Join("promote"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DemoteUserToGuest(ctx context.Context, guestId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.userRoute(guestId).Join("demote"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateUserRoles(ctx context.Context, userId, roles string) (*Response, error) {
	requestBody := map[string]string{"roles": roles}
	r, err := c.doAPIPutJSON(ctx, c.userRoute(userId).Join("roles"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateUserActive(ctx context.Context, userId string, active bool) (*Response, error) {
	requestBody := make(map[string]any)
	requestBody["active"] = active
	r, err := c.doAPIPutJSON(ctx, c.userRoute(userId).Join("active"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) ResetFailedAttempts(ctx context.Context, userId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.userRoute(userId).Join("reset_failed_attempts"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DeleteUser(ctx context.Context, userId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.userRoute(userId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) PermanentDeleteUser(ctx context.Context, userId string) (*Response, error) {
	values := url.Values{}
	values.Set("permanent", c.boolString(true))
	r, err := c.doAPIDeleteWithQuery(ctx, c.userRoute(userId), values)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) ConvertUserToBot(ctx context.Context, userId string) (*Bot, *Response, error) {
	r, err := c.doAPIPost(ctx, c.userRoute(userId).Join("convert_to_bot"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Bot](r)
}
func (c *Client4) ConvertBotToUser(ctx context.Context, userId string, userPatch *UserPatch, setSystemAdmin bool) (*User, *Response, error) {
	values := url.Values{}
	if setSystemAdmin {
		values.Set("set_system_admin", "true")
	}
	r, err := c.doAPIPostJSONWithQuery(ctx, c.botRoute(userId).Join("convert_to_user"), values, userPatch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) PermanentDeleteAllUsers(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.usersRoute())
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) SendPasswordResetEmail(ctx context.Context, email string) (*Response, error) {
	requestBody := map[string]string{"email": email}
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("password", "reset", "send"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) ResetPassword(ctx context.Context, token, newPassword string) (*Response, error) {
	requestBody := map[string]string{"token": token, "new_password": newPassword}
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("password", "reset"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetSessions(ctx context.Context, userId, etag string) ([]*Session, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join("sessions"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Session](r)
}
func (c *Client4) RevokeSession(ctx context.Context, userId, sessionId string) (*Response, error) {
	requestBody := map[string]string{"session_id": sessionId}
	r, err := c.doAPIPostJSON(ctx, c.userRoute(userId).Join("sessions", "revoke"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) RevokeAllSessions(ctx context.Context, userId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.userRoute(userId).Join("sessions", "revoke", "all"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) RevokeSessionsFromAllUsers(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.usersRoute().Join("sessions", "revoke", "all"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) AttachDeviceProps(ctx context.Context, newProps map[string]string) (*Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.usersRoute().Join("sessions", "device"), newProps)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetTeamsUnreadForUser(ctx context.Context, userId, teamIdToExclude string, includeCollapsedThreads bool) ([]*TeamUnread, *Response, error) {
	values := url.Values{}
	if teamIdToExclude != "" {
		values.Set("exclude_team", teamIdToExclude)
	}
	values.Set("include_collapsed_threads", c.boolString(includeCollapsedThreads))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userId).Join("teams", "unread"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*TeamUnread](r)
}
func (c *Client4) GetUserAudits(ctx context.Context, userId string, page int, perPage int, etag string) (Audits, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userId).Join("audits"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[Audits](r)
}
func (c *Client4) VerifyUserEmail(ctx context.Context, token string) (*Response, error) {
	requestBody := map[string]string{"token": token}
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("email", "verify"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) VerifyUserEmailWithoutToken(ctx context.Context, userId string) (*User, *Response, error) {
	r, err := c.doAPIPost(ctx, c.userRoute(userId).Join("email", "verify", "member"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*User](r)
}
func (c *Client4) SendVerificationEmail(ctx context.Context, email string) (*Response, error) {
	requestBody := map[string]string{"email": email}
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("email", "verify", "send"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) SetDefaultProfileImage(ctx context.Context, userId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.userRoute(userId).Join("image"))
	if err != nil {
		return BuildResponse(r), err
	}
	return BuildResponse(r), nil
}
func (c *Client4) SetProfileImage(ctx context.Context, userId string, data []byte) (*Response, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "profile.png")
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err = io.Copy(part, bytes.NewBuffer(data)); err != nil {
		return nil, fmt.Errorf("failed to copy data to form file: %w", err)
	}
	if err = writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}
	r, err := c.doAPIRequestReaderRoute(ctx, http.MethodPost, c.userRoute(userId).Join("image"), writer.FormDataContentType(), body, nil)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) CreateUserAccessToken(ctx context.Context, userId, description string) (*UserAccessToken, *Response, error) {
	requestBody := map[string]string{"description": description}
	r, err := c.doAPIPostJSON(ctx, c.userRoute(userId).Join("tokens"), requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UserAccessToken](r)
}
func (c *Client4) GetUserAccessTokens(ctx context.Context, page int, perPage int) ([]*UserAccessToken, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.userAccessTokensRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*UserAccessToken](r)
}
func (c *Client4) GetUserAccessToken(ctx context.Context, tokenId string) (*UserAccessToken, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userAccessTokenRoute(tokenId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UserAccessToken](r)
}
func (c *Client4) GetUserAccessTokensForUser(ctx context.Context, userId string, page, perPage int) ([]*UserAccessToken, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userId).Join("tokens"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*UserAccessToken](r)
}
func (c *Client4) RevokeUserAccessToken(ctx context.Context, tokenId string) (*Response, error) {
	requestBody := map[string]string{"token_id": tokenId}
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("tokens", "revoke"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) SearchUserAccessTokens(ctx context.Context, search *UserAccessTokenSearch) ([]*UserAccessToken, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("tokens", "search"), search)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*UserAccessToken](r)
}
func (c *Client4) DisableUserAccessToken(ctx context.Context, tokenId string) (*Response, error) {
	requestBody := map[string]string{"token_id": tokenId}
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("tokens", "disable"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) EnableUserAccessToken(ctx context.Context, tokenId string) (*Response, error) {
	requestBody := map[string]string{"token_id": tokenId}
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("tokens", "enable"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetUsersForReporting(ctx context.Context, options *UserReportOptions) ([]*UserReport, *Response, error) {
	values := url.Values{}
	if options.Direction != "" {
		values.Set("direction", options.Direction)
	}
	if options.SortColumn != "" {
		values.Set("sort_column", options.SortColumn)
	}
	if options.PageSize > 0 {
		values.Set("page_size", strconv.Itoa(options.PageSize))
	}
	if options.Team != "" {
		values.Set("team_filter", options.Team)
	}
	if options.HideActive {
		values.Set("hide_active", "true")
	}
	if options.HideInactive {
		values.Set("hide_inactive", "true")
	}
	if options.SortDesc {
		values.Set("sort_direction", "desc")
	}
	if options.FromColumnValue != "" {
		values.Set("from_column_value", options.FromColumnValue)
	}
	if options.FromId != "" {
		values.Set("from_id", options.FromId)
	}
	if options.Role != "" {
		values.Set("role_filter", options.Role)
	}
	if options.HasNoTeam {
		values.Set("has_no_team", "true")
	}
	if options.DateRange != "" {
		values.Set("date_range", options.DateRange)
	}
	if options.GuestFilter != "" {
		values.Set("guest_filter", options.GuestFilter)
	}
	if options.SearchTerm != "" {
		values.Set("search_term", options.SearchTerm)
	}
	r, err := c.doAPIGetWithQuery(ctx, c.reportsRoute().Join("users"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*UserReport](r)
}
func (c *Client4) CreateBot(ctx context.Context, bot *Bot) (*Bot, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.botsRoute(), bot)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Bot](r)
}
func (c *Client4) PatchBot(ctx context.Context, userId string, patch *BotPatch) (*Bot, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.botRoute(userId), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Bot](r)
}
func (c *Client4) GetBot(ctx context.Context, userId string, etag string) (*Bot, *Response, error) {
	r, err := c.doAPIGet(ctx, c.botRoute(userId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Bot](r)
}
func (c *Client4) GetBotIncludeDeleted(ctx context.Context, userId string, etag string) (*Bot, *Response, error) {
	values := url.Values{}
	values.Set("include_deleted", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.botRoute(userId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Bot](r)
}
func (c *Client4) GetBots(ctx context.Context, page, perPage int, etag string) ([]*Bot, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.botsRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[BotList](r)
}
func (c *Client4) GetBotsIncludeDeleted(ctx context.Context, page, perPage int, etag string) ([]*Bot, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("include_deleted", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.botsRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[BotList](r)
}
func (c *Client4) GetBotsOrphaned(ctx context.Context, page, perPage int, etag string) ([]*Bot, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("only_orphaned", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.botsRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[BotList](r)
}
func (c *Client4) DisableBot(ctx context.Context, botUserId string) (*Bot, *Response, error) {
	r, err := c.doAPIPost(ctx, c.botRoute(botUserId).Join("disable"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Bot](r)
}
func (c *Client4) EnableBot(ctx context.Context, botUserId string) (*Bot, *Response, error) {
	r, err := c.doAPIPost(ctx, c.botRoute(botUserId).Join("enable"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Bot](r)
}
func (c *Client4) AssignBot(ctx context.Context, botUserId, newOwnerId string) (*Bot, *Response, error) {
	r, err := c.doAPIPost(ctx, c.botRoute(botUserId).Join("assign", newOwnerId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Bot](r)
}
func (c *Client4) CreateTeam(ctx context.Context, team *Team) (*Team, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.teamsRoute(), team)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) GetTeam(ctx context.Context, teamId, etag string) (*Team, *Response, error) {
	r, err := c.doAPIGet(ctx, c.teamRoute(teamId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) GetTeamAsContentReviewer(ctx context.Context, teamId, etag, flaggedPostId string) (*Team, *Response, error) {
	values := url.Values{}
	values.Set(AsContentReviewerParam, c.boolString(true))
	values.Set("flagged_post_id", flaggedPostId)
	r, err := c.doAPIGetWithQuery(ctx, c.teamRoute(teamId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) GetAllTeams(ctx context.Context, etag string, page int, perPage int) ([]*Team, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.teamsRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Team](r)
}
func (c *Client4) GetAllTeamsWithTotalCount(ctx context.Context, etag string, page int, perPage int) ([]*Team, int64, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("include_total_count", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.teamsRoute(), values, etag)
	if err != nil {
		return nil, 0, BuildResponse(r), err
	}
	defer closeBody(r)
	listWithCount, resp, err := DecodeJSONFromResponse[TeamsWithCount](r)
	if err != nil {
		return nil, 0, resp, err
	}
	return listWithCount.Teams, listWithCount.TotalCount, resp, nil
}
func (c *Client4) GetAllTeamsExcludePolicyConstrained(ctx context.Context, etag string, page int, perPage int) ([]*Team, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("exclude_policy_constrained", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.teamsRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Team](r)
}
func (c *Client4) GetTeamByName(ctx context.Context, name, etag string) (*Team, *Response, error) {
	r, err := c.doAPIGet(ctx, c.teamByNameRoute(name), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) SearchTeams(ctx context.Context, search *TeamSearch) ([]*Team, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.teamsRoute().Join("search"), search)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Team](r)
}
func (c *Client4) SearchTeamsPaged(ctx context.Context, search *TeamSearch) ([]*Team, int64, *Response, error) {
	if search.Page == nil {
		search.Page = NewPointer(0)
	}
	if search.PerPage == nil {
		search.PerPage = NewPointer(100)
	}
	r, err := c.doAPIPostJSON(ctx, c.teamsRoute().Join("search"), search)
	if err != nil {
		return nil, 0, BuildResponse(r), err
	}
	defer closeBody(r)
	listWithCount, resp, err := DecodeJSONFromResponse[TeamsWithCount](r)
	if err != nil {
		return nil, 0, resp, err
	}
	return listWithCount.Teams, listWithCount.TotalCount, resp, nil
}
func (c *Client4) TeamExists(ctx context.Context, name, etag string) (bool, *Response, error) {
	r, err := c.doAPIGet(ctx, c.teamByNameRoute(name).Join("exists"), etag)
	if err != nil {
		return false, BuildResponse(r), err
	}
	defer closeBody(r)
	return MapBoolFromJSON(r.Body)["exists"], BuildResponse(r), nil
}
func (c *Client4) GetTeamsForUser(ctx context.Context, userId, etag string) ([]*Team, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join("teams"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Team](r)
}
func (c *Client4) GetTeamMember(ctx context.Context, teamId, userId, etag string) (*TeamMember, *Response, error) {
	r, err := c.doAPIGet(ctx, c.teamMemberRoute(teamId, userId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*TeamMember](r)
}
func (c *Client4) UpdateTeamMemberRoles(ctx context.Context, teamId, userId, newRoles string) (*Response, error) {
	requestBody := map[string]string{"roles": newRoles}
	r, err := c.doAPIPutJSON(ctx, c.teamMemberRoute(teamId, userId).Join("roles"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateTeamMemberSchemeRoles(ctx context.Context, teamId string, userId string, schemeRoles *SchemeRoles) (*Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.teamMemberRoute(teamId, userId).Join("schemeRoles"), schemeRoles)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateTeam(ctx context.Context, team *Team) (*Team, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.teamRoute(team.Id), team)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) PatchTeam(ctx context.Context, teamId string, patch *TeamPatch) (*Team, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.teamRoute(teamId).Join("patch"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) RestoreTeam(ctx context.Context, teamId string) (*Team, *Response, error) {
	r, err := c.doAPIPost(ctx, c.teamRoute(teamId).Join("restore"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) RegenerateTeamInviteId(ctx context.Context, teamId string) (*Team, *Response, error) {
	r, err := c.doAPIPost(ctx, c.teamRoute(teamId).Join("regenerate_invite_id"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) SoftDeleteTeam(ctx context.Context, teamId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.teamRoute(teamId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) PermanentDeleteTeam(ctx context.Context, teamId string) (*Response, error) {
	values := url.Values{}
	values.Set("permanent", c.boolString(true))
	r, err := c.doAPIDeleteWithQuery(ctx, c.teamRoute(teamId), values)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateTeamPrivacy(ctx context.Context, teamId string, privacy string) (*Team, *Response, error) {
	requestBody := map[string]string{"privacy": privacy}
	r, err := c.doAPIPutJSON(ctx, c.teamRoute(teamId).Join("privacy"), requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) GetTeamMembers(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*TeamMember, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.teamMembersRoute(teamId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*TeamMember](r)
}
func (c *Client4) GetTeamMembersSortAndWithoutDeletedUsers(ctx context.Context, teamId string, page int, perPage int, sort string, excludeDeletedUsers bool, etag string) ([]*TeamMember, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("sort", sort)
	values.Set("exclude_deleted_users", c.boolString(excludeDeletedUsers))
	r, err := c.doAPIGetWithQuery(ctx, c.teamMembersRoute(teamId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*TeamMember](r)
}
func (c *Client4) GetTeamMembersForUser(ctx context.Context, userId string, etag string) ([]*TeamMember, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join("teams", "members"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*TeamMember](r)
}
func (c *Client4) GetTeamMembersByIds(ctx context.Context, teamId string, userIds []string) ([]*TeamMember, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.teamMembersRoute(teamId).Join("ids"), userIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*TeamMember](r)
}
func (c *Client4) AddTeamMember(ctx context.Context, teamId, userId string) (*TeamMember, *Response, error) {
	member := &TeamMember{TeamId: teamId, UserId: userId}
	r, err := c.doAPIPostJSON(ctx, c.teamMembersRoute(teamId), member)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*TeamMember](r)
}
func (c *Client4) AddTeamMemberFromInvite(ctx context.Context, token, inviteId string) (*TeamMember, *Response, error) {
	values := url.Values{}
	values.Set("invite_id", inviteId)
	values.Set("token", token)
	r, err := c.doAPIPostWithQuery(ctx, c.teamsRoute().Join("members", "invite"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*TeamMember](r)
}
func (c *Client4) AddTeamMembers(ctx context.Context, teamId string, userIds []string) ([]*TeamMember, *Response, error) {
	var members []*TeamMember
	for _, userId := range userIds {
		member := &TeamMember{TeamId: teamId, UserId: userId}
		members = append(members, member)
	}
	r, err := c.doAPIPostJSON(ctx, c.teamMembersRoute(teamId).Join("batch"), members)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*TeamMember](r)
}
func (c *Client4) AddTeamMembersGracefully(ctx context.Context, teamId string, userIds []string) ([]*TeamMemberWithError, *Response, error) {
	var members []*TeamMember
	for _, userId := range userIds {
		member := &TeamMember{TeamId: teamId, UserId: userId}
		members = append(members, member)
	}
	values := url.Values{}
	values.Set("graceful", c.boolString(true))
	r, err := c.doAPIPostJSONWithQuery(ctx, c.teamMembersRoute(teamId).Join("batch"), values, members)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*TeamMemberWithError](r)
}
func (c *Client4) RemoveTeamMember(ctx context.Context, teamId, userId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.teamMemberRoute(teamId, userId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetTeamStats(ctx context.Context, teamId, etag string) (*TeamStats, *Response, error) {
	r, err := c.doAPIGet(ctx, c.teamStatsRoute(teamId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*TeamStats](r)
}
func (c *Client4) GetTotalUsersStats(ctx context.Context, etag string) (*UsersStats, *Response, error) {
	r, err := c.doAPIGet(ctx, c.totalUsersStatsRoute(), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UsersStats](r)
}
func (c *Client4) GetTeamUnread(ctx context.Context, teamId, userId string) (*TeamUnread, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join(c.teamRoute(teamId), "unread"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*TeamUnread](r)
}
func (c *Client4) ImportTeam(ctx context.Context, data []byte, filesize int, importFrom, filename, teamId string) (map[string]string, *Response, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return nil, nil, err
	}
	if _, err = io.Copy(part, bytes.NewBuffer(data)); err != nil {
		return nil, nil, err
	}
	part, err = writer.CreateFormField("filesize")
	if err != nil {
		return nil, nil, err
	}
	if _, err = io.Copy(part, strings.NewReader(strconv.Itoa(filesize))); err != nil {
		return nil, nil, err
	}
	part, err = writer.CreateFormField("importFrom")
	if err != nil {
		return nil, nil, err
	}
	if _, err = io.Copy(part, strings.NewReader(importFrom)); err != nil {
		return nil, nil, err
	}
	if err = writer.Close(); err != nil {
		return nil, nil, err
	}
	r, err := c.doAPIRequestReaderRoute(ctx, http.MethodPost, c.teamImportRoute(teamId), writer.FormDataContentType(), body, nil)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]string](r)
}
func (c *Client4) InviteUsersToTeam(ctx context.Context, teamId string, userEmails []string) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.teamRoute(teamId).Join("invite", "email"), userEmails)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) InviteGuestsToTeam(ctx context.Context, teamId string, userEmails []string, channels []string, message string) (*Response, error) {
	guestsInvite := GuestsInvite{
		Emails:   userEmails,
		Channels: channels,
		Message:  message,
	}
	r, err := c.doAPIPostJSON(ctx, c.teamRoute(teamId).Join("invite-guests", "email"), guestsInvite)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) InviteUsersToTeamGracefully(ctx context.Context, teamId string, userEmails []string) ([]*EmailInviteWithError, *Response, error) {
	values := url.Values{}
	values.Set("graceful", c.boolString(true))
	r, err := c.doAPIPostJSONWithQuery(ctx, c.teamRoute(teamId).Join("invite", "email"), values, userEmails)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*EmailInviteWithError](r)
}
func (c *Client4) InviteUsersToTeamAndChannelsGracefully(ctx context.Context, teamId string, userEmails []string, channelIds []string, message string) ([]*EmailInviteWithError, *Response, error) {
	memberInvite := MemberInvite{
		Emails:     userEmails,
		ChannelIds: channelIds,
		Message:    message,
	}
	values := url.Values{}
	values.Set("graceful", c.boolString(true))
	r, err := c.doAPIPostJSONWithQuery(ctx, c.teamRoute(teamId).Join("invite", "email"), values, memberInvite)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*EmailInviteWithError](r)
}
func (c *Client4) InviteGuestsToTeamGracefully(ctx context.Context, teamId string, userEmails []string, channels []string, message string) ([]*EmailInviteWithError, *Response, error) {
	guestsInvite := GuestsInvite{
		Emails:   userEmails,
		Channels: channels,
		Message:  message,
	}
	values := url.Values{}
	values.Set("graceful", c.boolString(true))
	r, err := c.doAPIPostJSONWithQuery(ctx, c.teamRoute(teamId).Join("invite-guests", "email"), values, guestsInvite)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*EmailInviteWithError](r)
}
func (c *Client4) InvalidateEmailInvites(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.teamsRoute().Join("invites", "email"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetTeamInviteInfo(ctx context.Context, inviteId string) (*Team, *Response, error) {
	r, err := c.doAPIGet(ctx, c.teamsRoute().Join("invite", inviteId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Team](r)
}
func (c *Client4) SetTeamIcon(ctx context.Context, teamId string, data []byte) (*Response, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "teamIcon.png")
	if err != nil {
		return nil, fmt.Errorf("failed to create form file for team icon: %w", err)
	}
	if _, err = io.Copy(part, bytes.NewBuffer(data)); err != nil {
		return nil, fmt.Errorf("failed to copy data to team icon form file: %w", err)
	}
	if err = writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer for team icon: %w", err)
	}
	r, err := c.doAPIRequestReaderRoute(ctx, http.MethodPost, c.teamRoute(teamId).Join("image"), writer.FormDataContentType(), body, nil)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetTeamIcon(ctx context.Context, teamId, etag string) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.teamRoute(teamId).Join("image"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) RemoveTeamIcon(ctx context.Context, teamId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.teamRoute(teamId).Join("image"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetAllChannels(ctx context.Context, page int, perPage int, etag string) (ChannelListWithTeamData, *Response, error) {
	return c.getAllChannels(ctx, page, perPage, etag, ChannelSearchOpts{})
}
func (c *Client4) GetAllChannelsIncludeDeleted(ctx context.Context, page int, perPage int, etag string) (ChannelListWithTeamData, *Response, error) {
	return c.getAllChannels(ctx, page, perPage, etag, ChannelSearchOpts{IncludeDeleted: true})
}
func (c *Client4) GetAllChannelsExcludePolicyConstrained(ctx context.Context, page, perPage int, etag string) (ChannelListWithTeamData, *Response, error) {
	return c.getAllChannels(ctx, page, perPage, etag, ChannelSearchOpts{ExcludePolicyConstrained: true})
}
func (c *Client4) getAllChannels(ctx context.Context, page int, perPage int, etag string, opts ChannelSearchOpts) (ChannelListWithTeamData, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("include_deleted", c.boolString(opts.IncludeDeleted))
	values.Set("exclude_policy_constrained", c.boolString(opts.ExcludePolicyConstrained))
	r, err := c.doAPIGetWithQuery(ctx, c.channelsRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[ChannelListWithTeamData](r)
}
func (c *Client4) GetAllChannelsWithCount(ctx context.Context, page int, perPage int, etag string) (ChannelListWithTeamData, int64, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("include_total_count", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.channelsRoute(), values, etag)
	if err != nil {
		return nil, 0, BuildResponse(r), err
	}
	defer closeBody(r)
	cwc, resp, err := DecodeJSONFromResponse[*ChannelsWithCount](r)
	if err != nil {
		return nil, 0, resp, err
	}
	return cwc.Channels, cwc.TotalCount, resp, nil
}
func (c *Client4) CreateChannel(ctx context.Context, channel *Channel) (*Channel, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsRoute(), channel)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) UpdateChannel(ctx context.Context, channel *Channel) (*Channel, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.channelRoute(channel.Id), channel)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) PatchChannel(ctx context.Context, channelId string, patch *ChannelPatch) (*Channel, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.channelRoute(channelId).Join("patch"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) UpdateChannelPrivacy(ctx context.Context, channelId string, privacy ChannelType) (*Channel, *Response, error) {
	requestBody := map[string]string{"privacy": string(privacy)}
	r, err := c.doAPIPutJSON(ctx, c.channelRoute(channelId).Join("privacy"), requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) RestoreChannel(ctx context.Context, channelId string) (*Channel, *Response, error) {
	r, err := c.doAPIPost(ctx, c.channelRoute(channelId).Join("restore"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) CreateDirectChannel(ctx context.Context, userId1, userId2 string) (*Channel, *Response, error) {
	requestBody := []string{userId1, userId2}
	r, err := c.doAPIPostJSON(ctx, c.channelsRoute().Join("direct"), requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) CreateGroupChannel(ctx context.Context, userIds []string) (*Channel, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsRoute().Join("group"), userIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) GetChannel(ctx context.Context, channelId string) (*Channel, *Response, error) {
	r, err := c.doAPIGet(ctx, c.channelRoute(channelId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) GetChannelAsContentReviewer(ctx context.Context, channelId, etag, flaggedPostId string) (*Channel, *Response, error) {
	values := url.Values{}
	values.Set(AsContentReviewerParam, c.boolString(true))
	values.Set("flagged_post_id", flaggedPostId)
	r, err := c.doAPIGetWithQuery(ctx, c.channelRoute(channelId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) GetChannelStats(ctx context.Context, channelId string, etag string, excludeFilesCount bool) (*ChannelStats, *Response, error) {
	values := url.Values{}
	values.Set("exclude_files_count", c.boolString(excludeFilesCount))
	r, err := c.doAPIGetWithQuery(ctx, c.channelRoute(channelId).Join("stats"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelStats](r)
}
func (c *Client4) GetChannelsMemberCount(ctx context.Context, channelIDs []string) (map[string]int64, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsRoute().Join("stats", "member_count"), channelIDs)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]int64](r)
}
func (c *Client4) GetChannelMembersTimezones(ctx context.Context, channelId string) ([]string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.channelRoute(channelId).Join("timezones"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]string](r)
}
func (c *Client4) GetPinnedPosts(ctx context.Context, channelId string, etag string) (*PostList, *Response, error) {
	r, err := c.doAPIGet(ctx, c.channelRoute(channelId).Join("pinned"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) GetPrivateChannelsForTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*Channel, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.channelsForTeamRoute(teamId).Join("private"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Channel](r)
}
func (c *Client4) GetPublicChannelsForTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*Channel, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.channelsForTeamRoute(teamId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Channel](r)
}
func (c *Client4) GetDeletedChannelsForTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*Channel, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.channelsForTeamRoute(teamId).Join("deleted"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Channel](r)
}
func (c *Client4) GetPublicChannelsByIdsForTeam(ctx context.Context, teamId string, channelIds []string) ([]*Channel, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsForTeamRoute(teamId).Join("ids"), channelIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Channel](r)
}
func (c *Client4) GetChannelsForTeamForUser(ctx context.Context, teamId, userId string, includeDeleted bool, etag string) ([]*Channel, *Response, error) {
	values := url.Values{}
	values.Set("include_deleted", c.boolString(includeDeleted))
	r, err := c.doAPIGetWithQuery(ctx, c.channelsForTeamForUserRoute(teamId, userId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Channel](r)
}
func (c *Client4) GetChannelsForTeamAndUserWithLastDeleteAt(ctx context.Context, teamId, userId string, includeDeleted bool, lastDeleteAt int, etag string) ([]*Channel, *Response, error) {
	values := url.Values{}
	values.Set("include_deleted", c.boolString(includeDeleted))
	values.Set("last_delete_at", strconv.Itoa(lastDeleteAt))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userId).Join(c.teamRoute(teamId), "channels"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Channel](r)
}
func (c *Client4) GetChannelsForUserWithLastDeleteAt(ctx context.Context, userID string, lastDeleteAt int) ([]*Channel, *Response, error) {
	values := url.Values{}
	values.Set("last_delete_at", strconv.Itoa(lastDeleteAt))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userID).Join("channels"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Channel](r)
}
func (c *Client4) SearchChannels(ctx context.Context, teamId string, search *ChannelSearch) ([]*Channel, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsForTeamRoute(teamId).Join("search"), search)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Channel](r)
}
func (c *Client4) SearchAllChannels(ctx context.Context, search *ChannelSearch) (ChannelListWithTeamData, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsRoute().Join("search"), search)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[ChannelListWithTeamData](r)
}
func (c *Client4) SearchAllChannelsForUser(ctx context.Context, term string) (ChannelListWithTeamData, *Response, error) {
	values := url.Values{}
	values.Set("system_console", "false")
	search := &ChannelSearch{
		Term: term,
	}
	r, err := c.doAPIPostJSONWithQuery(ctx, c.channelsRoute().Join("search"), values, search)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[ChannelListWithTeamData](r)
}
func (c *Client4) SearchAllChannelsPaged(ctx context.Context, search *ChannelSearch) (*ChannelsWithCount, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsRoute().Join("search"), search)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelsWithCount](r)
}
func (c *Client4) SearchGroupChannels(ctx context.Context, search *ChannelSearch) ([]*Channel, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsRoute().Join("group", "search"), search)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Channel](r)
}
func (c *Client4) DeleteChannel(ctx context.Context, channelId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.channelRoute(channelId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) PermanentDeleteChannel(ctx context.Context, channelId string) (*Response, error) {
	values := url.Values{}
	values.Set("permanent", c.boolString(true))
	r, err := c.doAPIDeleteWithQuery(ctx, c.channelRoute(channelId), values)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) MoveChannel(ctx context.Context, channelId, teamId string, force bool) (*Channel, *Response, error) {
	requestBody := map[string]any{
		"team_id": teamId,
		"force":   force,
	}
	r, err := c.doAPIPostJSON(ctx, c.channelRoute(channelId).Join("move"), requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) GetDirectOrGroupMessageMembersCommonTeams(ctx context.Context, channelId string) ([]*Team, *Response, error) {
	r, err := c.doAPIGet(ctx, c.channelRoute(channelId).Join("common_teams"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Team](r)
}
func (c *Client4) GetChannelByName(ctx context.Context, channelName, teamId string, etag string) (*Channel, *Response, error) {
	r, err := c.doAPIGet(ctx, c.channelByNameRoute(channelName, teamId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) GetChannelByNameIncludeDeleted(ctx context.Context, channelName, teamId string, etag string) (*Channel, *Response, error) {
	values := url.Values{}
	values.Set("include_deleted", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.channelByNameRoute(channelName, teamId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) GetChannelByNameForTeamName(ctx context.Context, channelName, teamName string, etag string) (*Channel, *Response, error) {
	r, err := c.doAPIGet(ctx, c.channelByNameForTeamNameRoute(channelName, teamName), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) GetChannelByNameForTeamNameIncludeDeleted(ctx context.Context, channelName, teamName string, etag string) (*Channel, *Response, error) {
	values := url.Values{}
	values.Set("include_deleted", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.channelByNameForTeamNameRoute(channelName, teamName), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Channel](r)
}
func (c *Client4) GetChannelMembers(ctx context.Context, channelId string, page, perPage int, etag string) (ChannelMembers, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.channelMembersRoute(channelId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[ChannelMembers](r)
}
func (c *Client4) GetChannelMembersWithTeamData(ctx context.Context, userID string, page, perPage int) (ChannelMembersWithTeamData, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userID).Join("channel_members"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	var ch ChannelMembersWithTeamData
	if page == -1 {
		contentType := r.Header.Get("Content-Type")
		if contentType == "application/x-ndjson" {
			scanner := bufio.NewScanner(r.Body)
			ch = ChannelMembersWithTeamData{}
			for scanner.Scan() {
				line := scanner.Text()
				if line == "" {
					continue
				}
				var member ChannelMemberWithTeamData
				if err = json.Unmarshal([]byte(line), &member); err != nil {
					return nil, BuildResponse(r), fmt.Errorf("failed to unmarshal channel member data: %w", err)
				}
				ch = append(ch, member)
			}
			if err = scanner.Err(); err != nil {
				return nil, BuildResponse(r), fmt.Errorf("scanner error while reading channel members: %w", err)
			}
			return ch, BuildResponse(r), nil
		}
	}
	return DecodeJSONFromResponse[ChannelMembersWithTeamData](r)
}
func (c *Client4) GetChannelMembersByIds(ctx context.Context, channelId string, userIds []string) (ChannelMembers, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelMembersRoute(channelId).Join("ids"), userIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[ChannelMembers](r)
}
func (c *Client4) GetChannelMember(ctx context.Context, channelId, userId, etag string) (*ChannelMember, *Response, error) {
	r, err := c.doAPIGet(ctx, c.channelMemberRoute(channelId, userId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelMember](r)
}
func (c *Client4) GetChannelMembersForUser(ctx context.Context, userId, teamId, etag string) (ChannelMembers, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join("teams", teamId, "channels", "members"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[ChannelMembers](r)
}
func (c *Client4) ViewChannel(ctx context.Context, userId string, view *ChannelView) (*ChannelViewResponse, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsRoute().Join("members", userId, "view"), view)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelViewResponse](r)
}
func (c *Client4) ReadMultipleChannels(ctx context.Context, userId string, channelIds []string) (*ChannelViewResponse, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.channelsRoute().Join("members", userId, "mark_read"), channelIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelViewResponse](r)
}
func (c *Client4) GetChannelUnread(ctx context.Context, channelId, userId string) (*ChannelUnread, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join(c.channelRoute(channelId), "unread"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelUnread](r)
}
func (c *Client4) UpdateChannelRoles(ctx context.Context, channelId, userId, roles string) (*Response, error) {
	requestBody := map[string]string{"roles": roles}
	r, err := c.doAPIPutJSON(ctx, c.channelMemberRoute(channelId, userId).Join("roles"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateChannelMemberSchemeRoles(ctx context.Context, channelId string, userId string, schemeRoles *SchemeRoles) (*Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.channelMemberRoute(channelId, userId).Join("schemeRoles"), schemeRoles)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateChannelNotifyProps(ctx context.Context, channelId, userId string, props map[string]string) (*Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.channelMemberRoute(channelId, userId).Join("notify_props"), props)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateChannelMemberAutotranslation(ctx context.Context, channelId, userId string, autoTranslationDisabled bool) (*Response, error) {
	requestBody := map[string]any{"autotranslation_disabled": autoTranslationDisabled}
	r, err := c.doAPIPutJSON(ctx, c.channelMemberRoute(channelId, userId).Join("autotranslation"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) AddChannelMember(ctx context.Context, channelId, userId string) (*ChannelMember, *Response, error) {
	requestBody := map[string]string{"user_id": userId}
	r, err := c.doAPIPostJSON(ctx, c.channelMembersRoute(channelId), requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelMember](r)
}
func (c *Client4) AddChannelMembers(ctx context.Context, channelId, postRootId string, userIds []string) ([]*ChannelMember, *Response, error) {
	requestBody := map[string]any{"user_ids": userIds, "post_root_id": postRootId}
	r, err := c.doAPIPostJSON(ctx, c.channelMembersRoute(channelId), requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*ChannelMember](r)
}
func (c *Client4) AddChannelMemberWithRootId(ctx context.Context, channelId, userId, postRootId string) (*ChannelMember, *Response, error) {
	requestBody := map[string]string{"user_id": userId, "post_root_id": postRootId}
	r, err := c.doAPIPostJSON(ctx, c.channelMembersRoute(channelId), requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelMember](r)
}
func (c *Client4) RemoveUserFromChannel(ctx context.Context, channelId, userId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.channelMemberRoute(channelId, userId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) AutocompleteChannelsForTeam(ctx context.Context, teamId, name string) (ChannelList, *Response, error) {
	values := url.Values{}
	values.Set("name", name)
	r, err := c.doAPIGetWithQuery(ctx, c.channelsForTeamRoute(teamId).Join("autocomplete"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[ChannelList](r)
}
func (c *Client4) AutocompleteChannelsForTeamForSearch(ctx context.Context, teamId, name string) (ChannelList, *Response, error) {
	values := url.Values{}
	values.Set("name", name)
	r, err := c.doAPIGetWithQuery(ctx, c.channelsForTeamRoute(teamId).Join("search_autocomplete"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[ChannelList](r)
}
func (c *Client4) CreatePost(ctx context.Context, post *Post) (*Post, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.postsRoute(), post)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Post](r)
}
func (c *Client4) CreatePostEphemeral(ctx context.Context, post *PostEphemeral) (*Post, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.postsEphemeralRoute(), post)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Post](r)
}
func (c *Client4) UpdatePost(ctx context.Context, postId string, post *Post) (*Post, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.postRoute(postId), post)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Post](r)
}
func (c *Client4) PatchPost(ctx context.Context, postId string, patch *PostPatch) (*Post, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.postRoute(postId).Join("patch"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Post](r)
}
func (c *Client4) SetPostUnread(ctx context.Context, userId string, postId string, collapsedThreadsSupported bool) (*Response, error) {
	reqData := map[string]bool{"collapsed_threads_supported": collapsedThreadsSupported}
	r, err := c.doAPIPostJSON(ctx, c.userRoute(userId).Join(c.postRoute(postId), "set_unread"), reqData)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) SetPostReminder(ctx context.Context, reminder *PostReminder) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.userRoute(reminder.UserId).Join(c.postRoute(reminder.PostId), "reminder"), reminder)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) PinPost(ctx context.Context, postId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.postRoute(postId).Join("pin"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UnpinPost(ctx context.Context, postId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.postRoute(postId).Join("unpin"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetPost(ctx context.Context, postId string, etag string) (*Post, *Response, error) {
	r, err := c.doAPIGet(ctx, c.postRoute(postId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Post](r)
}
func (c *Client4) GetPostIncludeDeleted(ctx context.Context, postId string, etag string) (*Post, *Response, error) {
	values := url.Values{}
	values.Set("include_deleted", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.postRoute(postId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Post](r)
}
func (c *Client4) DeletePost(ctx context.Context, postId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.postRoute(postId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) PermanentDeletePost(ctx context.Context, postId string) (*Response, error) {
	values := url.Values{}
	values.Set("permanent", c.boolString(true))
	r, err := c.doAPIDeleteWithQuery(ctx, c.postRoute(postId), values)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetPostThread(ctx context.Context, postId string, etag string, collapsedThreads bool) (*PostList, *Response, error) {
	values := url.Values{}
	values.Set("collapsedThreads", c.boolString(collapsedThreads))
	r, err := c.doAPIGetWithQuery(ctx, c.postRoute(postId).Join("thread"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) GetPostThreadWithOpts(ctx context.Context, postID string, etag string, opts GetPostsOptions) (*PostList, *Response, error) {
	values := url.Values{}
	if opts.CollapsedThreads {
		values.Set("collapsedThreads", "true")
	}
	if opts.CollapsedThreadsExtended {
		values.Set("collapsedThreadsExtended", "true")
	}
	if opts.SkipFetchThreads {
		values.Set("skipFetchThreads", "true")
	}
	if opts.UpdatesOnly {
		values.Set("updatesOnly", "true")
	}
	if opts.PerPage != 0 {
		values.Set("perPage", strconv.Itoa(opts.PerPage))
	}
	if opts.FromPost != "" {
		values.Set("fromPost", opts.FromPost)
	}
	if opts.FromCreateAt != 0 {
		values.Set("fromCreateAt", strconv.FormatInt(opts.FromCreateAt, 10))
	}
	if opts.FromUpdateAt != 0 {
		values.Set("fromUpdateAt", strconv.FormatInt(opts.FromUpdateAt, 10))
	}
	if opts.Direction != "" {
		values.Set("direction", opts.Direction)
	}
	r, err := c.doAPIGetWithQuery(ctx, c.postRoute(postID).Join("thread"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) GetPostsForChannel(ctx context.Context, channelId string, page, perPage int, etag string, collapsedThreads bool, includeDeleted bool) (*PostList, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("collapsedThreads", c.boolString(collapsedThreads))
	values.Set("include_deleted", c.boolString(includeDeleted))
	r, err := c.doAPIGetWithQuery(ctx, c.channelRoute(channelId).Join("posts"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) GetPostsByIds(ctx context.Context, postIds []string) ([]*Post, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.postsRoute().Join("ids"), postIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Post](r)
}
func (c *Client4) GetEditHistoryForPost(ctx context.Context, postId string) ([]*Post, *Response, error) {
	js, err := json.Marshal(postId)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal edit history request: %w", err)
	}
	r, err := c.doAPIGet(ctx, c.postRoute(postId).Join("edit_history"), string(js))
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Post](r)
}
func (c *Client4) GetFlaggedPostsForUser(ctx context.Context, userId string, page int, perPage int) (*PostList, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userId).Join("posts", "flagged"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) GetFlaggedPostsForUserInTeam(ctx context.Context, userId string, teamId string, page int, perPage int) (*PostList, *Response, error) {
	if !IsValidId(teamId) {
		return nil, nil, errors.New("teamId is invalid")
	}
	values := url.Values{}
	values.Set("team_id", teamId)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userId).Join("posts", "flagged"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) GetFlaggedPostsForUserInChannel(ctx context.Context, userId string, channelId string, page int, perPage int) (*PostList, *Response, error) {
	if !IsValidId(channelId) {
		return nil, nil, errors.New("channelId is invalid")
	}
	values := url.Values{}
	values.Set("channel_id", channelId)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userId).Join("posts", "flagged"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) GetPostsSince(ctx context.Context, channelId string, time int64, collapsedThreads bool) (*PostList, *Response, error) {
	values := url.Values{}
	values.Set("since", strconv.FormatInt(time, 10))
	values.Set("collapsedThreads", c.boolString(collapsedThreads))
	r, err := c.doAPIGetWithQuery(ctx, c.channelRoute(channelId).Join("posts"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) GetPostsAfter(ctx context.Context, channelId, postId string, page, perPage int, etag string, collapsedThreads bool, includeDeleted bool) (*PostList, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("after", postId)
	values.Set("collapsedThreads", c.boolString(collapsedThreads))
	values.Set("include_deleted", c.boolString(includeDeleted))
	r, err := c.doAPIGetWithQuery(ctx, c.channelRoute(channelId).Join("posts"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) GetPostsBefore(ctx context.Context, channelId, postId string, page, perPage int, etag string, collapsedThreads bool, includeDeleted bool) (*PostList, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("before", postId)
	values.Set("collapsedThreads", c.boolString(collapsedThreads))
	values.Set("include_deleted", c.boolString(includeDeleted))
	r, err := c.doAPIGetWithQuery(ctx, c.channelRoute(channelId).Join("posts"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) MoveThread(ctx context.Context, postId string, params *MoveThreadParams) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.postRoute(postId).Join("move"), params)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetPostsAroundLastUnread(ctx context.Context, userId, channelId string, limitBefore, limitAfter int, collapsedThreads bool) (*PostList, *Response, error) {
	values := url.Values{}
	values.Set("limit_before", strconv.Itoa(limitBefore))
	values.Set("limit_after", strconv.Itoa(limitAfter))
	values.Set("collapsedThreads", c.boolString(collapsedThreads))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userId).Join(c.channelRoute(channelId), "posts", "unread"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) CreateScheduledPost(ctx context.Context, scheduledPost *ScheduledPost) (*ScheduledPost, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.postsRoute().Join("schedule"), scheduledPost)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ScheduledPost](r)
}
func (c *Client4) GetUserScheduledPosts(ctx context.Context, teamId string, includeDirectChannels bool) (map[string][]*ScheduledPost, *Response, error) {
	values := url.Values{}
	values.Set("includeDirectChannels", fmt.Sprintf("%t", includeDirectChannels))
	r, err := c.doAPIGetWithQuery(ctx, c.postsRoute().Join("scheduled", "team", teamId), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string][]*ScheduledPost](r)
}
func (c *Client4) UpdateScheduledPost(ctx context.Context, scheduledPost *ScheduledPost) (*ScheduledPost, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.postsRoute().Join("schedule", scheduledPost.Id), scheduledPost)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ScheduledPost](r)
}
func (c *Client4) DeleteScheduledPost(ctx context.Context, scheduledPostId string) (*ScheduledPost, *Response, error) {
	r, err := c.doAPIDelete(ctx, c.postsRoute().Join("schedule", scheduledPostId))
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ScheduledPost](r)
}
func (c *Client4) GetPostsForReporting(ctx context.Context, options ReportPostOptions, cursor ReportPostOptionsCursor) (*ReportPostListResponse, *Response, error) {
	request := struct {
		ReportPostOptions
		ReportPostOptionsCursor
	}{
		ReportPostOptions:       options,
		ReportPostOptionsCursor: cursor,
	}
	r, err := c.doAPIPostJSON(ctx, c.reportsRoute().Join("posts"), request)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ReportPostListResponse](r)
}
func (c *Client4) FlagPostForContentReview(ctx context.Context, postId string, flagRequest *FlagContentRequest) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.contentFlaggingRoute().Join("post", postId, "flag"), flagRequest)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetContentFlaggedPost(ctx context.Context, postId string) (*Post, *Response, error) {
	r, err := c.doAPIGet(ctx, c.contentFlaggingRoute().Join("post", postId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Post](r)
}
func (c *Client4) GetFlaggingConfiguration(ctx context.Context) (*ContentFlaggingReportingConfig, *Response, error) {
	r, err := c.doAPIGet(ctx, c.contentFlaggingRoute().Join("flag", "config"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ContentFlaggingReportingConfig](r)
}
func (c *Client4) GetFlaggingConfigurationForTeam(ctx context.Context, teamId string) (*ContentFlaggingReportingConfig, *Response, error) {
	values := url.Values{}
	values.Set("team_id", teamId)
	r, err := c.doAPIGetWithQuery(ctx, c.contentFlaggingRoute().Join("flag", "config"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ContentFlaggingReportingConfig](r)
}
func (c *Client4) GetTeamPostFlaggingFeatureStatus(ctx context.Context, teamId string) (map[string]bool, *Response, error) {
	r, err := c.doAPIGet(ctx, c.contentFlaggingRoute().Join("team", teamId, "status"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]bool](r)
}
func (c *Client4) SaveContentFlaggingSettings(ctx context.Context, config *ContentFlaggingSettingsRequest) (*Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.contentFlaggingRoute().Join("config"), config)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetContentFlaggingSettings(ctx context.Context) (*ContentFlaggingSettingsRequest, *Response, error) {
	r, err := c.doAPIGet(ctx, c.contentFlaggingRoute().Join("config"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ContentFlaggingSettingsRequest](r)
}
func (c *Client4) AssignContentFlaggingReviewer(ctx context.Context, postId, reviewerId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.contentFlaggingRoute().Join("post", postId, "assign", reviewerId), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) SearchContentFlaggingReviewers(ctx context.Context, teamID, term string) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("term", term)
	r, err := c.doAPIGetWithQuery(ctx, c.contentFlaggingRoute().Join("team", teamID, "reviewers", "search"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) RemoveFlaggedPost(ctx context.Context, postId string, actionRequest *FlagContentActionRequest) (*Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.contentFlaggingRoute().Join("post", postId, "remove"), actionRequest)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) KeepFlaggedPost(ctx context.Context, postId string, actionRequest *FlagContentActionRequest) (*Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.contentFlaggingRoute().Join("post", postId, "keep"), actionRequest)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) SearchFiles(ctx context.Context, teamId string, terms string, isOrSearch bool) (*FileInfoList, *Response, error) {
	params := SearchParameter{
		Terms:      &terms,
		IsOrSearch: &isOrSearch,
	}
	return c.SearchFilesWithParams(ctx, teamId, &params)
}
func (c *Client4) SearchFilesWithParams(ctx context.Context, teamId string, params *SearchParameter) (*FileInfoList, *Response, error) {
	var route clientRoute
	if teamId == "" {
		route = c.filesRoute().Join("search")
	} else {
		route = c.teamRoute(teamId).Join("files", "search")
	}
	r, err := c.doAPIPostJSON(ctx, route, params)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*FileInfoList](r)
}
func (c *Client4) SearchFilesAcrossTeams(ctx context.Context, terms string, isOrSearch bool) (*FileInfoList, *Response, error) {
	params := SearchParameter{
		Terms:      &terms,
		IsOrSearch: &isOrSearch,
	}
	return c.SearchFilesWithParams(ctx, "", &params)
}
func (c *Client4) SearchPosts(ctx context.Context, teamId string, terms string, isOrSearch bool) (*PostList, *Response, error) {
	params := SearchParameter{
		Terms:      &terms,
		IsOrSearch: &isOrSearch,
	}
	return c.SearchPostsWithParams(ctx, teamId, &params)
}
func (c *Client4) SearchPostsWithParams(ctx context.Context, teamId string, params *SearchParameter) (*PostList, *Response, error) {
	var route clientRoute
	if teamId == "" {
		route = c.postsRoute().Join("search")
	} else {
		route = c.teamRoute(teamId).Join("posts", "search")
	}
	r, err := c.doAPIPostJSON(ctx, route, params)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostList](r)
}
func (c *Client4) SearchPostsWithMatches(ctx context.Context, teamId string, terms string, isOrSearch bool) (*PostSearchResults, *Response, error) {
	requestBody := map[string]any{"terms": terms, "is_or_search": isOrSearch}
	var route clientRoute
	if teamId == "" {
		route = c.postsRoute().Join("search")
	} else {
		route = c.teamRoute(teamId).Join("posts", "search")
	}
	r, err := c.doAPIPostJSON(ctx, route, requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostSearchResults](r)
}
func (c *Client4) DoPostAction(ctx context.Context, postId, actionId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.postRoute(postId).Join("actions", actionId), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DoPostActionWithCookie(ctx context.Context, postId, actionId, selected, cookieStr string) (*Response, error) {
	route := c.postRoute(postId).Join("actions", actionId)
	if selected == "" && cookieStr == "" {
		r, err := c.doAPIPost(ctx, route, "")
		if err != nil {
			return BuildResponse(r), err
		}
		defer closeBody(r)
		return BuildResponse(r), nil
	}
	req := DoPostActionRequest{
		SelectedOption: selected,
		Cookie:         cookieStr,
	}
	r, err := c.doAPIPostJSON(ctx, route, req)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) OpenInteractiveDialog(ctx context.Context, request OpenDialogRequest) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.dialogsRoute().Join("open"), request)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) SubmitInteractiveDialog(ctx context.Context, request SubmitDialogRequest) (*SubmitDialogResponse, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.dialogsRoute().Join("submit"), request)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*SubmitDialogResponse](r)
}
func (c *Client4) LookupInteractiveDialog(ctx context.Context, request SubmitDialogRequest) (*LookupDialogResponse, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.dialogsRoute().Join("lookup"), request)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*LookupDialogResponse](r)
}
func (c *Client4) UploadFile(ctx context.Context, data []byte, channelId string, filename string) (*FileUploadResponse, *Response, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormField("channel_id")
	if err != nil {
		return nil, nil, err
	}
	_, err = io.Copy(part, strings.NewReader(channelId))
	if err != nil {
		return nil, nil, err
	}
	part, err = writer.CreateFormFile("files", filename)
	if err != nil {
		return nil, nil, err
	}
	_, err = io.Copy(part, bytes.NewBuffer(data))
	if err != nil {
		return nil, nil, err
	}
	err = writer.Close()
	if err != nil {
		return nil, nil, err
	}
	return c.doUploadFile(ctx, c.filesRoute(), body.Bytes(), writer.FormDataContentType())
}
func (c *Client4) UploadFileAsRequestBody(ctx context.Context, data []byte, channelId string, filename string) (*FileUploadResponse, *Response, error) {
	values := url.Values{}
	values.Set("channel_id", channelId)
	values.Set("filename", filename)
	return c.doUploadFileWithQuery(ctx, c.filesRoute(), values, data, http.DetectContentType(data))
}
func (c *Client4) GetFile(ctx context.Context, fileId string) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.fileRoute(fileId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) GetFileAsContentReviewer(ctx context.Context, fileId, flaggedPostId string) ([]byte, *Response, error) {
	values := url.Values{}
	values.Set(AsContentReviewerParam, c.boolString(true))
	values.Set("flagged_post_id", flaggedPostId)
	r, err := c.doAPIGetWithQuery(ctx, c.fileRoute(fileId), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) DownloadFile(ctx context.Context, fileId string, download bool) ([]byte, *Response, error) {
	values := url.Values{}
	values.Set("download", c.boolString(download))
	r, err := c.doAPIGetWithQuery(ctx, c.fileRoute(fileId), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) GetFileThumbnail(ctx context.Context, fileId string) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.fileRoute(fileId).Join("thumbnail"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) DownloadFileThumbnail(ctx context.Context, fileId string, download bool) ([]byte, *Response, error) {
	values := url.Values{}
	values.Set("download", c.boolString(download))
	r, err := c.doAPIGetWithQuery(ctx, c.fileRoute(fileId).Join("thumbnail"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) GetFileLink(ctx context.Context, fileId string) (string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.fileRoute(fileId).Join("link"), "")
	if err != nil {
		return "", BuildResponse(r), err
	}
	defer closeBody(r)
	result, resp, err := DecodeJSONFromResponse[map[string]string](r)
	if err != nil {
		return "", resp, err
	}
	return result["link"], resp, nil
}
func (c *Client4) GetFilePreview(ctx context.Context, fileId string) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.fileRoute(fileId).Join("preview"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) DownloadFilePreview(ctx context.Context, fileId string, download bool) ([]byte, *Response, error) {
	values := url.Values{}
	values.Set("download", c.boolString(download))
	r, err := c.doAPIGetWithQuery(ctx, c.fileRoute(fileId).Join("preview"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) GetFileInfo(ctx context.Context, fileId string) (*FileInfo, *Response, error) {
	r, err := c.doAPIGet(ctx, c.fileRoute(fileId).Join("info"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*FileInfo](r)
}
func (c *Client4) GetFileInfosForPost(ctx context.Context, postId string, etag string) ([]*FileInfo, *Response, error) {
	r, err := c.doAPIGet(ctx, c.postRoute(postId).Join("files", "info"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*FileInfo](r)
}
func (c *Client4) GetFileInfosForPostIncludeDeleted(ctx context.Context, postId string, etag string) ([]*FileInfo, *Response, error) {
	values := url.Values{}
	values.Set("include_deleted", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.postRoute(postId).Join("files", "info"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*FileInfo](r)
}
func (c *Client4) GenerateSupportPacket(ctx context.Context) (io.ReadCloser, string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.systemRoute().Join("support_packet"), "")
	if err != nil {
		return nil, "", BuildResponse(r), err
	}
	_, params, err := mime.ParseMediaType(r.Header.Get("Content-Disposition"))
	if err != nil {
		return nil, "", BuildResponse(r), fmt.Errorf("could not parse Content-Disposition header: %w", err)
	}
	return r.Body, params["filename"], BuildResponse(r), nil
}
func (c *Client4) GetPing(ctx context.Context) (string, *Response, error) {
	ping, resp, err := c.GetPingWithOptions(ctx, SystemPingOptions{})
	status := ""
	if ping != nil {
		status = ping["status"].(string)
	}
	return status, resp, err
}
func (c *Client4) GetPingWithServerStatus(ctx context.Context) (string, *Response, error) {
	ping, resp, err := c.GetPingWithOptions(ctx, SystemPingOptions{FullStatus: true})
	status := ""
	if ping != nil {
		status = ping["status"].(string)
	}
	return status, resp, err
}
func (c *Client4) GetPingWithFullServerStatus(ctx context.Context) (map[string]any, *Response, error) {
	return c.GetPingWithOptions(ctx, SystemPingOptions{FullStatus: true})
}
func (c *Client4) GetPingWithOptions(ctx context.Context, options SystemPingOptions) (map[string]any, *Response, error) {
	values := url.Values{}
	values.Set("get_server_status", c.boolString(options.FullStatus))
	values.Set("use_rest_semantics", c.boolString(options.RESTSemantics))
	r, err := c.doAPIGetWithQuery(ctx, c.systemRoute().Join("ping"), values, "")
	if r != nil && r.StatusCode == 500 {
		defer r.Body.Close()
		return map[string]any{"status": StatusUnhealthy}, BuildResponse(r), err
	}
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]any](r)
}
func (c *Client4) GetServerLimits(ctx context.Context) (*ServerLimits, *Response, error) {
	r, err := c.doAPIGet(ctx, c.limitsRoute().Join("server"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ServerLimits](r)
}
func (c *Client4) TestEmail(ctx context.Context, config *Config) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.testEmailRoute(), config)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) TestNotifications(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.testNotificationRoute(), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) TestSiteURL(ctx context.Context, siteURL string) (*Response, error) {
	requestBody := make(map[string]string)
	requestBody["site_url"] = siteURL
	r, err := c.doAPIPostJSON(ctx, c.testSiteURLRoute(), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) TestS3Connection(ctx context.Context, config *Config) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.testS3Route(), config)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetConfig(ctx context.Context) (*Config, *Response, error) {
	r, err := c.doAPIGet(ctx, c.configRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Config](r)
}
func (c *Client4) GetConfigWithOptions(ctx context.Context, options GetConfigOptions) (map[string]any, *Response, error) {
	values := url.Values{}
	if options.RemoveDefaults {
		values.Set("remove_defaults", "true")
	}
	if options.RemoveMasked {
		values.Set("remove_masked", "true")
	}
	r, err := c.doAPIGetWithQuery(ctx, c.configRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]any](r)
}
func (c *Client4) ReloadConfig(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.configRoute().Join("reload"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetClientConfig(ctx context.Context, etag string) (map[string]string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.configRoute().Join("client"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]string](r)
}
func (c *Client4) GetEnvironmentConfig(ctx context.Context) (map[string]any, *Response, error) {
	r, err := c.doAPIGet(ctx, c.configRoute().Join("environment"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return StringInterfaceFromJSON(r.Body), BuildResponse(r), nil
}
func (c *Client4) GetOldClientLicense(ctx context.Context, etag string) (map[string]string, *Response, error) {
	values := url.Values{}
	values.Set("format", "old")
	r, err := c.doAPIGetWithQuery(ctx, c.licenseRoute().Join("client"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]string](r)
}
func (c *Client4) DatabaseRecycle(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.databaseRoute().Join("recycle"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) InvalidateCaches(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.cacheRoute().Join("invalidate"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateConfig(ctx context.Context, config *Config) (*Config, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.configRoute(), config)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Config](r)
}
func (c *Client4) MigrateConfig(ctx context.Context, from, to string) (*Response, error) {
	m := make(map[string]string, 2)
	m["from"] = from
	m["to"] = to
	r, err := c.doAPIPostJSON(ctx, c.configRoute().Join("migrate"), m)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UploadLicenseFile(ctx context.Context, data []byte) (*Response, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("license", "test-license.mattermost-license")
	if err != nil {
		return nil, fmt.Errorf("failed to create form file for license upload: %w", err)
	}
	if _, err = io.Copy(part, bytes.NewBuffer(data)); err != nil {
		return nil, fmt.Errorf("failed to copy license data to form file: %w", err)
	}
	if err = writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer for license upload: %w", err)
	}
	r, err := c.doAPIRequestReaderRoute(ctx, http.MethodPost, c.licenseRoute(), writer.FormDataContentType(), body, nil)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) RemoveLicenseFile(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.licenseRoute())
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetLicenseLoadMetric(ctx context.Context) (map[string]int, *Response, error) {
	r, err := c.doAPIGet(ctx, c.licenseRoute().Join("load_metric"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]int](r)
}
func (c *Client4) GetAnalyticsOld(ctx context.Context, name, teamId string) (AnalyticsRows, *Response, error) {
	values := url.Values{}
	values.Set("name", name)
	values.Set("team_id", teamId)
	r, err := c.doAPIGetWithQuery(ctx, c.analyticsRoute().Join("old"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[AnalyticsRows](r)
}
func (c *Client4) CreateIncomingWebhook(ctx context.Context, hook *IncomingWebhook) (*IncomingWebhook, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.incomingWebhooksRoute(), hook)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*IncomingWebhook](r)
}
func (c *Client4) UpdateIncomingWebhook(ctx context.Context, hook *IncomingWebhook) (*IncomingWebhook, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.incomingWebhookRoute(hook.Id), hook)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*IncomingWebhook](r)
}
func (c *Client4) GetIncomingWebhooks(ctx context.Context, page int, perPage int, etag string) ([]*IncomingWebhook, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.incomingWebhooksRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*IncomingWebhook](r)
}
func (c *Client4) GetIncomingWebhooksWithCount(ctx context.Context, page int, perPage int, etag string) (*IncomingWebhooksWithCount, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("include_total_count", c.boolString(true))
	r, err := c.doAPIGetWithQuery(ctx, c.incomingWebhooksRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*IncomingWebhooksWithCount](r)
}
func (c *Client4) GetIncomingWebhooksForTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*IncomingWebhook, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("team_id", teamId)
	r, err := c.doAPIGetWithQuery(ctx, c.incomingWebhooksRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*IncomingWebhook](r)
}
func (c *Client4) GetIncomingWebhook(ctx context.Context, hookID string, etag string) (*IncomingWebhook, *Response, error) {
	r, err := c.doAPIGet(ctx, c.incomingWebhookRoute(hookID), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*IncomingWebhook](r)
}
func (c *Client4) DeleteIncomingWebhook(ctx context.Context, hookID string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.incomingWebhookRoute(hookID))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) CreateOutgoingWebhook(ctx context.Context, hook *OutgoingWebhook) (*OutgoingWebhook, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.outgoingWebhooksRoute(), hook)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OutgoingWebhook](r)
}
func (c *Client4) UpdateOutgoingWebhook(ctx context.Context, hook *OutgoingWebhook) (*OutgoingWebhook, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.outgoingWebhookRoute(hook.Id), hook)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OutgoingWebhook](r)
}
func (c *Client4) GetOutgoingWebhooks(ctx context.Context, page int, perPage int, etag string) ([]*OutgoingWebhook, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.outgoingWebhooksRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*OutgoingWebhook](r)
}
func (c *Client4) GetOutgoingWebhook(ctx context.Context, hookId string) (*OutgoingWebhook, *Response, error) {
	r, err := c.doAPIGet(ctx, c.outgoingWebhookRoute(hookId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OutgoingWebhook](r)
}
func (c *Client4) GetOutgoingWebhooksForChannel(ctx context.Context, channelId string, page int, perPage int, etag string) ([]*OutgoingWebhook, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("channel_id", channelId)
	r, err := c.doAPIGetWithQuery(ctx, c.outgoingWebhooksRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*OutgoingWebhook](r)
}
func (c *Client4) GetOutgoingWebhooksForTeam(ctx context.Context, teamId string, page int, perPage int, etag string) ([]*OutgoingWebhook, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("team_id", teamId)
	r, err := c.doAPIGetWithQuery(ctx, c.outgoingWebhooksRoute(), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*OutgoingWebhook](r)
}
func (c *Client4) RegenOutgoingHookToken(ctx context.Context, hookId string) (*OutgoingWebhook, *Response, error) {
	r, err := c.doAPIPost(ctx, c.outgoingWebhookRoute(hookId).Join("regen_token"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OutgoingWebhook](r)
}
func (c *Client4) DeleteOutgoingWebhook(ctx context.Context, hookId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.outgoingWebhookRoute(hookId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetPreferences(ctx context.Context, userId string) (Preferences, *Response, error) {
	r, err := c.doAPIGet(ctx, c.preferencesRoute(userId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[Preferences](r)
}
func (c *Client4) UpdatePreferences(ctx context.Context, userId string, preferences Preferences) (*Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.preferencesRoute(userId), preferences)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DeletePreferences(ctx context.Context, userId string, preferences Preferences) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.preferencesRoute(userId).Join("delete"), preferences)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetPreferencesByCategory(ctx context.Context, userId string, category string) (Preferences, *Response, error) {
	r, err := c.doAPIGet(ctx, c.preferencesRoute(userId).Join(category), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[Preferences](r)
}
func (c *Client4) GetPreferenceByCategoryAndName(ctx context.Context, userId string, category string, preferenceName string) (*Preference, *Response, error) {
	r, err := c.doAPIGet(ctx, c.preferencesRoute(userId).Join(category, "name", preferenceName), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Preference](r)
}
func (c *Client4) GetSamlMetadata(ctx context.Context) (string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.samlRoute().Join("metadata"), "")
	if err != nil {
		return "", BuildResponse(r), err
	}
	defer closeBody(r)
	buf := new(bytes.Buffer)
	_, err = buf.ReadFrom(r.Body)
	if err != nil {
		return "", BuildResponse(r), err
	}
	return buf.String(), BuildResponse(r), nil
}
func fileToMultipart(data []byte, filename string) ([]byte, *multipart.Writer, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("certificate", filename)
	if err != nil {
		return nil, nil, err
	}
	if _, err = io.Copy(part, bytes.NewBuffer(data)); err != nil {
		return nil, nil, err
	}
	if err = writer.Close(); err != nil {
		return nil, nil, err
	}
	return body.Bytes(), writer, nil
}
func (c *Client4) UploadSamlIdpCertificate(ctx context.Context, data []byte, filename string) (*Response, error) {
	body, writer, err := fileToMultipart(data, filename)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare SAML IDP certificate for upload: %w", err)
	}
	_, resp, err := c.doUploadFile(ctx, c.samlRoute().Join("certificate", "idp"), body, writer.FormDataContentType())
	return resp, err
}
func (c *Client4) UploadSamlPublicCertificate(ctx context.Context, data []byte, filename string) (*Response, error) {
	body, writer, err := fileToMultipart(data, filename)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare SAML public certificate for upload: %w", err)
	}
	_, resp, err := c.doUploadFile(ctx, c.samlRoute().Join("certificate", "public"), body, writer.FormDataContentType())
	return resp, err
}
func (c *Client4) UploadSamlPrivateCertificate(ctx context.Context, data []byte, filename string) (*Response, error) {
	body, writer, err := fileToMultipart(data, filename)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare SAML private certificate for upload: %w", err)
	}
	_, resp, err := c.doUploadFile(ctx, c.samlRoute().Join("certificate", "private"), body, writer.FormDataContentType())
	return resp, err
}
func (c *Client4) DeleteSamlIdpCertificate(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.samlRoute().Join("certificate", "idp"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DeleteSamlPublicCertificate(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.samlRoute().Join("certificate", "public"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DeleteSamlPrivateCertificate(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.samlRoute().Join("certificate", "private"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetSamlCertificateStatus(ctx context.Context) (*SamlCertificateStatus, *Response, error) {
	r, err := c.doAPIGet(ctx, c.samlRoute().Join("certificate", "status"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*SamlCertificateStatus](r)
}
func (c *Client4) GetSamlMetadataFromIdp(ctx context.Context, samlMetadataURL string) (*SamlMetadataResponse, *Response, error) {
	requestBody := make(map[string]string)
	requestBody["saml_metadata_url"] = samlMetadataURL
	r, err := c.doAPIPostJSON(ctx, c.samlRoute().Join("metadatafromidp"), requestBody)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*SamlMetadataResponse](r)
}
func (c *Client4) ResetSamlAuthDataToEmail(ctx context.Context, includeDeleted bool, dryRun bool, userIDs []string) (int64, *Response, error) {
	params := map[string]any{
		"include_deleted": includeDeleted,
		"dry_run":         dryRun,
		"user_ids":        userIDs,
	}
	r, err := c.doAPIPostJSON(ctx, c.samlRoute().Join("reset_auth_data"), params)
	if err != nil {
		return 0, BuildResponse(r), err
	}
	defer closeBody(r)
	respBody, resp, err := DecodeJSONFromResponse[map[string]int64](r)
	if err != nil {
		return 0, resp, err
	}
	return respBody["num_affected"], resp, nil
}
func (c *Client4) CreateComplianceReport(ctx context.Context, report *Compliance) (*Compliance, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.complianceReportsRoute(), report)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Compliance](r)
}
func (c *Client4) GetComplianceReports(ctx context.Context, page, perPage int) (Compliances, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.complianceReportsRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[Compliances](r)
}
func (c *Client4) GetComplianceReport(ctx context.Context, reportId string) (*Compliance, *Response, error) {
	r, err := c.doAPIGet(ctx, c.complianceReportRoute(reportId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Compliance](r)
}
func (c *Client4) DownloadComplianceReport(ctx context.Context, reportId string) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.complianceReportDownloadRoute(reportId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) GetClusterStatus(ctx context.Context) ([]*ClusterInfo, *Response, error) {
	r, err := c.doAPIGet(ctx, c.clusterRoute().Join("status"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*ClusterInfo](r)
}
func (c *Client4) SyncLdap(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.ldapRoute().Join("sync"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) TestLdap(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.ldapRoute().Join("test"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetLdapGroups(ctx context.Context) ([]*Group, *Response, error) {
	r, err := c.doAPIGet(ctx, c.ldapRoute().Join("groups"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	responseData, resp, err := DecodeJSONFromResponse[struct {
		Count  int      `json:"count"`
		Groups []*Group `json:"groups"`
	}](r)
	if err != nil {
		return nil, BuildResponse(r), fmt.Errorf("failed to decode LDAP groups response: %w", err)
	}
	for i := range responseData.Groups {
		responseData.Groups[i].DisplayName = *responseData.Groups[i].Name
	}
	return responseData.Groups, resp, nil
}
func (c *Client4) LinkLdapGroup(ctx context.Context, dn string) (*Group, *Response, error) {
	r, err := c.doAPIPost(ctx, c.ldapRoute().Join("groups", dn, "link"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Group](r)
}
func (c *Client4) UnlinkLdapGroup(ctx context.Context, dn string) (*Group, *Response, error) {
	r, err := c.doAPIDelete(ctx, c.ldapRoute().Join("groups", dn, "link"))
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Group](r)
}
func (c *Client4) MigrateIdLdap(ctx context.Context, toAttribute string) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.ldapRoute().Join("migrateid"), map[string]string{
		"toAttribute": toAttribute,
	})
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetGroupsByNames(ctx context.Context, names []string) ([]*Group, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.groupsRoute().Join("names"), names)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Group](r)
}
func (c *Client4) GetGroupsByChannel(ctx context.Context, channelId string, opts GroupSearchOpts) ([]*GroupWithSchemeAdmin, int, *Response, error) {
	values := url.Values{}
	values.Set("q", opts.Q)
	values.Set("include_member_count", c.boolString(opts.IncludeMemberCount))
	values.Set("filter_allow_reference", c.boolString(opts.FilterAllowReference))
	if opts.PageOpts != nil {
		values.Set("page", strconv.Itoa(opts.PageOpts.Page))
		values.Set("per_page", strconv.Itoa(opts.PageOpts.PerPage))
	}
	r, err := c.doAPIGetWithQuery(ctx, c.channelRoute(channelId).Join("groups"), values, "")
	if err != nil {
		return nil, 0, BuildResponse(r), err
	}
	defer closeBody(r)
	responseData, resp, err := DecodeJSONFromResponse[struct {
		Groups []*GroupWithSchemeAdmin `json:"groups"`
		Count  int                     `json:"total_group_count"`
	}](r)
	if err != nil {
		return nil, 0, BuildResponse(r), fmt.Errorf("failed to decode groups by channel response: %w", err)
	}
	return responseData.Groups, responseData.Count, resp, nil
}
func (c *Client4) GetGroupsByTeam(ctx context.Context, teamId string, opts GroupSearchOpts) ([]*GroupWithSchemeAdmin, int, *Response, error) {
	values := url.Values{}
	values.Set("q", opts.Q)
	values.Set("include_member_count", c.boolString(opts.IncludeMemberCount))
	values.Set("filter_allow_reference", c.boolString(opts.FilterAllowReference))
	if opts.PageOpts != nil {
		values.Set("page", strconv.Itoa(opts.PageOpts.Page))
		values.Set("per_page", strconv.Itoa(opts.PageOpts.PerPage))
	}
	r, err := c.doAPIGetWithQuery(ctx, c.teamRoute(teamId).Join("groups"), values, "")
	if err != nil {
		return nil, 0, BuildResponse(r), err
	}
	defer closeBody(r)
	responseData, resp, err := DecodeJSONFromResponse[struct {
		Groups []*GroupWithSchemeAdmin `json:"groups"`
		Count  int                     `json:"total_group_count"`
	}](r)
	if err != nil {
		return nil, 0, BuildResponse(r), fmt.Errorf("failed to decode groups by team response: %w", err)
	}
	return responseData.Groups, responseData.Count, resp, nil
}
func (c *Client4) GetGroupsAssociatedToChannelsByTeam(ctx context.Context, teamId string, opts GroupSearchOpts) (map[string][]*GroupWithSchemeAdmin, *Response, error) {
	values := url.Values{}
	values.Set("q", opts.Q)
	values.Set("filter_allow_reference", c.boolString(opts.FilterAllowReference))
	if opts.PageOpts != nil {
		values.Set("page", strconv.Itoa(opts.PageOpts.Page))
		values.Set("per_page", strconv.Itoa(opts.PageOpts.PerPage))
	}
	r, err := c.doAPIGetWithQuery(ctx, c.teamRoute(teamId).Join("groups_by_channels"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	responseData, resp, err := DecodeJSONFromResponse[struct {
		GroupsAssociatedToChannels map[string][]*GroupWithSchemeAdmin `json:"groups"`
	}](r)
	if err != nil {
		return nil, BuildResponse(r), fmt.Errorf("failed to decode groups associated to channels by team response: %w", err)
	}
	return responseData.GroupsAssociatedToChannels, resp, nil
}
func (c *Client4) GetGroups(ctx context.Context, opts GroupSearchOpts) ([]*Group, *Response, error) {
	values := url.Values{}
	values.Set("include_member_count", fmt.Sprintf("%v", opts.IncludeMemberCount))
	values.Set("not_associated_to_team", opts.NotAssociatedToTeam)
	values.Set("not_associated_to_channel", opts.NotAssociatedToChannel)
	values.Set("filter_allow_reference", fmt.Sprintf("%v", opts.FilterAllowReference))
	values.Set("q", opts.Q)
	values.Set("filter_parent_team_permitted", fmt.Sprintf("%v", opts.FilterParentTeamPermitted))
	values.Set("group_source", string(opts.Source))
	values.Set("include_channel_member_count", opts.IncludeChannelMemberCount)
	values.Set("include_timezones", fmt.Sprintf("%v", opts.IncludeTimezones))
	values.Set("include_archived", fmt.Sprintf("%v", opts.IncludeArchived))
	values.Set("filter_archived", fmt.Sprintf("%v", opts.FilterArchived))
	values.Set("only_syncable_sources", fmt.Sprintf("%v", opts.OnlySyncableSources))
	if opts.Since > 0 {
		values.Set("since", fmt.Sprintf("%v", opts.Since))
	}
	if opts.PageOpts != nil {
		values.Set("page", fmt.Sprintf("%v", opts.PageOpts.Page))
		values.Set("per_page", fmt.Sprintf("%v", opts.PageOpts.PerPage))
	}
	r, err := c.doAPIGetWithQuery(ctx, c.groupsRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Group](r)
}
func (c *Client4) GetGroupsByUserId(ctx context.Context, userId string) ([]*Group, *Response, error) {
	r, err := c.doAPIGet(ctx, c.usersRoute().Join(userId, "groups"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Group](r)
}
func (c *Client4) MigrateAuthToLdap(ctx context.Context, fromAuthService string, matchField string, force bool) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("migrate_auth", "ldap"), map[string]any{
		"from":        fromAuthService,
		"force":       force,
		"match_field": matchField,
	})
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) MigrateAuthToSaml(ctx context.Context, fromAuthService string, usersMap map[string]string, auto bool) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("migrate_auth", "saml"), map[string]any{
		"from":    fromAuthService,
		"auto":    auto,
		"matches": usersMap,
	})
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UploadLdapPublicCertificate(ctx context.Context, data []byte) (*Response, error) {
	body, writer, err := fileToMultipart(data, LdapPublicCertificateName)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare LDAP public certificate for upload: %w", err)
	}
	_, resp, err := c.doUploadFile(ctx, c.ldapRoute().Join("certificate", "public"), body, writer.FormDataContentType())
	return resp, err
}
func (c *Client4) UploadLdapPrivateCertificate(ctx context.Context, data []byte) (*Response, error) {
	body, writer, err := fileToMultipart(data, LdapPrivateKeyName)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare LDAP private certificate for upload: %w", err)
	}
	_, resp, err := c.doUploadFile(ctx, c.ldapRoute().Join("certificate", "private"), body, writer.FormDataContentType())
	return resp, err
}
func (c *Client4) DeleteLdapPublicCertificate(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.ldapRoute().Join("certificate", "public"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DeleteLdapPrivateCertificate(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.ldapRoute().Join("certificate", "private"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetAudits(ctx context.Context, page int, perPage int, etag string) (Audits, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, newClientRoute("audits"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[Audits](r)
}
func (c *Client4) GetBrandImage(ctx context.Context) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.brandRoute().Join("image"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	if r.StatusCode >= 300 {
		return nil, BuildResponse(r), AppErrorFromJSON(r.Body)
	}
	return ReadBytesFromResponse(r)
}
func (c *Client4) DeleteBrandImage(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.brandRoute().Join("image"))
	if err != nil {
		return BuildResponse(r), err
	}
	return BuildResponse(r), nil
}
func (c *Client4) UploadBrandImage(ctx context.Context, data []byte) (*Response, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "brand.png")
	if err != nil {
		return nil, fmt.Errorf("failed to create form file for brand image upload: %w", err)
	}
	if _, err = io.Copy(part, bytes.NewBuffer(data)); err != nil {
		return nil, fmt.Errorf("failed to copy brand image data to form file: %w", err)
	}
	if err = writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer for brand image upload: %w", err)
	}
	r, err := c.doAPIRequestReaderRoute(ctx, http.MethodPost, c.brandRoute().Join("image"), writer.FormDataContentType(), body, nil)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetLogs(ctx context.Context, page, perPage int) ([]string, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("logs_per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.logsRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]string](r)
}
func (c *Client4) DownloadLogs(ctx context.Context) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.logsRoute().Join("download"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return ReadBytesFromResponse(r)
}
func (c *Client4) PostLog(ctx context.Context, message map[string]string) (map[string]string, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.logsRoute(), message)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]string](r)
}
func (c *Client4) CreateOAuthApp(ctx context.Context, app *OAuthApp) (*OAuthApp, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.oAuthAppsRoute(), app)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OAuthApp](r)
}
func (c *Client4) UpdateOAuthApp(ctx context.Context, app *OAuthApp) (*OAuthApp, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.oAuthAppRoute(app.Id), app)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OAuthApp](r)
}
func (c *Client4) GetOAuthApps(ctx context.Context, page, perPage int) ([]*OAuthApp, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.oAuthAppsRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*OAuthApp](r)
}
func (c *Client4) GetOAuthApp(ctx context.Context, appId string) (*OAuthApp, *Response, error) {
	r, err := c.doAPIGet(ctx, c.oAuthAppRoute(appId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OAuthApp](r)
}
func (c *Client4) GetOAuthAppInfo(ctx context.Context, appId string) (*OAuthApp, *Response, error) {
	r, err := c.doAPIGet(ctx, c.oAuthAppRoute(appId).Join("info"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OAuthApp](r)
}
func (c *Client4) DeleteOAuthApp(ctx context.Context, appId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.oAuthAppRoute(appId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) RegenerateOAuthAppSecret(ctx context.Context, appId string) (*OAuthApp, *Response, error) {
	r, err := c.doAPIPost(ctx, c.oAuthAppRoute(appId).Join("regen_secret"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OAuthApp](r)
}
func (c *Client4) RegisterOAuthClient(ctx context.Context, request *ClientRegistrationRequest) (*ClientRegistrationResponse, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.oAuthRegisterRoute(), request)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	var response ClientRegistrationResponse
	if err := json.NewDecoder(r.Body).Decode(&response); err != nil {
		return nil, nil, NewAppError("RegisterOAuthClient", "api.unmarshal_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return &response, BuildResponse(r), nil
}
func (c *Client4) GetAuthorizedOAuthAppsForUser(ctx context.Context, userId string, page, perPage int) ([]*OAuthApp, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.userRoute(userId).Join("oauth", "apps", "authorized"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*OAuthApp](r)
}
func (c *Client4) AuthorizeOAuthApp(ctx context.Context, authRequest *AuthorizeRequest) (string, *Response, error) {
	buf, err := json.Marshal(authRequest)
	if err != nil {
		return "", nil, err
	}
	r, err := c.doAPIRequestBytes(ctx, http.MethodPost, c.URL+"/oauth/authorize", buf, "")
	if err != nil {
		return "", BuildResponse(r), err
	}
	defer closeBody(r)
	result, resp, err := DecodeJSONFromResponse[map[string]string](r)
	if err != nil {
		return "", resp, err
	}
	return result["redirect"], resp, nil
}
func (c *Client4) DeauthorizeOAuthApp(ctx context.Context, appId string) (*Response, error) {
	requestData := map[string]string{"client_id": appId}
	buf, err := json.Marshal(requestData)
	if err != nil {
		return nil, err
	}
	r, err := c.doAPIRequestBytes(ctx, http.MethodPost, c.URL+"/oauth/deauthorize", buf, "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetOAuthAccessToken(ctx context.Context, data url.Values) (*AccessResponse, *Response, error) {
	r, err := c.doAPIRequestReader(ctx, http.MethodPost, c.URL+"/oauth/access_token", "application/x-www-form-urlencoded", strings.NewReader(data.Encode()), nil)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*AccessResponse](r)
}
func (c *Client4) GetOutgoingOAuthConnections(ctx context.Context, filters OutgoingOAuthConnectionGetConnectionsFilter) ([]*OutgoingOAuthConnection, *Response, error) {
	r, err := c.doAPIGetWithQuery(ctx, c.outgoingOAuthConnectionsRoute(), filters.ToURLValues(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*OutgoingOAuthConnection](r)
}
func (c *Client4) GetOutgoingOAuthConnection(ctx context.Context, id string) (*OutgoingOAuthConnection, *Response, error) {
	r, err := c.doAPIGet(ctx, c.outgoingOAuthConnectionRoute(id), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OutgoingOAuthConnection](r)
}
func (c *Client4) DeleteOutgoingOAuthConnection(ctx context.Context, id string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.outgoingOAuthConnectionRoute(id))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateOutgoingOAuthConnection(ctx context.Context, connection *OutgoingOAuthConnection) (*OutgoingOAuthConnection, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.outgoingOAuthConnectionRoute(connection.Id), connection)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OutgoingOAuthConnection](r)
}
func (c *Client4) CreateOutgoingOAuthConnection(ctx context.Context, connection *OutgoingOAuthConnection) (*OutgoingOAuthConnection, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.outgoingOAuthConnectionsRoute(), connection)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*OutgoingOAuthConnection](r)
}
func (c *Client4) TestElasticsearch(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.elasticsearchRoute().Join("test"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) PurgeElasticsearchIndexes(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.elasticsearchRoute().Join("purge_indexes"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetDataRetentionPolicy(ctx context.Context) (*GlobalRetentionPolicy, *Response, error) {
	r, err := c.doAPIGet(ctx, c.dataRetentionRoute().Join("policy"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*GlobalRetentionPolicy](r)
}
func (c *Client4) GetDataRetentionPolicyByID(ctx context.Context, policyID string) (*RetentionPolicyWithTeamAndChannelCounts, *Response, error) {
	r, err := c.doAPIGet(ctx, c.dataRetentionPolicyRoute(policyID), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*RetentionPolicyWithTeamAndChannelCounts](r)
}
func (c *Client4) GetDataRetentionPoliciesCount(ctx context.Context) (int64, *Response, error) {
	type CountBody struct {
		TotalCount int64 `json:"total_count"`
	}
	r, err := c.doAPIGet(ctx, c.dataRetentionRoute().Join("policies_count"), "")
	if err != nil {
		return 0, BuildResponse(r), err
	}
	countObj, resp, err := DecodeJSONFromResponse[CountBody](r)
	if err != nil {
		return 0, resp, err
	}
	return countObj.TotalCount, resp, nil
}
func (c *Client4) GetDataRetentionPolicies(ctx context.Context, page, perPage int) (*RetentionPolicyWithTeamAndChannelCountsList, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.dataRetentionRoute().Join("policies"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*RetentionPolicyWithTeamAndChannelCountsList](r)
}
func (c *Client4) CreateDataRetentionPolicy(ctx context.Context, policy *RetentionPolicyWithTeamAndChannelIDs) (*RetentionPolicyWithTeamAndChannelCounts, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.dataRetentionRoute().Join("policies"), policy)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*RetentionPolicyWithTeamAndChannelCounts](r)
}
func (c *Client4) DeleteDataRetentionPolicy(ctx context.Context, policyID string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.dataRetentionPolicyRoute(policyID))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) PatchDataRetentionPolicy(ctx context.Context, patch *RetentionPolicyWithTeamAndChannelIDs) (*RetentionPolicyWithTeamAndChannelCounts, *Response, error) {
	r, err := c.doAPIPatchJSON(ctx, c.dataRetentionPolicyRoute(patch.ID), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*RetentionPolicyWithTeamAndChannelCounts](r)
}
func (c *Client4) GetTeamsForRetentionPolicy(ctx context.Context, policyID string, page, perPage int) (*TeamsWithCount, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.dataRetentionPolicyRoute(policyID).Join("teams"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return DecodeJSONFromResponse[*TeamsWithCount](r)
}
func (c *Client4) SearchTeamsForRetentionPolicy(ctx context.Context, policyID string, term string) ([]*Team, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.dataRetentionPolicyRoute(policyID).Join("teams", "search"), map[string]any{"term": term})
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return DecodeJSONFromResponse[[]*Team](r)
}
func (c *Client4) AddTeamsToRetentionPolicy(ctx context.Context, policyID string, teamIDs []string) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.dataRetentionPolicyRoute(policyID).Join("teams"), teamIDs)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) RemoveTeamsFromRetentionPolicy(ctx context.Context, policyID string, teamIDs []string) (*Response, error) {
	r, err := c.doAPIDeleteJSON(ctx, c.dataRetentionPolicyRoute(policyID).Join("teams"), teamIDs)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetChannelsForRetentionPolicy(ctx context.Context, policyID string, page, perPage int) (*ChannelsWithCount, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.dataRetentionPolicyRoute(policyID).Join("channels"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return DecodeJSONFromResponse[*ChannelsWithCount](r)
}
func (c *Client4) SearchChannelsForRetentionPolicy(ctx context.Context, policyID string, term string) (ChannelListWithTeamData, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.dataRetentionPolicyRoute(policyID).Join("channels", "search"), map[string]any{"term": term})
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return DecodeJSONFromResponse[ChannelListWithTeamData](r)
}
func (c *Client4) AddChannelsToRetentionPolicy(ctx context.Context, policyID string, channelIDs []string) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.dataRetentionPolicyRoute(policyID).Join("channels"), channelIDs)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) RemoveChannelsFromRetentionPolicy(ctx context.Context, policyID string, channelIDs []string) (*Response, error) {
	r, err := c.doAPIDeleteJSON(ctx, c.dataRetentionPolicyRoute(policyID).Join("channels"), channelIDs)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetTeamPoliciesForUser(ctx context.Context, userID string, offset, limit int) (*RetentionPolicyForTeamList, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userID).Join("data_retention", "team_policies"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return DecodeJSONFromResponse[*RetentionPolicyForTeamList](r)
}
func (c *Client4) GetChannelPoliciesForUser(ctx context.Context, userID string, offset, limit int) (*RetentionPolicyForChannelList, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userID).Join("data_retention", "channel_policies"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return DecodeJSONFromResponse[*RetentionPolicyForChannelList](r)
}
func (c *Client4) UpsertDraft(ctx context.Context, draft *Draft) (*Draft, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.draftsRoute(), draft)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Draft](r)
}
func (c *Client4) GetDrafts(ctx context.Context, userId, teamId string) ([]*Draft, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join(c.teamRoute(teamId), "drafts"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Draft](r)
}
func (c *Client4) DeleteDraft(ctx context.Context, userId, channelId, rootId string) (*Draft, *Response, error) {
	r, err := c.doAPIDelete(ctx, c.userRoute(userId).Join(c.channelRoute(channelId), "drafts"))
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Draft](r)
}
func (c *Client4) CreateCommand(ctx context.Context, cmd *Command) (*Command, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.commandsRoute(), cmd)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Command](r)
}
func (c *Client4) UpdateCommand(ctx context.Context, cmd *Command) (*Command, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.commandRoute(cmd.Id), cmd)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Command](r)
}
func (c *Client4) MoveCommand(ctx context.Context, teamId string, commandId string) (*Response, error) {
	cmr := CommandMoveRequest{TeamId: teamId}
	r, err := c.doAPIPutJSON(ctx, c.commandMoveRoute(commandId), cmr)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DeleteCommand(ctx context.Context, commandId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.commandRoute(commandId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) ListCommands(ctx context.Context, teamId string, customOnly bool) ([]*Command, *Response, error) {
	values := url.Values{}
	values.Set("team_id", teamId)
	values.Set("custom_only", c.boolString(customOnly))
	r, err := c.doAPIGetWithQuery(ctx, c.commandsRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Command](r)
}
func (c *Client4) ListCommandAutocompleteSuggestions(ctx context.Context, userInput, teamId string) ([]AutocompleteSuggestion, *Response, error) {
	values := url.Values{}
	values.Set("user_input", userInput)
	r, err := c.doAPIGetWithQuery(ctx, c.teamRoute(teamId).Join("commands", "autocomplete_suggestions"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]AutocompleteSuggestion](r)
}
func (c *Client4) GetCommandById(ctx context.Context, cmdId string) (*Command, *Response, error) {
	r, err := c.doAPIGet(ctx, c.commandsRoute().Join(cmdId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Command](r)
}
func (c *Client4) ExecuteCommand(ctx context.Context, channelId, command string) (*CommandResponse, *Response, error) {
	commandArgs := &CommandArgs{
		ChannelId: channelId,
		Command:   command,
	}
	r, err := c.doAPIPostJSON(ctx, c.commandsRoute().Join("execute"), commandArgs)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	response, err := CommandResponseFromJSON(r.Body)
	if err != nil {
		return nil, BuildResponse(r), fmt.Errorf("failed to decode command response: %w", err)
	}
	return response, BuildResponse(r), nil
}
func (c *Client4) ExecuteCommandWithTeam(ctx context.Context, channelId, teamId, command string) (*CommandResponse, *Response, error) {
	commandArgs := &CommandArgs{
		ChannelId: channelId,
		TeamId:    teamId,
		Command:   command,
	}
	r, err := c.doAPIPostJSON(ctx, c.commandsRoute().Join("execute"), commandArgs)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	response, err := CommandResponseFromJSON(r.Body)
	if err != nil {
		return nil, BuildResponse(r), fmt.Errorf("failed to decode command response: %w", err)
	}
	return response, BuildResponse(r), nil
}
func (c *Client4) ListAutocompleteCommands(ctx context.Context, teamId string) ([]*Command, *Response, error) {
	r, err := c.doAPIGet(ctx, c.teamAutoCompleteCommandsRoute(teamId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Command](r)
}
func (c *Client4) RegenCommandToken(ctx context.Context, commandId string) (string, *Response, error) {
	r, err := c.doAPIPut(ctx, c.commandRoute(commandId).Join("regen_token"), "")
	if err != nil {
		return "", BuildResponse(r), err
	}
	defer closeBody(r)
	result, resp, err := DecodeJSONFromResponse[map[string]string](r)
	if err != nil {
		return "", resp, err
	}
	return result["token"], resp, nil
}
func (c *Client4) GetUserStatus(ctx context.Context, userId, etag string) (*Status, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userStatusRoute(userId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Status](r)
}
func (c *Client4) GetUsersStatusesByIds(ctx context.Context, userIds []string) ([]*Status, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.userStatusesRoute().Join("ids"), userIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Status](r)
}
func (c *Client4) UpdateUserStatus(ctx context.Context, userId string, userStatus *Status) (*Status, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.userStatusRoute(userId), userStatus)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Status](r)
}
func (c *Client4) UpdateUserCustomStatus(ctx context.Context, userId string, userCustomStatus *CustomStatus) (*CustomStatus, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.userStatusRoute(userId).Join("custom"), userCustomStatus)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return userCustomStatus, BuildResponse(r), nil
}
func (c *Client4) RemoveUserCustomStatus(ctx context.Context, userId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.userStatusRoute(userId).Join("custom"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) RemoveRecentUserCustomStatus(ctx context.Context, userId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.userStatusRoute(userId).Join("custom", "recent"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) CreateEmoji(ctx context.Context, emoji *Emoji, image []byte, filename string) (*Emoji, *Response, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", filename)
	if err != nil {
		return nil, nil, err
	}
	_, err = io.Copy(part, bytes.NewBuffer(image))
	if err != nil {
		return nil, nil, err
	}
	emojiJSON, err := json.Marshal(emoji)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal emoji data: %w", err)
	}
	if err = writer.WriteField("emoji", string(emojiJSON)); err != nil {
		return nil, nil, err
	}
	if err = writer.Close(); err != nil {
		return nil, nil, err
	}
	r, err := c.doAPIRequestReaderRoute(ctx, http.MethodPost, c.emojisRoute(), writer.FormDataContentType(), body, nil)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Emoji](r)
}
func (c *Client4) GetEmojiList(ctx context.Context, page, perPage int) ([]*Emoji, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.emojisRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Emoji](r)
}
func (c *Client4) GetSortedEmojiList(ctx context.Context, page, perPage int, sort string) ([]*Emoji, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("sort", sort)
	r, err := c.doAPIGetWithQuery(ctx, c.emojisRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Emoji](r)
}
func (c *Client4) GetEmojisByNames(ctx context.Context, names []string) ([]*Emoji, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.emojisRoute().Join("names"), names)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Emoji](r)
}
func (c *Client4) DeleteEmoji(ctx context.Context, emojiId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.emojiRoute(emojiId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetEmoji(ctx context.Context, emojiId string) (*Emoji, *Response, error) {
	r, err := c.doAPIGet(ctx, c.emojiRoute(emojiId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Emoji](r)
}
func (c *Client4) GetEmojiByName(ctx context.Context, name string) (*Emoji, *Response, error) {
	r, err := c.doAPIGet(ctx, c.emojiByNameRoute(name), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Emoji](r)
}
func (c *Client4) GetEmojiImage(ctx context.Context, emojiId string) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.emojiRoute(emojiId).Join("image"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) SearchEmoji(ctx context.Context, search *EmojiSearch) ([]*Emoji, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.emojisRoute().Join("search"), search)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Emoji](r)
}
func (c *Client4) AutocompleteEmoji(ctx context.Context, name string, etag string) ([]*Emoji, *Response, error) {
	values := url.Values{}
	values.Set("name", name)
	r, err := c.doAPIGetWithQuery(ctx, c.emojisRoute().Join("autocomplete"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Emoji](r)
}
func (c *Client4) SaveReaction(ctx context.Context, reaction *Reaction) (*Reaction, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.reactionsRoute(), reaction)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Reaction](r)
}
func (c *Client4) GetReactions(ctx context.Context, postId string) ([]*Reaction, *Response, error) {
	r, err := c.doAPIGet(ctx, c.postRoute(postId).Join("reactions"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Reaction](r)
}
func (c *Client4) DeleteReaction(ctx context.Context, reaction *Reaction) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.userRoute(reaction.UserId).Join(c.postRoute(reaction.PostId), "reactions", reaction.EmojiName))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetBulkReactions(ctx context.Context, postIds []string) (map[string][]*Reaction, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.postsRoute().Join("ids", "reactions"), postIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string][]*Reaction](r)
}
func (c *Client4) GetSupportedTimezone(ctx context.Context) ([]string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.timezonesRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]string](r)
}
func (c *Client4) GetJob(ctx context.Context, id string) (*Job, *Response, error) {
	r, err := c.doAPIGet(ctx, c.jobsRoute().Join(id), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Job](r)
}
func (c *Client4) GetJobs(ctx context.Context, jobType string, status string, page int, perPage int) ([]*Job, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	values.Set("job_type", jobType)
	values.Set("status", status)
	r, err := c.doAPIGetWithQuery(ctx, c.jobsRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Job](r)
}
func (c *Client4) GetJobsByType(ctx context.Context, jobType string, page int, perPage int) ([]*Job, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.jobsRoute().Join("type", jobType), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Job](r)
}
func (c *Client4) CreateJob(ctx context.Context, job *Job) (*Job, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.jobsRoute(), job)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Job](r)
}
func (c *Client4) CancelJob(ctx context.Context, jobId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.jobsRoute().Join(jobId, "cancel"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DownloadJob(ctx context.Context, jobId string) ([]byte, *Response, error) {
	r, err := c.doAPIGet(ctx, c.jobsRoute().Join(jobId, "download"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return ReadBytesFromResponse(r)
}
func (c *Client4) UpdateJobStatus(ctx context.Context, jobId string, status string, force bool) (*Response, error) {
	data := map[string]any{
		"status": status,
		"force":  force,
	}
	r, err := c.doAPIPatchJSON(ctx, c.jobsRoute().Join(jobId, "status"), data)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetAllRoles(ctx context.Context) ([]*Role, *Response, error) {
	r, err := c.doAPIGet(ctx, c.rolesRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Role](r)
}
func (c *Client4) GetRole(ctx context.Context, id string) (*Role, *Response, error) {
	r, err := c.doAPIGet(ctx, c.rolesRoute().Join(id), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Role](r)
}
func (c *Client4) GetRoleByName(ctx context.Context, name string) (*Role, *Response, error) {
	r, err := c.doAPIGet(ctx, c.rolesRoute().Join("name", name), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Role](r)
}
func (c *Client4) GetRolesByNames(ctx context.Context, roleNames []string) ([]*Role, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.rolesRoute().Join("names"), roleNames)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Role](r)
}
func (c *Client4) PatchRole(ctx context.Context, roleId string, patch *RolePatch) (*Role, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.rolesRoute().Join(roleId, "patch"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Role](r)
}
func (c *Client4) CreateScheme(ctx context.Context, scheme *Scheme) (*Scheme, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.schemesRoute(), scheme)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Scheme](r)
}
func (c *Client4) GetScheme(ctx context.Context, id string) (*Scheme, *Response, error) {
	r, err := c.doAPIGet(ctx, c.schemeRoute(id), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Scheme](r)
}
func (c *Client4) GetSchemes(ctx context.Context, scope string, page int, perPage int) ([]*Scheme, *Response, error) {
	values := url.Values{}
	values.Set("scope", scope)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.schemesRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Scheme](r)
}
func (c *Client4) DeleteScheme(ctx context.Context, id string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.schemeRoute(id))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) PatchScheme(ctx context.Context, id string, patch *SchemePatch) (*Scheme, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.schemeRoute(id).Join("patch"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Scheme](r)
}
func (c *Client4) GetTeamsForScheme(ctx context.Context, schemeId string, page int, perPage int) ([]*Team, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.schemeRoute(schemeId).Join("teams"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Team](r)
}
func (c *Client4) GetChannelsForScheme(ctx context.Context, schemeId string, page int, perPage int) (ChannelList, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.schemeRoute(schemeId).Join("channels"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[ChannelList](r)
}
func (c *Client4) UploadPlugin(ctx context.Context, file io.Reader) (*Manifest, *Response, error) {
	return c.uploadPlugin(ctx, file, false)
}
func (c *Client4) UploadPluginForced(ctx context.Context, file io.Reader) (*Manifest, *Response, error) {
	return c.uploadPlugin(ctx, file, true)
}
func (c *Client4) uploadPlugin(ctx context.Context, file io.Reader, force bool) (*Manifest, *Response, error) {
	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	if force {
		err := writer.WriteField("force", c.boolString(true))
		if err != nil {
			return nil, nil, err
		}
	}
	part, err := writer.CreateFormFile("plugin", "plugin.tar.gz")
	if err != nil {
		return nil, nil, err
	}
	if _, err = io.Copy(part, file); err != nil {
		return nil, nil, err
	}
	if err = writer.Close(); err != nil {
		return nil, nil, err
	}
	r, err := c.doAPIRequestReaderRoute(ctx, http.MethodPost, c.pluginsRoute(), writer.FormDataContentType(), body, nil)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return DecodeJSONFromResponse[*Manifest](r)
}
func (c *Client4) InstallPluginFromURL(ctx context.Context, downloadURL string, force bool) (*Manifest, *Response, error) {
	values := url.Values{}
	values.Set("plugin_download_url", downloadURL)
	values.Set("force", c.boolString(force))
	r, err := c.doAPIPostWithQuery(ctx, c.pluginsRoute().Join("install_from_url"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Manifest](r)
}
func (c *Client4) InstallMarketplacePlugin(ctx context.Context, request *InstallMarketplacePluginRequest) (*Manifest, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.pluginsRoute().Join("marketplace"), request)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Manifest](r)
}
func (c *Client4) ReattachPlugin(ctx context.Context, request *PluginReattachRequest) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.pluginsRoute().Join("reattach"), request)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DetachPlugin(ctx context.Context, pluginID string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.pluginRoute(pluginID).Join("detach"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetPlugins(ctx context.Context) (*PluginsResponse, *Response, error) {
	r, err := c.doAPIGet(ctx, c.pluginsRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PluginsResponse](r)
}
func (c *Client4) GetPluginStatuses(ctx context.Context) (PluginStatuses, *Response, error) {
	r, err := c.doAPIGet(ctx, c.pluginsRoute().Join("statuses"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[PluginStatuses](r)
}
func (c *Client4) RemovePlugin(ctx context.Context, id string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.pluginRoute(id))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetWebappPlugins(ctx context.Context) ([]*Manifest, *Response, error) {
	r, err := c.doAPIGet(ctx, c.pluginsRoute().Join("webapp"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Manifest](r)
}
func (c *Client4) EnablePlugin(ctx context.Context, id string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.pluginRoute(id).Join("enable"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DisablePlugin(ctx context.Context, id string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.pluginRoute(id).Join("disable"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetMarketplacePlugins(ctx context.Context, filter *MarketplacePluginFilter) ([]*MarketplacePlugin, *Response, error) {
	r, err := c.doAPIGetWithQuery(ctx, c.pluginsRoute().Join("marketplace"), filter.ToValues(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	plugins, err := MarketplacePluginsFromReader(r.Body)
	if err != nil {
		return nil, BuildResponse(r), fmt.Errorf("failed to parse marketplace plugins response: %w", err)
	}
	return plugins, BuildResponse(r), nil
}
func (c *Client4) UpdateChannelScheme(ctx context.Context, channelId, schemeId string) (*Response, error) {
	sip := &SchemeIDPatch{SchemeID: &schemeId}
	r, err := c.doAPIPutJSON(ctx, c.channelSchemeRoute(channelId), sip)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UpdateTeamScheme(ctx context.Context, teamId, schemeId string) (*Response, error) {
	sip := &SchemeIDPatch{SchemeID: &schemeId}
	r, err := c.doAPIPutJSON(ctx, c.teamSchemeRoute(teamId), sip)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetRedirectLocation(ctx context.Context, urlParam, etag string) (string, *Response, error) {
	values := url.Values{}
	values.Set("url", urlParam)
	r, err := c.doAPIGetWithQuery(ctx, c.redirectLocationRoute(), values, etag)
	if err != nil {
		return "", BuildResponse(r), err
	}
	defer closeBody(r)
	result, resp, err := DecodeJSONFromResponse[map[string]string](r)
	if err != nil {
		return "", resp, err
	}
	return result["location"], resp, nil
}
func (c *Client4) SetServerBusy(ctx context.Context, secs int) (*Response, error) {
	values := url.Values{}
	values.Set("seconds", strconv.Itoa(secs))
	r, err := c.doAPIPostWithQuery(ctx, c.serverBusyRoute(), values, "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) ClearServerBusy(ctx context.Context) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.serverBusyRoute())
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetServerBusy(ctx context.Context) (*ServerBusyState, *Response, error) {
	r, err := c.doAPIGet(ctx, c.serverBusyRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ServerBusyState](r)
}
func (c *Client4) RegisterTermsOfServiceAction(ctx context.Context, userId, termsOfServiceId string, accepted bool) (*Response, error) {
	data := map[string]any{"termsOfServiceId": termsOfServiceId, "accepted": accepted}
	r, err := c.doAPIPostJSON(ctx, c.userTermsOfServiceRoute(userId), data)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetTermsOfService(ctx context.Context, etag string) (*TermsOfService, *Response, error) {
	r, err := c.doAPIGet(ctx, c.termsOfServiceRoute(), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*TermsOfService](r)
}
func (c *Client4) GetUserTermsOfService(ctx context.Context, userId, etag string) (*UserTermsOfService, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userTermsOfServiceRoute(userId), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UserTermsOfService](r)
}
func (c *Client4) CreateTermsOfService(ctx context.Context, text, userId string) (*TermsOfService, *Response, error) {
	data := map[string]any{"text": text}
	r, err := c.doAPIPostJSON(ctx, c.termsOfServiceRoute(), data)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*TermsOfService](r)
}
func (c *Client4) GetGroup(ctx context.Context, groupID, etag string) (*Group, *Response, error) {
	r, err := c.doAPIGet(ctx, c.groupRoute(groupID), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Group](r)
}
func (c *Client4) CreateGroup(ctx context.Context, group *Group) (*Group, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.groupsRoute(), group)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Group](r)
}
func (c *Client4) DeleteGroup(ctx context.Context, groupID string) (*Group, *Response, error) {
	r, err := c.doAPIDelete(ctx, c.groupRoute(groupID))
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Group](r)
}
func (c *Client4) RestoreGroup(ctx context.Context, groupID string, etag string) (*Group, *Response, error) {
	r, err := c.doAPIPost(ctx, c.groupRoute(groupID).Join("restore"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Group](r)
}
func (c *Client4) PatchGroup(ctx context.Context, groupID string, patch *GroupPatch) (*Group, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.groupRoute(groupID).Join("patch"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Group](r)
}
func (c *Client4) GetGroupMembers(ctx context.Context, groupID string) (*GroupMemberList, *Response, error) {
	r, err := c.doAPIGet(ctx, c.groupRoute(groupID).Join("members"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*GroupMemberList](r)
}
func (c *Client4) UpsertGroupMembers(ctx context.Context, groupID string, userIds *GroupModifyMembers) ([]*GroupMember, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.groupRoute(groupID).Join("members"), userIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*GroupMember](r)
}
func (c *Client4) DeleteGroupMembers(ctx context.Context, groupID string, userIds *GroupModifyMembers) ([]*GroupMember, *Response, error) {
	r, err := c.doAPIDeleteJSON(ctx, c.groupRoute(groupID).Join("members"), userIds)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*GroupMember](r)
}
func (c *Client4) LinkGroupSyncable(ctx context.Context, groupID, syncableID string, syncableType GroupSyncableType, patch *GroupSyncablePatch) (*GroupSyncable, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.groupSyncableRoute(groupID, syncableID, syncableType).Join("link"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*GroupSyncable](r)
}
func (c *Client4) UnlinkGroupSyncable(ctx context.Context, groupID, syncableID string, syncableType GroupSyncableType) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.groupSyncableRoute(groupID, syncableID, syncableType).Join("link"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetGroupSyncable(ctx context.Context, groupID, syncableID string, syncableType GroupSyncableType, etag string) (*GroupSyncable, *Response, error) {
	r, err := c.doAPIGet(ctx, c.groupSyncableRoute(groupID, syncableID, syncableType), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*GroupSyncable](r)
}
func (c *Client4) GetGroupSyncables(ctx context.Context, groupID string, syncableType GroupSyncableType, etag string) ([]*GroupSyncable, *Response, error) {
	r, err := c.doAPIGet(ctx, c.groupSyncablesRoute(groupID, syncableType), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*GroupSyncable](r)
}
func (c *Client4) PatchGroupSyncable(ctx context.Context, groupID, syncableID string, syncableType GroupSyncableType, patch *GroupSyncablePatch) (*GroupSyncable, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.groupSyncableRoute(groupID, syncableID, syncableType).Join("patch"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*GroupSyncable](r)
}
func (c *Client4) TeamMembersMinusGroupMembers(ctx context.Context, teamID string, groupIDs []string, page, perPage int, etag string) ([]*UserWithGroups, int64, *Response, error) {
	groupIDStr := strings.Join(groupIDs, ",")
	values := url.Values{}
	values.Set("group_ids", groupIDStr)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.teamRoute(teamID).Join("members_minus_group_members"), values, etag)
	if err != nil {
		return nil, 0, BuildResponse(r), err
	}
	defer closeBody(r)
	ugc, resp, err := DecodeJSONFromResponse[UsersWithGroupsAndCount](r)
	if err != nil {
		return nil, 0, nil, err
	}
	return ugc.Users, ugc.Count, resp, nil
}
func (c *Client4) ChannelMembersMinusGroupMembers(ctx context.Context, channelID string, groupIDs []string, page, perPage int, etag string) ([]*UserWithGroups, int64, *Response, error) {
	groupIDStr := strings.Join(groupIDs, ",")
	values := url.Values{}
	values.Set("group_ids", groupIDStr)
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.channelRoute(channelID).Join("members_minus_group_members"), values, etag)
	if err != nil {
		return nil, 0, BuildResponse(r), err
	}
	defer closeBody(r)
	ugc, resp, err := DecodeJSONFromResponse[UsersWithGroupsAndCount](r)
	if err != nil {
		return nil, 0, nil, err
	}
	return ugc.Users, ugc.Count, resp, nil
}
func (c *Client4) PatchConfig(ctx context.Context, config *Config) (*Config, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.configRoute().Join("patch"), config)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Config](r)
}
func (c *Client4) GetChannelModerations(ctx context.Context, channelID string, etag string) ([]*ChannelModeration, *Response, error) {
	r, err := c.doAPIGet(ctx, c.channelRoute(channelID).Join("moderations"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*ChannelModeration](r)
}
func (c *Client4) PatchChannelModerations(ctx context.Context, channelID string, patch []*ChannelModerationPatch) ([]*ChannelModeration, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.channelRoute(channelID).Join("moderations", "patch"), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*ChannelModeration](r)
}
func (c *Client4) GetKnownUsers(ctx context.Context) ([]string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.usersRoute().Join("known"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]string](r)
}
func (c *Client4) PublishUserTyping(ctx context.Context, userID string, typingRequest TypingRequest) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.publishUserTypingRoute(userID), typingRequest)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetChannelMemberCountsByGroup(ctx context.Context, channelID string, includeTimezones bool, etag string) ([]*ChannelMemberCountByGroup, *Response, error) {
	values := url.Values{}
	values.Set("include_timezones", c.boolString(includeTimezones))
	r, err := c.doAPIGetWithQuery(ctx, c.channelRoute(channelID).Join("member_counts_by_group"), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*ChannelMemberCountByGroup](r)
}
func (c *Client4) RequestTrialLicenseWithExtraFields(ctx context.Context, trialRequest *TrialLicenseRequest) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.trialLicenseRoute(), trialRequest)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) RequestTrialLicense(ctx context.Context, users int) (*Response, error) {
	reqData := map[string]any{"users": users, "terms_accepted": true}
	r, err := c.doAPIPostJSON(ctx, c.trialLicenseRoute(), reqData)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetGroupStats(ctx context.Context, groupID string) (*GroupStats, *Response, error) {
	r, err := c.doAPIGet(ctx, c.groupRoute(groupID).Join("stats"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*GroupStats](r)
}
func (c *Client4) GetSidebarCategoriesForTeamForUser(ctx context.Context, userID, teamID, etag string) (*OrderedSidebarCategories, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userCategoryRoute(userID, teamID), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return DecodeJSONFromResponse[*OrderedSidebarCategories](r)
}
func (c *Client4) CreateSidebarCategoryForTeamForUser(ctx context.Context, userID, teamID string, category *SidebarCategoryWithChannels) (*SidebarCategoryWithChannels, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.userCategoryRoute(userID, teamID), category)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*SidebarCategoryWithChannels](r)
}
func (c *Client4) UpdateSidebarCategoriesForTeamForUser(ctx context.Context, userID, teamID string, categories []*SidebarCategoryWithChannels) ([]*SidebarCategoryWithChannels, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.userCategoryRoute(userID, teamID), categories)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*SidebarCategoryWithChannels](r)
}
func (c *Client4) GetSidebarCategoryOrderForTeamForUser(ctx context.Context, userID, teamID, etag string) ([]string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userCategoryRoute(userID, teamID).Join("order"), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]string](r)
}
func (c *Client4) UpdateSidebarCategoryOrderForTeamForUser(ctx context.Context, userID, teamID string, order []string) ([]string, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.userCategoryRoute(userID, teamID).Join("order"), order)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]string](r)
}
func (c *Client4) GetSidebarCategoryForTeamForUser(ctx context.Context, userID, teamID, categoryID, etag string) (*SidebarCategoryWithChannels, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userCategoryRoute(userID, teamID).Join(categoryID), etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*SidebarCategoryWithChannels](r)
}
func (c *Client4) UpdateSidebarCategoryForTeamForUser(ctx context.Context, userID, teamID, categoryID string, category *SidebarCategoryWithChannels) (*SidebarCategoryWithChannels, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.userCategoryRoute(userID, teamID).Join(categoryID), category)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*SidebarCategoryWithChannels](r)
}
func (c *Client4) DeleteSidebarCategoryForTeamForUser(ctx context.Context, userId string, teamId string, categoryId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.userCategoryRoute(userId, teamId).Join(categoryId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) CheckIntegrity(ctx context.Context) ([]IntegrityCheckResult, *Response, error) {
	r, err := c.doAPIPost(ctx, c.integrityRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]IntegrityCheckResult](r)
}
func (c *Client4) GetNotices(ctx context.Context, lastViewed int64, teamId string, client NoticeClientType, clientVersion, locale, etag string) (NoticeMessages, *Response, error) {
	values := url.Values{}
	values.Set("lastViewed", strconv.FormatInt(lastViewed, 10))
	values.Set("client", string(client))
	values.Set("clientVersion", clientVersion)
	values.Set("locale", locale)
	r, err := c.doAPIGetWithQuery(ctx, c.systemRoute().Join("notices", teamId), values, etag)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	notices, err := UnmarshalProductNoticeMessages(r.Body)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	return notices, BuildResponse(r), nil
}
func (c *Client4) MarkNoticesViewed(ctx context.Context, ids []string) (*Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.systemRoute().Join("notices", "view"), ids)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) CompleteOnboarding(ctx context.Context, request *CompleteOnboardingRequest) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.systemRoute().Join("onboarding", "complete"), request)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) CreateUpload(ctx context.Context, us *UploadSession) (*UploadSession, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.uploadsRoute(), us)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UploadSession](r)
}
func (c *Client4) GetUpload(ctx context.Context, uploadId string) (*UploadSession, *Response, error) {
	r, err := c.doAPIGet(ctx, c.uploadRoute(uploadId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UploadSession](r)
}
func (c *Client4) GetUploadsForUser(ctx context.Context, userId string) ([]*UploadSession, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userRoute(userId).Join("uploads"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*UploadSession](r)
}
func (c *Client4) UploadData(ctx context.Context, uploadId string, data io.Reader) (*FileInfo, *Response, error) {
	r, err := c.doAPIRequestReaderRoute(ctx, http.MethodPost, c.uploadRoute(uploadId), "", data, nil)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	if r.StatusCode == http.StatusNoContent {
		return nil, BuildResponse(r), nil
	}
	return DecodeJSONFromResponse[*FileInfo](r)
}
func (c *Client4) UpdatePassword(ctx context.Context, userId, currentPassword, newPassword string) (*Response, error) {
	requestBody := map[string]string{"current_password": currentPassword, "new_password": newPassword}
	r, err := c.doAPIPutJSON(ctx, c.userRoute(userId).Join("password"), requestBody)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetCloudProducts(ctx context.Context) ([]*Product, *Response, error) {
	r, err := c.doAPIGet(ctx, c.cloudRoute().Join("products"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Product](r)
}
func (c *Client4) GetSelfHostedProducts(ctx context.Context) ([]*Product, *Response, error) {
	r, err := c.doAPIGet(ctx, c.cloudRoute().Join("products", "selfhosted"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Product](r)
}
func (c *Client4) GetProductLimits(ctx context.Context) (*ProductLimits, *Response, error) {
	r, err := c.doAPIGet(ctx, c.cloudRoute().Join("limits"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ProductLimits](r)
}
func (c *Client4) GetIPFilters(ctx context.Context) (*AllowedIPRanges, *Response, error) {
	r, err := c.doAPIGet(ctx, c.ipFiltersRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*AllowedIPRanges](r)
}
func (c *Client4) ApplyIPFilters(ctx context.Context, allowedRanges *AllowedIPRanges) (*AllowedIPRanges, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.ipFiltersRoute(), allowedRanges)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*AllowedIPRanges](r)
}
func (c *Client4) GetMyIP(ctx context.Context) (*GetIPAddressResponse, *Response, error) {
	r, err := c.doAPIGet(ctx, c.ipFiltersRoute().Join("my_ip"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*GetIPAddressResponse](r)
}
func (c *Client4) ValidateWorkspaceBusinessEmail(ctx context.Context) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.cloudRoute().Join("validate-workspace-business-email"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) NotifyAdmin(ctx context.Context, nr *NotifyAdminToUpgradeRequest) (int, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("notify-admin"), nr)
	if err != nil {
		return r.StatusCode, err
	}
	closeBody(r)
	return r.StatusCode, nil
}
func (c *Client4) TriggerNotifyAdmin(ctx context.Context, nr *NotifyAdminToUpgradeRequest) (int, error) {
	r, err := c.doAPIPostJSON(ctx, c.usersRoute().Join("trigger-notify-admin-posts"), nr)
	if err != nil {
		return r.StatusCode, err
	}
	closeBody(r)
	return r.StatusCode, nil
}
func (c *Client4) ValidateBusinessEmail(ctx context.Context, email *ValidateBusinessEmailRequest) (*Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.cloudRoute().Join("validate-business-email"), email)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetCloudCustomer(ctx context.Context) (*CloudCustomer, *Response, error) {
	r, err := c.doAPIGet(ctx, c.cloudRoute().Join("customer"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*CloudCustomer](r)
}
func (c *Client4) GetSubscription(ctx context.Context) (*Subscription, *Response, error) {
	r, err := c.doAPIGet(ctx, c.cloudRoute().Join("subscription"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Subscription](r)
}
func (c *Client4) GetInvoicesForSubscription(ctx context.Context) ([]*Invoice, *Response, error) {
	r, err := c.doAPIGet(ctx, c.cloudRoute().Join("subscription", "invoices"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*Invoice](r)
}
func (c *Client4) UpdateCloudCustomer(ctx context.Context, customerInfo *CloudCustomerInfo) (*CloudCustomer, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.cloudRoute().Join("customer"), customerInfo)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*CloudCustomer](r)
}
func (c *Client4) UpdateCloudCustomerAddress(ctx context.Context, address *Address) (*CloudCustomer, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.cloudRoute().Join("customer", "address"), address)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*CloudCustomer](r)
}
func (c *Client4) ListImports(ctx context.Context) ([]string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.importsRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]string](r)
}
func (c *Client4) DeleteImport(ctx context.Context, name string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.importRoute(name))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) ListExports(ctx context.Context) ([]string, *Response, error) {
	r, err := c.doAPIGet(ctx, c.exportsRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]string](r)
}
func (c *Client4) DeleteExport(ctx context.Context, name string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.exportRoute(name))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) DownloadExport(ctx context.Context, name string, wr io.Writer, offset int64) (int64, *Response, error) {
	var headers map[string]string
	if offset > 0 {
		headers = map[string]string{
			HeaderRange: fmt.Sprintf("bytes=%d-", offset),
		}
	}
	r, err := c.doAPIRequestWithHeadersRoute(ctx, http.MethodGet, c.exportRoute(name), "", headers)
	if err != nil {
		return 0, BuildResponse(r), err
	}
	defer closeBody(r)
	n, err := io.Copy(wr, r.Body)
	if err != nil {
		return n, BuildResponse(r), fmt.Errorf("failed to copy export data to writer: %w", err)
	}
	return n, BuildResponse(r), nil
}
func (c *Client4) GeneratePresignedURL(ctx context.Context, name string) (*PresignURLResponse, *Response, error) {
	r, err := c.doAPIPost(ctx, c.exportRoute(name).Join("presign-url"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PresignURLResponse](r)
}
func (c *Client4) GetUserThreads(ctx context.Context, userId, teamId string, options GetUserThreadsOpts) (*Threads, *Response, error) {
	values := url.Values{}
	if options.Since != 0 {
		values.Set("since", fmt.Sprintf("%d", options.Since))
	}
	if options.Before != "" {
		values.Set("before", options.Before)
	}
	if options.After != "" {
		values.Set("after", options.After)
	}
	if options.PageSize != 0 {
		values.Set("per_page", fmt.Sprintf("%d", options.PageSize))
	}
	if options.Extended {
		values.Set("extended", "true")
	}
	if options.Deleted {
		values.Set("deleted", "true")
	}
	if options.Unread {
		values.Set("unread", "true")
	}
	if options.ThreadsOnly {
		values.Set("threadsOnly", "true")
	}
	if options.TotalsOnly {
		values.Set("totalsOnly", "true")
	}
	if options.ExcludeDirect {
		values.Set("excludeDirect", fmt.Sprintf("%t", options.ExcludeDirect))
	}
	r, err := c.doAPIGetWithQuery(ctx, c.userThreadsRoute(userId, teamId), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Threads](r)
}
func (c *Client4) DownloadComplianceExport(ctx context.Context, jobId string, wr io.Writer) (string, error) {
	r, err := c.doAPIGet(ctx, c.jobsRoute().Join(jobId, "download"), "")
	if err != nil {
		return "", err
	}
	defer closeBody(r)
	var filename string
	if cd := r.Header.Get("Content-Disposition"); cd != "" {
		var params map[string]string
		if _, params, err = mime.ParseMediaType(cd); err == nil {
			if params["filename"] != "" {
				filename = params["filename"]
			}
		}
	}
	_, err = io.Copy(wr, r.Body)
	if err != nil {
		return filename, fmt.Errorf("failed to copy compliance export data to writer: %w", err)
	}
	return filename, nil
}
func (c *Client4) GetUserThread(ctx context.Context, userId, teamId, threadId string, extended bool) (*ThreadResponse, *Response, error) {
	values := url.Values{}
	if extended {
		values.Set("extended", "true")
	}
	r, err := c.doAPIGetWithQuery(ctx, c.userThreadRoute(userId, teamId, threadId), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ThreadResponse](r)
}
func (c *Client4) UpdateThreadsReadForUser(ctx context.Context, userId, teamId string) (*Response, error) {
	r, err := c.doAPIPut(ctx, c.userThreadsRoute(userId, teamId).Join("read"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) SetThreadUnreadByPostId(ctx context.Context, userId, teamId, threadId, postId string) (*ThreadResponse, *Response, error) {
	r, err := c.doAPIPost(ctx, c.userThreadRoute(userId, teamId, threadId).Join("set_unread", postId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ThreadResponse](r)
}
func (c *Client4) UpdateThreadReadForUser(ctx context.Context, userId, teamId, threadId string, timestamp int64) (*ThreadResponse, *Response, error) {
	r, err := c.doAPIPut(ctx, c.userThreadRoute(userId, teamId, threadId).Join("read", fmt.Sprintf("%d", timestamp)), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ThreadResponse](r)
}
func (c *Client4) UpdateThreadFollowForUser(ctx context.Context, userId, teamId, threadId string, state bool) (*Response, error) {
	var r *http.Response
	var err error
	if state {
		r, err = c.doAPIPut(ctx, c.userThreadRoute(userId, teamId, threadId).Join("following"), "")
	} else {
		r, err = c.doAPIDelete(ctx, c.userThreadRoute(userId, teamId, threadId).Join("following"))
	}
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetAllSharedChannels(ctx context.Context, teamID string, page, perPage int) ([]*SharedChannel, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.sharedChannelsRoute().Join(teamID), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*SharedChannel](r)
}
func (c *Client4) GetRemoteClusterInfo(ctx context.Context, remoteID string) (RemoteClusterInfo, *Response, error) {
	r, err := c.doAPIGet(ctx, c.sharedChannelsRoute().Join("remote_info", remoteID), "")
	if err != nil {
		return RemoteClusterInfo{}, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[RemoteClusterInfo](r)
}
func (c *Client4) GetRemoteClusters(ctx context.Context, page, perPage int, filter RemoteClusterQueryFilter) ([]*RemoteCluster, *Response, error) {
	values := url.Values{}
	if page != 0 {
		values.Set("page", fmt.Sprintf("%d", page))
	}
	if perPage != 0 {
		values.Set("per_page", fmt.Sprintf("%d", perPage))
	}
	if filter.ExcludeOffline {
		values.Set("exclude_offline", "true")
	}
	if filter.InChannel != "" {
		values.Set("in_channel", filter.InChannel)
	}
	if filter.NotInChannel != "" {
		values.Set("not_in_channel", filter.NotInChannel)
	}
	if filter.Topic != "" {
		values.Set("topic", filter.Topic)
	}
	if filter.CreatorId != "" {
		values.Set("creator_id", filter.CreatorId)
	}
	if filter.OnlyConfirmed {
		values.Set("only_confirmed", "true")
	}
	if filter.PluginID != "" {
		values.Set("plugin_id", filter.PluginID)
	}
	if filter.OnlyPlugins {
		values.Set("only_plugins", "true")
	}
	if filter.ExcludePlugins {
		values.Set("exclude_plugins", "true")
	}
	if filter.IncludeDeleted {
		values.Set("include_deleted", "true")
	}
	r, err := c.doAPIGetWithQuery(ctx, c.remoteClusterRoute(), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*RemoteCluster](r)
}
func (c *Client4) CreateRemoteCluster(ctx context.Context, rcWithPassword *RemoteClusterWithPassword) (*RemoteClusterWithInvite, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.remoteClusterRoute(), rcWithPassword)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*RemoteClusterWithInvite](r)
}
func (c *Client4) RemoteClusterAcceptInvite(ctx context.Context, rcAcceptInvite *RemoteClusterAcceptInvite) (*RemoteCluster, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.remoteClusterRoute().Join("accept_invite"), rcAcceptInvite)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*RemoteCluster](r)
}
func (c *Client4) GenerateRemoteClusterInvite(ctx context.Context, remoteClusterId, password string) (string, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.remoteClusterRoute().Join(remoteClusterId, "generate_invite"), map[string]string{"password": password})
	if err != nil {
		return "", BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[string](r)
}
func (c *Client4) GetRemoteCluster(ctx context.Context, remoteClusterId string) (*RemoteCluster, *Response, error) {
	r, err := c.doAPIGet(ctx, c.remoteClusterRoute().Join(remoteClusterId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*RemoteCluster](r)
}
func (c *Client4) PatchRemoteCluster(ctx context.Context, remoteClusterId string, patch *RemoteClusterPatch) (*RemoteCluster, *Response, error) {
	r, err := c.doAPIPatchJSON(ctx, c.remoteClusterRoute().Join(remoteClusterId), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*RemoteCluster](r)
}
func (c *Client4) DeleteRemoteCluster(ctx context.Context, remoteClusterId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.remoteClusterRoute().Join(remoteClusterId))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetSharedChannelRemotesByRemoteCluster(ctx context.Context, remoteId string, filter SharedChannelRemoteFilterOpts, page, perPage int) ([]*SharedChannelRemote, *Response, error) {
	values := url.Values{}
	if filter.IncludeUnconfirmed {
		values.Set("include_unconfirmed", "true")
	}
	if filter.ExcludeConfirmed {
		values.Set("exclude_confirmed", "true")
	}
	if filter.ExcludeHome {
		values.Set("exclude_home", "true")
	}
	if filter.ExcludeRemote {
		values.Set("exclude_remote", "true")
	}
	if filter.IncludeDeleted {
		values.Set("include_deleted", "true")
	}
	if page != 0 {
		values.Set("page", fmt.Sprintf("%d", page))
	}
	if perPage != 0 {
		values.Set("per_page", fmt.Sprintf("%d", perPage))
	}
	r, err := c.doAPIGetWithQuery(ctx, c.sharedChannelRemotesRoute(remoteId), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*SharedChannelRemote](r)
}
func (c *Client4) InviteRemoteClusterToChannel(ctx context.Context, remoteId, channelId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.channelRemoteRoute(remoteId, channelId).Join("invite"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UninviteRemoteClusterToChannel(ctx context.Context, remoteId, channelId string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.channelRemoteRoute(remoteId, channelId).Join("uninvite"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetAncillaryPermissions(ctx context.Context, subsectionPermissions []string) ([]string, *Response, error) {
	var returnedPermissions []string
	r, err := c.doAPIPostJSON(ctx, c.permissionsRoute().Join("ancillary"), subsectionPermissions)
	if err != nil {
		return returnedPermissions, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]string](r)
}
func (c *Client4) GetUsersWithInvalidEmails(ctx context.Context, page, perPage int) ([]*User, *Response, error) {
	values := url.Values{}
	values.Set("page", strconv.Itoa(page))
	values.Set("per_page", strconv.Itoa(perPage))
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute().Join("invalid_emails"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*User](r)
}
func (c *Client4) GetAppliedSchemaMigrations(ctx context.Context) ([]AppliedMigration, *Response, error) {
	r, err := c.doAPIGet(ctx, c.systemRoute().Join("schema", "version"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]AppliedMigration](r)
}
func (c *Client4) GetPostsUsage(ctx context.Context) (*PostsUsage, *Response, error) {
	r, err := c.doAPIGet(ctx, c.usageRoute().Join("posts"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostsUsage](r)
}
func (c *Client4) GetStorageUsage(ctx context.Context) (*StorageUsage, *Response, error) {
	r, err := c.doAPIGet(ctx, c.usageRoute().Join("storage"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*StorageUsage](r)
}
func (c *Client4) GetTeamsUsage(ctx context.Context) (*TeamsUsage, *Response, error) {
	r, err := c.doAPIGet(ctx, c.usageRoute().Join("teams"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*TeamsUsage](r)
}
func (c *Client4) GetPostInfo(ctx context.Context, postId string) (*PostInfo, *Response, error) {
	r, err := c.doAPIGet(ctx, c.postRoute(postId).Join("info"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostInfo](r)
}
func (c *Client4) AcknowledgePost(ctx context.Context, postId, userId string) (*PostAcknowledgement, *Response, error) {
	r, err := c.doAPIPost(ctx, c.userRoute(userId).Join(c.postRoute(postId), "ack"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PostAcknowledgement](r)
}
func (c *Client4) UnacknowledgePost(ctx context.Context, postId, userId string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.userRoute(userId).Join(c.postRoute(postId), "ack"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) AddUserToGroupSyncables(ctx context.Context, userID string) (*Response, error) {
	r, err := c.doAPIPost(ctx, c.ldapRoute().Join("users", userID, "group_sync_memberships"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) CheckCWSConnection(ctx context.Context, userId string) (*Response, error) {
	r, err := c.doAPIGet(ctx, c.cloudRoute().Join("healthz"), "")
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) CreateChannelBookmark(ctx context.Context, channelBookmark *ChannelBookmark) (*ChannelBookmarkWithFileInfo, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.bookmarksRoute(channelBookmark.ChannelId), channelBookmark)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelBookmarkWithFileInfo](r)
}
func (c *Client4) UpdateChannelBookmark(ctx context.Context, channelId, bookmarkId string, patch *ChannelBookmarkPatch) (*UpdateChannelBookmarkResponse, *Response, error) {
	r, err := c.doAPIPatchJSON(ctx, c.bookmarkRoute(channelId, bookmarkId), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UpdateChannelBookmarkResponse](r)
}
func (c *Client4) UpdateChannelBookmarkSortOrder(ctx context.Context, channelId, bookmarkId string, sortOrder int64) ([]*ChannelBookmarkWithFileInfo, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.bookmarkRoute(channelId, bookmarkId).Join("sort_order"), sortOrder)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*ChannelBookmarkWithFileInfo](r)
}
func (c *Client4) DeleteChannelBookmark(ctx context.Context, channelId, bookmarkId string) (*ChannelBookmarkWithFileInfo, *Response, error) {
	r, err := c.doAPIDelete(ctx, c.bookmarkRoute(channelId, bookmarkId))
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelBookmarkWithFileInfo](r)
}
func (c *Client4) ListChannelBookmarksForChannel(ctx context.Context, channelId string, since int64) ([]*ChannelBookmarkWithFileInfo, *Response, error) {
	values := url.Values{}
	values.Set("bookmarks_since", strconv.FormatInt(since, 10))
	r, err := c.doAPIGetWithQuery(ctx, c.bookmarksRoute(channelId), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*ChannelBookmarkWithFileInfo](r)
}
func (c *Client4) SubmitClientMetrics(ctx context.Context, report *PerformanceReport) (*Response, error) {
	res, err := c.doAPIPostJSON(ctx, c.clientPerfMetricsRoute(), report)
	if err != nil {
		return BuildResponse(res), err
	}
	return BuildResponse(res), nil
}
func (c *Client4) GetFilteredUsersStats(ctx context.Context, options *UserCountOptions) (*UsersStats, *Response, error) {
	v := url.Values{}
	v.Set("in_team", options.TeamId)
	v.Set("in_channel", options.ChannelId)
	v.Set("include_deleted", strconv.FormatBool(options.IncludeDeleted))
	v.Set("include_bots", strconv.FormatBool(options.IncludeBotAccounts))
	v.Set("include_remote_users", strconv.FormatBool(options.IncludeRemoteUsers))
	if len(options.Roles) > 0 {
		v.Set("roles", strings.Join(options.Roles, ","))
	}
	if len(options.ChannelRoles) > 0 {
		v.Set("channel_roles", strings.Join(options.ChannelRoles, ","))
	}
	if len(options.TeamRoles) > 0 {
		v.Set("team_roles", strings.Join(options.TeamRoles, ","))
	}
	r, err := c.doAPIGetWithQuery(ctx, c.usersRoute().Join("stats", "filtered"), v, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*UsersStats](r)
}
func (c *Client4) RestorePostVersion(ctx context.Context, postId, versionId string) (*Post, *Response, error) {
	r, err := c.doAPIPost(ctx, c.postRoute(postId).Join("restore", versionId), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Post](r)
}
func (c *Client4) CreateCPAField(ctx context.Context, field *PropertyField) (*PropertyField, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.customProfileAttributeFieldsRoute(), field)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PropertyField](r)
}
func (c *Client4) ListCPAFields(ctx context.Context) ([]*PropertyField, *Response, error) {
	r, err := c.doAPIGet(ctx, c.customProfileAttributeFieldsRoute(), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]*PropertyField](r)
}
func (c *Client4) PatchCPAField(ctx context.Context, fieldID string, patch *PropertyFieldPatch) (*PropertyField, *Response, error) {
	r, err := c.doAPIPatchJSON(ctx, c.customProfileAttributeFieldRoute(fieldID), patch)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*PropertyField](r)
}
func (c *Client4) DeleteCPAField(ctx context.Context, fieldID string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.customProfileAttributeFieldRoute(fieldID))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) ListCPAValues(ctx context.Context, userID string) (map[string]json.RawMessage, *Response, error) {
	r, err := c.doAPIGet(ctx, c.userCustomProfileAttributesRoute(userID), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]json.RawMessage](r)
}
func (c *Client4) PatchCPAValues(ctx context.Context, values map[string]json.RawMessage) (map[string]json.RawMessage, *Response, error) {
	r, err := c.doAPIPatchJSON(ctx, c.customProfileAttributeValuesRoute(), values)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]json.RawMessage](r)
}
func (c *Client4) PatchCPAValuesForUser(ctx context.Context, userID string, values map[string]json.RawMessage) (map[string]json.RawMessage, *Response, error) {
	r, err := c.doAPIPatchJSON(ctx, c.userCustomProfileAttributesRoute(userID), values)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[map[string]json.RawMessage](r)
}
func (c *Client4) GetPostPropertyValues(ctx context.Context, postId string) ([]PropertyValue, *Response, error) {
	r, err := c.doAPIGet(ctx, c.contentFlaggingRoute().Join("post", postId, "field_values"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]PropertyValue](r)
}
func (c *Client4) CreateAccessControlPolicy(ctx context.Context, policy *AccessControlPolicy) (*AccessControlPolicy, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.accessControlPoliciesRoute(), policy)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*AccessControlPolicy](r)
}
func (c *Client4) GetAccessControlPolicy(ctx context.Context, id string) (*AccessControlPolicy, *Response, error) {
	r, err := c.doAPIGet(ctx, c.accessControlPolicyRoute(id), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*AccessControlPolicy](r)
}
func (c *Client4) DeleteAccessControlPolicy(ctx context.Context, id string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.accessControlPolicyRoute(id))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) CheckExpression(ctx context.Context, expression string, channelId ...string) ([]CELExpressionError, *Response, error) {
	checkExpressionRequest := struct {
		Expression string `json:"expression"`
		ChannelId  string `json:"channelId,omitempty"`
	}{
		Expression: expression,
	}
	if len(channelId) > 0 && channelId[0] != "" {
		checkExpressionRequest.ChannelId = channelId[0]
	}
	r, err := c.doAPIPostJSON(ctx, c.celRoute().Join("check"), checkExpressionRequest)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[[]CELExpressionError](r)
}
func (c *Client4) TestExpression(ctx context.Context, params QueryExpressionParams) (*AccessControlPolicyTestResponse, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.celRoute().Join("test"), params)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*AccessControlPolicyTestResponse](r)
}
func (c *Client4) SearchAccessControlPolicies(ctx context.Context, options AccessControlPolicySearch) (*AccessControlPoliciesWithCount, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.accessControlPoliciesRoute().Join("search"), options)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*AccessControlPoliciesWithCount](r)
}
func (c *Client4) AssignAccessControlPolicies(ctx context.Context, policyID string, resourceIDs []string) (*Response, error) {
	var assignments struct {
		ChannelIds []string `json:"channel_ids"`
	}
	assignments.ChannelIds = resourceIDs
	r, err := c.doAPIPostJSON(ctx, c.accessControlPolicyRoute(policyID).Join("assign"), assignments)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) UnassignAccessControlPolicies(ctx context.Context, policyID string, resourceIDs []string) (*Response, error) {
	var unassignments struct {
		ChannelIds []string `json:"channel_ids"`
	}
	unassignments.ChannelIds = resourceIDs
	r, err := c.doAPIDeleteJSON(ctx, c.accessControlPolicyRoute(policyID).Join("unassign"), unassignments)
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}
func (c *Client4) GetChannelsForAccessControlPolicy(ctx context.Context, policyID string, after string, limit int) (*ChannelsWithCount, *Response, error) {
	values := url.Values{}
	values.Set("after", after)
	values.Set("limit", strconv.Itoa(limit))
	r, err := c.doAPIGetWithQuery(ctx, c.accessControlPolicyRoute(policyID).Join("resources", "channels"), values, "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelsWithCount](r)
}
func (c *Client4) SearchChannelsForAccessControlPolicy(ctx context.Context, policyID string, options ChannelSearch) (*ChannelsWithCount, *Response, error) {
	r, err := c.doAPIPostJSON(ctx, c.accessControlPolicyRoute(policyID).Join("resources", "channels", "search"), options)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*ChannelsWithCount](r)
}
func (c *Client4) SetAccessControlPolicyActive(ctx context.Context, update AccessControlPolicyActiveUpdateRequest) ([]*AccessControlPolicy, *Response, error) {
	r, err := c.doAPIPutJSON(ctx, c.accessControlPoliciesRoute().Join("activate"), update)
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	var policies []*AccessControlPolicy
	if err := json.NewDecoder(r.Body).Decode(&policies); err != nil {
		return nil, nil, NewAppError("SetAccessControlPolicyActive", "api.unmarshal_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return policies, BuildResponse(r), nil
}
func (c *Client4) RevealPost(ctx context.Context, postID string) (*Post, *Response, error) {
	r, err := c.doAPIGet(ctx, c.postRoute(postID).Join("reveal"), "")
	if err != nil {
		return nil, BuildResponse(r), err
	}
	defer closeBody(r)
	return DecodeJSONFromResponse[*Post](r)
}
func (c *Client4) BurnPost(ctx context.Context, postID string) (*Response, error) {
	r, err := c.doAPIDelete(ctx, c.postRoute(postID).Join("burn"))
	if err != nil {
		return BuildResponse(r), err
	}
	defer closeBody(r)
	return BuildResponse(r), nil
}