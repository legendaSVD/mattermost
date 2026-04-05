package platform
import (
	"fmt"
	"hash/maphash"
	"iter"
	"maps"
	"runtime"
	"runtime/debug"
	"strconv"
	"sync/atomic"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
const (
	broadcastQueueSize         = 4096
	inactiveConnReaperInterval = 5 * time.Minute
)
type SuiteIFace interface {
	GetSession(token string) (*model.Session, *model.AppError)
	RolesGrantPermission(roleNames []string, permissionId string) bool
	HasPermissionToReadChannel(rctx request.CTX, userID string, channel *model.Channel) (bool, bool)
	UserCanSeeOtherUser(rctx request.CTX, userID string, otherUserId string) (bool, *model.AppError)
	MFARequired(rctx request.CTX) *model.AppError
	MakeAuditRecord(rctx request.CTX, event string, initialStatus string) *model.AuditRecord
	LogAuditRec(rctx request.CTX, auditRec *model.AuditRecord, err error)
}
type webConnActivityMessage struct {
	userID       string
	sessionToken string
	activityAt   int64
}
type webConnDirectMessage struct {
	conn *WebConn
	msg  model.WebSocketMessage
}
type webConnSessionMessage struct {
	userID       string
	sessionToken string
	isRegistered chan bool
}
type webConnRegisterMessage struct {
	conn *WebConn
	err  chan error
}
type webConnCheckMessage struct {
	userID       string
	connectionID string
	result       chan *CheckConnResult
}
type webConnCountMessage struct {
	userID string
	result chan int
}
var hubSemaphoreCount = runtime.NumCPU() * 4
type Hub struct {
	connectionCount int64
	platform        *PlatformService
	connectionIndex int
	register        chan *webConnRegisterMessage
	unregister      chan *WebConn
	broadcast       chan *model.WebSocketEvent
	stop            chan struct{}
	didStop         chan struct{}
	invalidateUser  chan string
	activity        chan *webConnActivityMessage
	directMsg       chan *webConnDirectMessage
	explicitStop    bool
	checkRegistered chan *webConnSessionMessage
	checkConn       chan *webConnCheckMessage
	connCount       chan *webConnCountMessage
	broadcastHooks  map[string]BroadcastHook
	hubSemaphore chan struct{}
}
func newWebHub(ps *PlatformService) *Hub {
	return &Hub{
		platform:        ps,
		register:        make(chan *webConnRegisterMessage),
		unregister:      make(chan *WebConn),
		broadcast:       make(chan *model.WebSocketEvent, broadcastQueueSize),
		stop:            make(chan struct{}),
		didStop:         make(chan struct{}),
		invalidateUser:  make(chan string),
		activity:        make(chan *webConnActivityMessage),
		directMsg:       make(chan *webConnDirectMessage),
		checkRegistered: make(chan *webConnSessionMessage),
		checkConn:       make(chan *webConnCheckMessage),
		connCount:       make(chan *webConnCountMessage),
		hubSemaphore:    make(chan struct{}, hubSemaphoreCount),
	}
}
func (ps *PlatformService) hubStart(broadcastHooks map[string]BroadcastHook) {
	numberOfHubs := runtime.NumCPU()
	ps.logger.Info("Starting websocket hubs", mlog.Int("number_of_hubs", numberOfHubs))
	hubs := make([]*Hub, numberOfHubs)
	for i := range numberOfHubs {
		hubs[i] = newWebHub(ps)
		hubs[i].connectionIndex = i
		hubs[i].broadcastHooks = broadcastHooks
		hubs[i].Start()
	}
	ps.hubs = hubs
}
func (ps *PlatformService) InvalidateCacheForWebhook(webhookID string) {
	ps.Store.Webhook().InvalidateWebhookCache(webhookID)
}
func (ps *PlatformService) HubStop() {
	ps.logger.Info("stopping websocket hub connections")
	for _, hub := range ps.hubs {
		hub.Stop()
	}
}
func (ps *PlatformService) GetHubForUserId(userID string) *Hub {
	if len(ps.hubs) == 0 {
		return nil
	}
	var hash maphash.Hash
	hash.SetSeed(ps.hashSeed)
	_, err := hash.Write([]byte(userID))
	if err != nil {
		ps.logger.Error("Unable to write userID to hash", mlog.String("userID", userID), mlog.Err(err))
	}
	index := hash.Sum64() % uint64(len(ps.hubs))
	return ps.hubs[int(index)]
}
func (ps *PlatformService) HubRegister(webConn *WebConn) error {
	hub := ps.GetHubForUserId(webConn.UserId)
	if hub != nil {
		if metrics := ps.metricsIFace; metrics != nil {
			metrics.IncrementWebSocketBroadcastUsersRegistered(strconv.Itoa(hub.connectionIndex), 1)
		}
		return hub.Register(webConn)
	}
	return nil
}
func (ps *PlatformService) HubUnregister(webConn *WebConn) {
	hub := ps.GetHubForUserId(webConn.UserId)
	if hub != nil {
		if metrics := ps.metricsIFace; metrics != nil {
			metrics.DecrementWebSocketBroadcastUsersRegistered(strconv.Itoa(hub.connectionIndex), 1)
		}
		hub.Unregister(webConn)
	}
}
func (ps *PlatformService) InvalidateCacheForChannel(channel *model.Channel) {
	ps.Store.Channel().InvalidateChannel(channel.Id)
	teamID := channel.TeamId
	if teamID == "" {
		teamID = "dm"
	}
	ps.Store.Channel().InvalidateChannelByName(teamID, channel.Name)
}
func (ps *PlatformService) InvalidateCacheForChannelMembers(channelID string) {
	ps.Store.User().InvalidateProfilesInChannelCache(channelID)
	ps.Store.Channel().InvalidateMemberCount(channelID)
	ps.Store.Channel().InvalidateGuestCount(channelID)
}
func (ps *PlatformService) InvalidateCacheForChannelMembersNotifyProps(channelID string) {
	ps.Store.Channel().InvalidateCacheForChannelMembersNotifyProps(channelID)
}
func (ps *PlatformService) InvalidateCacheForChannelPosts(channelID string) {
	ps.Store.Channel().InvalidatePinnedPostCount(channelID)
	ps.Store.Post().InvalidateLastPostTimeCache(channelID)
}
func (ps *PlatformService) InvalidateCacheForReadReceipts(postID string) {
	ps.Store.ReadReceipt().InvalidateReadReceiptForPostsCache(postID)
}
func (ps *PlatformService) InvalidateCacheForTemporaryPost(id string) {
	ps.Store.TemporaryPost().InvalidateTemporaryPost(id)
}
func (ps *PlatformService) InvalidateCacheForUser(userID string) {
	ps.InvalidateChannelCacheForUser(userID)
	ps.Store.User().InvalidateProfileCacheForUser(userID)
}
func (ps *PlatformService) invalidateWebConnSessionCacheForUser(userID string) {
	ps.invalidateWebConnSessionCacheForUserSkipClusterSend(userID)
	if ps.clusterIFace != nil {
		msg := &model.ClusterMessage{
			Event:    model.ClusterEventInvalidateWebConnCacheForUser,
			SendType: model.ClusterSendBestEffort,
			Data:     []byte(userID),
		}
		ps.clusterIFace.SendClusterMessage(msg)
	}
}
func (ps *PlatformService) InvalidateChannelCacheForUser(userID string) {
	ps.Store.Channel().InvalidateAllChannelMembersForUser(userID)
	ps.invalidateWebConnSessionCacheForUser(userID)
	ps.Store.User().InvalidateProfilesInChannelCacheByUser(userID)
}
func (ps *PlatformService) InvalidateCacheForUserTeams(userID string) {
	ps.invalidateWebConnSessionCacheForUser(userID)
	ps.Store.Team().InvalidateAllTeamIdsForUser(userID)
}
func (ps *PlatformService) UpdateWebConnUserActivity(session model.Session, activityAt int64) {
	hub := ps.GetHubForUserId(session.UserId)
	if hub != nil {
		hub.UpdateActivity(session.UserId, session.Token, activityAt)
	}
}
func (ps *PlatformService) SessionIsRegistered(session model.Session) bool {
	hub := ps.GetHubForUserId(session.UserId)
	if hub != nil {
		return hub.IsRegistered(session.UserId, session.Token)
	}
	return false
}
func (ps *PlatformService) CheckWebConn(userID, connectionID string, seqNum int64) *CheckConnResult {
	if ps.Cluster() == nil || seqNum == 0 {
		hub := ps.GetHubForUserId(userID)
		if hub != nil {
			return hub.CheckConn(userID, connectionID)
		}
		return nil
	}
	queueMap, err := ps.Cluster().GetWSQueues(userID, connectionID, seqNum)
	if err != nil {
		ps.Log().Error("Error while getting websocket queues",
			mlog.String("connection_id", connectionID),
			mlog.String("user_id", userID),
			mlog.Int("sequence_number", seqNum),
			mlog.Err(err))
		return nil
	}
	connRes := &CheckConnResult{
		ConnectionID: connectionID,
		UserID:       userID,
	}
	for _, queues := range queueMap {
		if queues == nil || queues.ActiveQ == nil {
			continue
		}
		aq := make(chan model.WebSocketMessage, sendQueueSize)
		for _, aqItem := range queues.ActiveQ {
			item, err := ps.UnmarshalAQItem(aqItem)
			if err != nil {
				ps.Log().Error("Error while unmarshalling websocket message from active queue",
					mlog.String("connection_id", connectionID),
					mlog.String("user_id", userID),
					mlog.Err(err))
				return nil
			}
			aq <- item
		}
		connRes.ActiveQueue = aq
		connRes.ReuseCount = queues.ReuseCount
		if queues.DeadQ != nil {
			dq, dqPtr, err := ps.UnmarshalDQ(queues.DeadQ)
			if err != nil {
				ps.Log().Error("Error while unmarshalling websocket message from dead queue",
					mlog.String("connection_id", connectionID),
					mlog.String("user_id", userID),
					mlog.Err(err))
				return nil
			}
			if dq[0] != nil {
				connRes.DeadQueue = dq
				connRes.DeadQueuePointer = dqPtr
			}
		}
		return connRes
	}
	hub := ps.GetHubForUserId(userID)
	if hub != nil {
		return hub.CheckConn(userID, connectionID)
	}
	return nil
}
func (ps *PlatformService) WebConnCountForUser(userID string) int {
	hub := ps.GetHubForUserId(userID)
	if hub != nil {
		return hub.WebConnCountForUser(userID)
	}
	return 0
}
func (h *Hub) Register(webConn *WebConn) error {
	wr := &webConnRegisterMessage{
		conn: webConn,
		err:  make(chan error),
	}
	select {
	case h.register <- wr:
		return <-wr.err
	case <-h.stop:
	}
	return nil
}
func (h *Hub) Unregister(webConn *WebConn) {
	select {
	case h.unregister <- webConn:
	case <-h.stop:
	}
}
func (h *Hub) IsRegistered(userID, sessionToken string) bool {
	ws := &webConnSessionMessage{
		userID:       userID,
		sessionToken: sessionToken,
		isRegistered: make(chan bool),
	}
	select {
	case h.checkRegistered <- ws:
		return <-ws.isRegistered
	case <-h.stop:
	}
	return false
}
func (h *Hub) CheckConn(userID, connectionID string) *CheckConnResult {
	req := &webConnCheckMessage{
		userID:       userID,
		connectionID: connectionID,
		result:       make(chan *CheckConnResult),
	}
	select {
	case h.checkConn <- req:
		return <-req.result
	case <-h.stop:
	}
	return nil
}
func (h *Hub) WebConnCountForUser(userID string) int {
	req := &webConnCountMessage{
		userID: userID,
		result: make(chan int),
	}
	select {
	case h.connCount <- req:
		return <-req.result
	case <-h.stop:
	}
	return 0
}
func (h *Hub) Broadcast(message *model.WebSocketEvent) {
	if h != nil && message != nil {
		if metrics := h.platform.metricsIFace; metrics != nil {
			metrics.IncrementWebSocketBroadcastBufferSize(strconv.Itoa(h.connectionIndex), 1)
		}
		select {
		case h.broadcast <- message:
		case <-h.stop:
		}
	}
}
func (h *Hub) InvalidateUser(userID string) {
	select {
	case h.invalidateUser <- userID:
	case <-h.stop:
	}
}
func (h *Hub) UpdateActivity(userID, sessionToken string, activityAt int64) {
	select {
	case h.activity <- &webConnActivityMessage{
		userID:       userID,
		sessionToken: sessionToken,
		activityAt:   activityAt,
	}:
	case <-h.stop:
	}
}
func (h *Hub) SendMessage(conn *WebConn, msg model.WebSocketMessage) {
	select {
	case h.directMsg <- &webConnDirectMessage{
		conn: conn,
		msg:  msg,
	}:
	case <-h.stop:
	}
}
func (h *Hub) ProcessAsync(f func()) {
	h.hubSemaphore <- struct{}{}
	go func() {
		defer func() {
			<-h.hubSemaphore
		}()
		done := make(chan struct{})
		go func() {
			defer close(done)
			f()
		}()
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			h.platform.Log().Warn("ProcessAsync function timed out after 5 seconds")
		}
	}()
}
func (h *Hub) Stop() {
	close(h.stop)
	<-h.didStop
	for range hubSemaphoreCount {
		h.hubSemaphore <- struct{}{}
	}
}
func (h *Hub) Start() {
	var doStart func()
	var doRecoverableStart func()
	var doRecover func()
	doStart = func() {
		mlog.Debug("Hub is starting", mlog.Int("index", h.connectionIndex))
		ticker := time.NewTicker(inactiveConnReaperInterval)
		defer ticker.Stop()
		connIndex := newHubConnectionIndex(inactiveConnReaperInterval,
			h.platform.Store,
			h.platform.logger,
			*h.platform.Config().ServiceSettings.EnableWebHubChannelIteration,
		)
		for {
			select {
			case webSessionMessage := <-h.checkRegistered:
				var isRegistered bool
				for conn := range connIndex.ForUser(webSessionMessage.userID) {
					if !conn.Active.Load() {
						continue
					}
					if conn.GetSessionToken() == webSessionMessage.sessionToken {
						isRegistered = true
					}
				}
				webSessionMessage.isRegistered <- isRegistered
			case req := <-h.checkConn:
				var res *CheckConnResult
				conn := connIndex.RemoveInactiveByConnectionID(req.userID, req.connectionID)
				if conn != nil {
					res = &CheckConnResult{
						ConnectionID:     req.connectionID,
						UserID:           req.userID,
						ActiveQueue:      conn.send,
						DeadQueue:        conn.deadQueue,
						DeadQueuePointer: conn.deadQueuePointer,
						ReuseCount:       conn.reuseCount + 1,
					}
				}
				req.result <- res
			case req := <-h.connCount:
				req.result <- connIndex.ForUserActiveCount(req.userID)
			case <-ticker.C:
				connIndex.RemoveInactiveConnections()
			case webConnReg := <-h.register:
				webConnReg.conn.Active.Store(true)
				err := connIndex.Add(webConnReg.conn)
				if err != nil {
					webConnReg.err <- err
					continue
				}
				atomic.StoreInt64(&h.connectionCount, int64(connIndex.AllActive()))
				if webConnReg.conn.IsBasicAuthenticated() && webConnReg.conn.reuseCount == 0 {
					webConnReg.conn.send <- webConnReg.conn.createHelloMessage()
				}
				webConnReg.err <- nil
			case webConn := <-h.unregister:
				webConn.Active.Store(false)
				atomic.StoreInt64(&h.connectionCount, int64(connIndex.AllActive()))
				if webConn.UserId == "" {
					continue
				}
				conns := connIndex.ForUser(webConn.UserId)
				if areAllInactive(conns) {
					userID := webConn.UserId
					h.ProcessAsync(func() {
						var clusterCnt int
						var appErr *model.AppError
						if h.platform.Cluster() != nil {
							clusterCnt, appErr = h.platform.Cluster().WebConnCountForUser(userID)
						}
						if appErr != nil {
							mlog.Error("Error in trying to get the webconn count from cluster", mlog.Err(appErr))
							return
						}
						if clusterCnt == 0 {
							h.platform.QueueSetStatusOffline(userID, false)
						}
					})
					continue
				}
				var latestActivity int64
				for conn := range conns {
					if !conn.Active.Load() {
						continue
					}
					if conn.lastUserActivityAt > latestActivity {
						latestActivity = conn.lastUserActivityAt
					}
				}
				if h.platform.isUserAway(latestActivity) {
					userID := webConn.UserId
					h.platform.Go(func() {
						h.platform.SetStatusLastActivityAt(userID, latestActivity)
					})
				}
			case userID := <-h.invalidateUser:
				for webConn := range connIndex.ForUser(userID) {
					webConn.InvalidateCache()
				}
				if !*h.platform.Config().ServiceSettings.EnableWebHubChannelIteration {
					continue
				}
				err := connIndex.InvalidateCMCacheForUser(userID)
				if err != nil {
					h.platform.Log().Error("Error while invalidating channel member cache", mlog.String("user_id", userID), mlog.Err(err))
					for webConn := range connIndex.ForUser(userID) {
						closeAndRemoveConn(connIndex, webConn)
					}
				}
			case activity := <-h.activity:
				for webConn := range connIndex.ForUser(activity.userID) {
					if !webConn.Active.Load() {
						continue
					}
					if webConn.GetSessionToken() == activity.sessionToken {
						webConn.lastUserActivityAt = activity.activityAt
					}
				}
			case directMsg := <-h.directMsg:
				if !connIndex.Has(directMsg.conn) {
					continue
				}
				select {
				case directMsg.conn.send <- directMsg.msg:
				default:
					if directMsg.conn.Active.Load() {
						mlog.Error("webhub.broadcast: cannot send, closing websocket for user",
							mlog.String("user_id", directMsg.conn.UserId),
							mlog.String("conn_id", directMsg.conn.GetConnectionID()))
					}
					closeAndRemoveConn(connIndex, directMsg.conn)
				}
			case msg := <-h.broadcast:
				if metrics := h.platform.metricsIFace; metrics != nil {
					metrics.DecrementWebSocketBroadcastBufferSize(strconv.Itoa(h.connectionIndex), 1)
				}
				msg, broadcastHooks, broadcastHookArgs := msg.WithoutBroadcastHooks()
				msg = msg.PrecomputeJSON()
				broadcast := func(webConn *WebConn) {
					if !connIndex.Has(webConn) {
						return
					}
					if webConn.ShouldSendEvent(msg) {
						select {
						case webConn.send <- h.runBroadcastHooks(msg, webConn, broadcastHooks, broadcastHookArgs):
						default:
							if webConn.Active.Load() {
								mlog.Error("webhub.broadcast: cannot send, closing websocket for user",
									mlog.String("user_id", webConn.UserId),
									mlog.String("conn_id", webConn.GetConnectionID()))
							}
							closeAndRemoveConn(connIndex, webConn)
						}
					}
				}
				if webConn := connIndex.ForConnection(msg.GetBroadcast().ConnectionId); webConn != nil {
					broadcast(webConn)
					continue
				}
				fastIteration := *h.platform.Config().ServiceSettings.EnableWebHubChannelIteration
				var targetConns iter.Seq[*WebConn]
				if userID := msg.GetBroadcast().UserId; userID != "" {
					targetConns = connIndex.ForUser(userID)
				} else if channelID := msg.GetBroadcast().ChannelId; channelID != "" && fastIteration {
					targetConns = connIndex.ForChannel(channelID)
				}
				if targetConns != nil {
					for webConn := range targetConns {
						broadcast(webConn)
					}
					continue
				}
				if channelID := msg.GetBroadcast().ChannelId; channelID != "" && fastIteration {
					continue
				}
				for webConn := range connIndex.All() {
					broadcast(webConn)
				}
			case <-h.stop:
				for webConn := range connIndex.All() {
					webConn.Close()
					h.platform.SetStatusOffline(webConn.UserId, false, false)
				}
				h.explicitStop = true
				close(h.didStop)
				return
			}
		}
	}
	doRecoverableStart = func() {
		defer doRecover()
		doStart()
	}
	doRecover = func() {
		if !h.explicitStop {
			if r := recover(); r != nil {
				mlog.Error("Recovering from Hub panic.", mlog.Any("panic", r))
			} else {
				mlog.Error("Webhub stopped unexpectedly. Recovering.")
			}
			mlog.Error(string(debug.Stack()))
			go doRecoverableStart()
		}
	}
	go doRecoverableStart()
}
func areAllInactive(conns iter.Seq[*WebConn]) bool {
	for conn := range conns {
		if conn.Active.Load() {
			return false
		}
	}
	return true
}
func closeAndRemoveConn(connIndex *hubConnectionIndex, conn *WebConn) {
	close(conn.send)
	connIndex.Remove(conn)
}
type hubConnectionIndex struct {
	byUserId map[string]map[*WebConn]struct{}
	byChannelID map[string]map[*WebConn]struct{}
	byConnection   map[*WebConn][]string
	byConnectionId map[string]*WebConn
	staleThreshold time.Duration
	fastIteration bool
	store         store.Store
	logger        mlog.LoggerIFace
}
func newHubConnectionIndex(interval time.Duration,
	store store.Store,
	logger mlog.LoggerIFace,
	fastIteration bool,
) *hubConnectionIndex {
	return &hubConnectionIndex{
		byUserId:       make(map[string]map[*WebConn]struct{}),
		byChannelID:    make(map[string]map[*WebConn]struct{}),
		byConnection:   make(map[*WebConn][]string),
		byConnectionId: make(map[string]*WebConn),
		staleThreshold: interval,
		store:          store,
		logger:         logger,
		fastIteration:  fastIteration,
	}
}
func (i *hubConnectionIndex) Add(wc *WebConn) error {
	var channelIDs []string
	if i.fastIteration {
		cm, err := i.store.Channel().GetAllChannelMembersForUser(request.EmptyContext(i.logger), wc.UserId, false, false)
		if err != nil {
			return fmt.Errorf("error getChannelMembersForUser: %v", err)
		}
		channelIDs = make([]string, 0, len(cm))
		for chID := range cm {
			channelIDs = append(channelIDs, chID)
			if _, ok := i.byChannelID[chID]; !ok {
				i.byChannelID[chID] = make(map[*WebConn]struct{})
			}
			i.byChannelID[chID][wc] = struct{}{}
		}
	}
	if _, ok := i.byUserId[wc.UserId]; !ok {
		i.byUserId[wc.UserId] = make(map[*WebConn]struct{})
	}
	i.byUserId[wc.UserId][wc] = struct{}{}
	i.byConnection[wc] = channelIDs
	i.byConnectionId[wc.GetConnectionID()] = wc
	return nil
}
func (i *hubConnectionIndex) Remove(wc *WebConn) {
	channelIDs, ok := i.byConnection[wc]
	if !ok {
		return
	}
	if userConns, ok := i.byUserId[wc.UserId]; ok {
		delete(userConns, wc)
	}
	if i.fastIteration {
		for _, chID := range channelIDs {
			if channelConns, ok := i.byChannelID[chID]; ok {
				delete(channelConns, wc)
			}
		}
	}
	delete(i.byConnection, wc)
	delete(i.byConnectionId, wc.GetConnectionID())
}
func (i *hubConnectionIndex) InvalidateCMCacheForUser(userID string) error {
	cm, err := i.store.Channel().GetAllChannelMembersForUser(request.EmptyContext(i.logger), userID, false, false)
	if err != nil {
		return err
	}
	conns := i.ForUser(userID)
	for conn := range conns {
		if channelIDs, ok := i.byConnection[conn]; ok {
			for _, chID := range channelIDs {
				if channelConns, ok := i.byChannelID[chID]; ok {
					delete(channelConns, conn)
				}
			}
		}
	}
	for conn := range conns {
		newChannelIDs := make([]string, 0, len(cm))
		for chID := range cm {
			newChannelIDs = append(newChannelIDs, chID)
			if _, ok := i.byChannelID[chID]; !ok {
				i.byChannelID[chID] = make(map[*WebConn]struct{})
			}
			i.byChannelID[chID][conn] = struct{}{}
		}
		if _, ok := i.byConnection[conn]; ok {
			i.byConnection[conn] = newChannelIDs
		}
	}
	return nil
}
func (i *hubConnectionIndex) Has(wc *WebConn) bool {
	_, ok := i.byConnection[wc]
	return ok
}
func (i *hubConnectionIndex) ForUser(id string) iter.Seq[*WebConn] {
	return maps.Keys(i.byUserId[id])
}
func (i *hubConnectionIndex) ForChannel(channelID string) iter.Seq[*WebConn] {
	return maps.Keys(i.byChannelID[channelID])
}
func (i *hubConnectionIndex) ForUserActiveCount(id string) int {
	cnt := 0
	for conn := range i.ForUser(id) {
		if conn.Active.Load() {
			cnt++
		}
	}
	return cnt
}
func (i *hubConnectionIndex) ForConnection(id string) *WebConn {
	return i.byConnectionId[id]
}
func (i *hubConnectionIndex) All() map[*WebConn][]string {
	return i.byConnection
}
func (i *hubConnectionIndex) RemoveInactiveByConnectionID(userID, connectionID string) *WebConn {
	if userID == "" {
		return nil
	}
	for conn := range i.ForUser(userID) {
		if conn.GetConnectionID() == connectionID && !conn.Active.Load() {
			i.Remove(conn)
			return conn
		}
	}
	return nil
}
func (i *hubConnectionIndex) RemoveInactiveConnections() {
	now := model.GetMillis()
	for conn := range i.byConnection {
		if !conn.Active.Load() && now-conn.lastUserActivityAt > i.staleThreshold.Milliseconds() {
			i.Remove(conn)
		}
	}
}
func (i *hubConnectionIndex) AllActive() int {
	cnt := 0
	for conn := range i.byConnection {
		if conn.Active.Load() {
			cnt++
		}
	}
	return cnt
}