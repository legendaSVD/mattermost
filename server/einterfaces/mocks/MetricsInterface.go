package mocks
import (
	logr "github.com/mattermost/logr/v2"
	mock "github.com/stretchr/testify/mock"
	model "github.com/mattermost/mattermost/server/public/model"
	sql "database/sql"
)
type MetricsInterface struct {
	mock.Mock
}
func (_m *MetricsInterface) AddAutoTranslateRecoveryStuckFound(count float64) {
	_m.Called(count)
}
func (_m *MetricsInterface) AddMemCacheHitCounter(cacheName string, amount float64) {
	_m.Called(cacheName, amount)
}
func (_m *MetricsInterface) AddMemCacheMissCounter(cacheName string, amount float64) {
	_m.Called(cacheName, amount)
}
func (_m *MetricsInterface) ClearMobileClientSessionMetadata() {
	_m.Called()
}
func (_m *MetricsInterface) DecrementHTTPWebSockets(originClient string) {
	_m.Called(originClient)
}
func (_m *MetricsInterface) DecrementJobActive(jobType string) {
	_m.Called(jobType)
}
func (_m *MetricsInterface) DecrementWebSocketBroadcastBufferSize(hub string, amount float64) {
	_m.Called(hub, amount)
}
func (_m *MetricsInterface) DecrementWebSocketBroadcastUsersRegistered(hub string, amount float64) {
	_m.Called(hub, amount)
}
func (_m *MetricsInterface) GetLoggerMetricsCollector() logr.MetricsCollector {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GetLoggerMetricsCollector")
	}
	var r0 logr.MetricsCollector
	if rf, ok := ret.Get(0).(func() logr.MetricsCollector); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(logr.MetricsCollector)
		}
	}
	return r0
}
func (_m *MetricsInterface) IncrementAccessControlCacheInvalidation() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementAutoTranslateNormHash(result string) {
	_m.Called(result)
}
func (_m *MetricsInterface) IncrementChannelIndexCounter() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementClientLongTasks(platform string, agent string, userID string, inc float64) {
	_m.Called(platform, agent, userID, inc)
}
func (_m *MetricsInterface) IncrementClusterEventType(eventType model.ClusterEvent) {
	_m.Called(eventType)
}
func (_m *MetricsInterface) IncrementClusterRequest() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementEtagHitCounter(route string) {
	_m.Called(route)
}
func (_m *MetricsInterface) IncrementEtagMissCounter(route string) {
	_m.Called(route)
}
func (_m *MetricsInterface) IncrementFileIndexCounter() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementFilesSearchCounter() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementHTTPError() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementHTTPRequest() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementHTTPWebSockets(originClient string) {
	_m.Called(originClient)
}
func (_m *MetricsInterface) IncrementJobActive(jobType string) {
	_m.Called(jobType)
}
func (_m *MetricsInterface) IncrementLogin() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementLoginFail() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementMemCacheHitCounter(cacheName string) {
	_m.Called(cacheName)
}
func (_m *MetricsInterface) IncrementMemCacheHitCounterSession() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementMemCacheInvalidationCounter(cacheName string) {
	_m.Called(cacheName)
}
func (_m *MetricsInterface) IncrementMemCacheInvalidationCounterSession() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementMemCacheMissCounter(cacheName string) {
	_m.Called(cacheName)
}
func (_m *MetricsInterface) IncrementMemCacheMissCounterSession() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementNotificationAckCounter(notificationType model.NotificationType, platform string) {
	_m.Called(notificationType, platform)
}
func (_m *MetricsInterface) IncrementNotificationCounter(notificationType model.NotificationType, platform string) {
	_m.Called(notificationType, platform)
}
func (_m *MetricsInterface) IncrementNotificationErrorCounter(notificationType model.NotificationType, errorReason model.NotificationReason, platform string) {
	_m.Called(notificationType, errorReason, platform)
}
func (_m *MetricsInterface) IncrementNotificationNotSentCounter(notificationType model.NotificationType, notSentReason model.NotificationReason, platform string) {
	_m.Called(notificationType, notSentReason, platform)
}
func (_m *MetricsInterface) IncrementNotificationSuccessCounter(notificationType model.NotificationType, platform string) {
	_m.Called(notificationType, platform)
}
func (_m *MetricsInterface) IncrementNotificationUnsupportedCounter(notificationType model.NotificationType, notSentReason model.NotificationReason, platform string) {
	_m.Called(notificationType, notSentReason, platform)
}
func (_m *MetricsInterface) IncrementPostBroadcast() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementPostCreate() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementPostFileAttachment(count int) {
	_m.Called(count)
}
func (_m *MetricsInterface) IncrementPostIndexCounter() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementPostSentEmail() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementPostSentPush() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementPostsSearchCounter() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementRemoteClusterConnStateChangeCounter(remoteID string, online bool) {
	_m.Called(remoteID, online)
}
func (_m *MetricsInterface) IncrementRemoteClusterMsgErrorsCounter(remoteID string, timeout bool) {
	_m.Called(remoteID, timeout)
}
func (_m *MetricsInterface) IncrementRemoteClusterMsgReceivedCounter(remoteID string) {
	_m.Called(remoteID)
}
func (_m *MetricsInterface) IncrementRemoteClusterMsgSentCounter(remoteID string) {
	_m.Called(remoteID)
}
func (_m *MetricsInterface) IncrementSharedChannelsSyncCounter(remoteID string) {
	_m.Called(remoteID)
}
func (_m *MetricsInterface) IncrementUserIndexCounter() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementWebSocketBroadcast(eventType model.WebsocketEventType) {
	_m.Called(eventType)
}
func (_m *MetricsInterface) IncrementWebSocketBroadcastBufferSize(hub string, amount float64) {
	_m.Called(hub, amount)
}
func (_m *MetricsInterface) IncrementWebSocketBroadcastUsersRegistered(hub string, amount float64) {
	_m.Called(hub, amount)
}
func (_m *MetricsInterface) IncrementWebhookPost() {
	_m.Called()
}
func (_m *MetricsInterface) IncrementWebsocketEvent(eventType model.WebsocketEventType) {
	_m.Called(eventType)
}
func (_m *MetricsInterface) IncrementWebsocketReconnectEventWithDisconnectErrCode(eventType string, disconnectErrCode string) {
	_m.Called(eventType, disconnectErrCode)
}
func (_m *MetricsInterface) ObserveAPIEndpointDuration(endpoint string, method string, statusCode string, originClient string, pageLoadContext string, elapsed float64) {
	_m.Called(endpoint, method, statusCode, originClient, pageLoadContext, elapsed)
}
func (_m *MetricsInterface) ObserveAccessControlEvaluateDuration(value float64) {
	_m.Called(value)
}
func (_m *MetricsInterface) ObserveAccessControlExpressionCompileDuration(value float64) {
	_m.Called(value)
}
func (_m *MetricsInterface) ObserveAccessControlSearchQueryDuration(value float64) {
	_m.Called(value)
}
func (_m *MetricsInterface) ObserveAutoTranslateLinguaDetectionDuration(elapsed float64) {
	_m.Called(elapsed)
}
func (_m *MetricsInterface) ObserveAutoTranslateProviderCallDuration(provider string, result string, elapsed float64) {
	_m.Called(provider, result, elapsed)
}
func (_m *MetricsInterface) ObserveAutoTranslateTranslateDuration(objectType string, elapsed float64) {
	_m.Called(objectType, elapsed)
}
func (_m *MetricsInterface) ObserveAutoTranslateWorkerTaskDuration(elapsed float64) {
	_m.Called(elapsed)
}
func (_m *MetricsInterface) ObserveClientChannelSwitchDuration(platform string, agent string, fresh string, userID string, elapsed float64) {
	_m.Called(platform, agent, fresh, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientCumulativeLayoutShift(platform string, agent string, userID string, elapsed float64) {
	_m.Called(platform, agent, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientFirstContentfulPaint(platform string, agent string, userID string, elapsed float64) {
	_m.Called(platform, agent, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientInteractionToNextPaint(platform string, agent string, interaction string, userID string, elapsed float64) {
	_m.Called(platform, agent, interaction, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientLargestContentfulPaint(platform string, agent string, region string, userID string, elapsed float64) {
	_m.Called(platform, agent, region, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientPageLoadDuration(platform string, agent string, userID string, elapsed float64) {
	_m.Called(platform, agent, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientRHSLoadDuration(platform string, agent string, userID string, elapsed float64) {
	_m.Called(platform, agent, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientSplashScreenEnd(platform string, agent string, pageType string, userID string, elapsed float64) {
	_m.Called(platform, agent, pageType, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientTeamSwitchDuration(platform string, agent string, fresh string, userID string, elapsed float64) {
	_m.Called(platform, agent, fresh, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientTimeToDomInteractive(platform string, agent string, userID string, elapsed float64) {
	_m.Called(platform, agent, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientTimeToFirstByte(platform string, agent string, userID string, elapsed float64) {
	_m.Called(platform, agent, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClientTimeToLastByte(platform string, agent string, userID string, elapsed float64) {
	_m.Called(platform, agent, userID, elapsed)
}
func (_m *MetricsInterface) ObserveClusterRequestDuration(elapsed float64) {
	_m.Called(elapsed)
}
func (_m *MetricsInterface) ObserveDesktopCpuUsage(platform string, version string, process string, usage float64) {
	_m.Called(platform, version, process, usage)
}
func (_m *MetricsInterface) ObserveDesktopMemoryUsage(platform string, version string, process string, usage float64) {
	_m.Called(platform, version, process, usage)
}
func (_m *MetricsInterface) ObserveEnabledUsers(users int64) {
	_m.Called(users)
}
func (_m *MetricsInterface) ObserveFilesSearchDuration(elapsed float64) {
	_m.Called(elapsed)
}
func (_m *MetricsInterface) ObserveGlobalThreadsLoadDuration(platform string, agent string, userID string, elapsed float64) {
	_m.Called(platform, agent, userID, elapsed)
}
func (_m *MetricsInterface) ObserveMobileClientChannelSwitchDuration(platform string, elapsed float64) {
	_m.Called(platform, elapsed)
}
func (_m *MetricsInterface) ObserveMobileClientLoadDuration(platform string, elapsed float64) {
	_m.Called(platform, elapsed)
}
func (_m *MetricsInterface) ObserveMobileClientNetworkRequestsAverageSpeed(platform string, agent string, networkRequestGroup string, speed float64) {
	_m.Called(platform, agent, networkRequestGroup, speed)
}
func (_m *MetricsInterface) ObserveMobileClientNetworkRequestsEffectiveLatency(platform string, agent string, networkRequestGroup string, latency float64) {
	_m.Called(platform, agent, networkRequestGroup, latency)
}
func (_m *MetricsInterface) ObserveMobileClientNetworkRequestsElapsedTime(platform string, agent string, networkRequestGroup string, elapsedTime float64) {
	_m.Called(platform, agent, networkRequestGroup, elapsedTime)
}
func (_m *MetricsInterface) ObserveMobileClientNetworkRequestsLatency(platform string, agent string, networkRequestGroup string, latency float64) {
	_m.Called(platform, agent, networkRequestGroup, latency)
}
func (_m *MetricsInterface) ObserveMobileClientNetworkRequestsTotalCompressedSize(platform string, agent string, networkRequestGroup string, size float64) {
	_m.Called(platform, agent, networkRequestGroup, size)
}
func (_m *MetricsInterface) ObserveMobileClientNetworkRequestsTotalParallelRequests(platform string, agent string, networkRequestGroup string, count float64) {
	_m.Called(platform, agent, networkRequestGroup, count)
}
func (_m *MetricsInterface) ObserveMobileClientNetworkRequestsTotalRequests(platform string, agent string, networkRequestGroup string, count float64) {
	_m.Called(platform, agent, networkRequestGroup, count)
}
func (_m *MetricsInterface) ObserveMobileClientNetworkRequestsTotalSequentialRequests(platform string, agent string, networkRequestGroup string, count float64) {
	_m.Called(platform, agent, networkRequestGroup, count)
}
func (_m *MetricsInterface) ObserveMobileClientNetworkRequestsTotalSize(platform string, agent string, networkRequestGroup string, size float64) {
	_m.Called(platform, agent, networkRequestGroup, size)
}
func (_m *MetricsInterface) ObserveMobileClientSessionMetadata(version string, platform string, value float64, notificationDisabled string) {
	_m.Called(version, platform, value, notificationDisabled)
}
func (_m *MetricsInterface) ObserveMobileClientTeamSwitchDuration(platform string, elapsed float64) {
	_m.Called(platform, elapsed)
}
func (_m *MetricsInterface) ObservePluginAPIDuration(pluginID string, apiName string, success bool, elapsed float64) {
	_m.Called(pluginID, apiName, success, elapsed)
}
func (_m *MetricsInterface) ObservePluginHookDuration(pluginID string, hookName string, success bool, elapsed float64) {
	_m.Called(pluginID, hookName, success, elapsed)
}
func (_m *MetricsInterface) ObservePluginMultiHookDuration(elapsed float64) {
	_m.Called(elapsed)
}
func (_m *MetricsInterface) ObservePluginMultiHookIterationDuration(pluginID string, elapsed float64) {
	_m.Called(pluginID, elapsed)
}
func (_m *MetricsInterface) ObservePluginWebappPerf(platform string, agent string, pluginID string, pluginMetricLabel string, elapsed float64) {
	_m.Called(platform, agent, pluginID, pluginMetricLabel, elapsed)
}
func (_m *MetricsInterface) ObservePostsSearchDuration(elapsed float64) {
	_m.Called(elapsed)
}
func (_m *MetricsInterface) ObserveRedisEndpointDuration(cacheName string, operation string, elapsed float64) {
	_m.Called(cacheName, operation, elapsed)
}
func (_m *MetricsInterface) ObserveRemoteClusterClockSkew(remoteID string, skew float64) {
	_m.Called(remoteID, skew)
}
func (_m *MetricsInterface) ObserveRemoteClusterPingDuration(remoteID string, elapsed float64) {
	_m.Called(remoteID, elapsed)
}
func (_m *MetricsInterface) ObserveSharedChannelsQueueSize(size int64) {
	_m.Called(size)
}
func (_m *MetricsInterface) ObserveSharedChannelsSyncCollectionDuration(remoteID string, elapsed float64) {
	_m.Called(remoteID, elapsed)
}
func (_m *MetricsInterface) ObserveSharedChannelsSyncCollectionStepDuration(remoteID string, step string, elapsed float64) {
	_m.Called(remoteID, step, elapsed)
}
func (_m *MetricsInterface) ObserveSharedChannelsSyncSendDuration(remoteID string, elapsed float64) {
	_m.Called(remoteID, elapsed)
}
func (_m *MetricsInterface) ObserveSharedChannelsSyncSendStepDuration(remoteID string, step string, elapsed float64) {
	_m.Called(remoteID, step, elapsed)
}
func (_m *MetricsInterface) ObserveSharedChannelsTaskInQueueDuration(elapsed float64) {
	_m.Called(elapsed)
}
func (_m *MetricsInterface) ObserveStoreMethodDuration(method string, success string, elapsed float64) {
	_m.Called(method, success, elapsed)
}
func (_m *MetricsInterface) Register() {
	_m.Called()
}
func (_m *MetricsInterface) RegisterDBCollector(db *sql.DB, name string) {
	_m.Called(db, name)
}
func (_m *MetricsInterface) SetAutoTranslateQueueDepth(depth float64) {
	_m.Called(depth)
}
func (_m *MetricsInterface) SetReplicaLagAbsolute(node string, value float64) {
	_m.Called(node, value)
}
func (_m *MetricsInterface) SetReplicaLagTime(node string, value float64) {
	_m.Called(node, value)
}
func (_m *MetricsInterface) UnregisterDBCollector(db *sql.DB, name string) {
	_m.Called(db, name)
}
func NewMetricsInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *MetricsInterface {
	mock := &MetricsInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}