package app
import (
	"math/rand"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"sync"
	"testing"
	"time"
	"github.com/gorilla/websocket"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/v8/channels/testlib"
)
var mainHelper *testlib.MainHelper
func init() {
	testing.Init()
	var options = testlib.HelperOptions{
		EnableStore:     true,
		EnableResources: true,
	}
	mainHelper = testlib.NewMainHelperWithOptions(&options)
}
func dummyWebsocketHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		upgrader := &websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		}
		conn, err := upgrader.Upgrade(w, req, nil)
		for err == nil {
			_, _, err = conn.ReadMessage()
		}
		if _, ok := err.(*websocket.CloseError); !ok {
			panic(err)
		}
	}
}
func registerDummyWebConn(a *App, addr net.Addr, userID string) *WebConn {
	session, appErr := a.CreateSession(&model.Session{
		UserId: userID,
	})
	if appErr != nil {
		panic(appErr)
	}
	d := websocket.Dialer{}
	c, _, err := d.Dial("ws://"+addr.String()+"/ws", nil)
	if err != nil {
		panic(err)
	}
	wc := a.NewWebConn(c, *session, i18n.IdentityTfunc(), "en")
	a.HubRegister(wc)
	go wc.Pump()
	return wc
}
type actionData struct {
	event                string
	createUserID         string
	selectChannelID      string
	selectTeamID         string
	invalidateConnUserID string
	updateConnUserID     string
	attachment           map[string]any
}
func getActionData(data []byte, userIDs, teamIDs, channelIDs []string) *actionData {
	events := []string{
		model.WebsocketEventChannelCreated,
		model.WebsocketEventChannelDeleted,
		model.WebsocketEventUserAdded,
		model.WebsocketEventUserUpdated,
		model.WebsocketEventStatusChange,
		model.WebsocketEventHello,
		model.WebsocketAuthenticationChallenge,
		model.WebsocketEventReactionAdded,
		model.WebsocketEventReactionRemoved,
		model.WebsocketEventResponse,
	}
	if len(data) < 10 {
		return nil
	}
	input := &actionData{}
	input.createUserID = userIDs[int(data[0])%len(userIDs)]
	input.selectChannelID = channelIDs[int(data[1])%len(channelIDs)]
	input.selectTeamID = teamIDs[int(data[2])%len(teamIDs)]
	input.invalidateConnUserID = userIDs[int(data[3])%len(userIDs)]
	input.updateConnUserID = userIDs[int(data[4])%len(userIDs)]
	input.event = events[int(data[5])%len(events)]
	data = data[6:]
	input.attachment = make(map[string]any)
	for len(data) >= 4 {
		k := data[:2]
		v := data[2:4]
		input.attachment[string(k)] = v
		data = data[4:]
	}
	return input
}
var startServerOnce sync.Once
var dataChan chan []byte
var resChan = make(chan int, 4)
func Fuzz(data []byte) int {
	startServerOnce.Do(func() {
		t := &testing.T{}
		th := Setup(t).InitBasic(t)
		s := httptest.NewServer(dummyWebsocketHandler())
		th.Server.HubStart()
		u1 := th.CreateUser(t)
		u2 := th.CreateUser(t)
		u3 := th.CreateUser(t)
		t1 := th.CreateTeam(t)
		t2 := th.CreateTeam(t)
		ch1 := th.CreateDmChannel(u1)
		ch2 := th.CreateChannel(t1)
		ch3 := th.CreateChannel(t2)
		th.LinkUserToTeam(u1, t1)
		th.LinkUserToTeam(u1, t2)
		th.LinkUserToTeam(u2, t1)
		th.LinkUserToTeam(u2, t2)
		th.LinkUserToTeam(u3, t1)
		th.LinkUserToTeam(u3, t2)
		th.AddUserToChannel(u1, ch2)
		th.AddUserToChannel(u2, ch2)
		th.AddUserToChannel(u3, ch2)
		th.AddUserToChannel(u1, ch3)
		th.AddUserToChannel(u2, ch3)
		th.AddUserToChannel(u3, ch3)
		sema := make(chan struct{}, 4)
		dataChan = make(chan []byte)
		go func() {
			for {
				data, ok := <-dataChan
				if !ok {
					return
				}
				sema <- struct{}{}
				go func(data []byte) {
					defer func() {
						<-sema
					}()
					var returnCode int
					defer func() {
						resChan <- returnCode
					}()
					input := getActionData(data,
						[]string{u1.Id, u2.Id, u3.Id, ""},
						[]string{t1.Id, t2.Id, ""},
						[]string{ch1.Id, ch2.Id, ""})
					if input == nil {
						returnCode = 0
						return
					}
					conn := registerDummyWebConn(th.App, s.Listener.Addr(), input.createUserID)
					defer func() {
						conn.Close()
						go func() {
							time.Sleep(2 * time.Second)
							th.App.HubUnregister(conn)
						}()
					}()
					msg := model.NewWebSocketEvent(input.event,
						input.selectTeamID,
						input.selectChannelID,
						input.createUserID, nil, "")
					for k, v := range input.attachment {
						msg.Add(k, v)
					}
					th.App.Publish(msg)
					th.App.InvalidateWebConnSessionCacheForUser(input.invalidateConnUserID)
					sessions, err := th.App.GetSessions(input.updateConnUserID)
					if err != nil {
						panic(err)
					}
					if len(sessions) > 0 {
						th.App.UpdateWebConnUserActivity(*sessions[0], model.GetMillis())
					}
					returnCode = 1
				}(data)
			}
		}()
	})
	dataChan <- data
	result := <-resChan
	return result
}
func generateInitialCorpus() error {
	err := os.MkdirAll("workdir/corpus", 0755)
	if err != nil {
		return err
	}
	for i := 0; i < 100; i++ {
		data := make([]byte, 25)
		_, err = rand.Read(data)
		if err != nil {
			return err
		}
		err = os.WriteFile("./workdir/corpus"+strconv.Itoa(i), data, 0644)
		if err != nil {
			return err
		}
	}
	return nil
}