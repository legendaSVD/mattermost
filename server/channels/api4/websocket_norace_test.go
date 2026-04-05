package api4
import (
	"testing"
	"time"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
)
func TestWebSocket(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	WebSocketClient, err := th.CreateWebSocketClient()
	require.NoError(t, err)
	defer WebSocketClient.Close()
	time.Sleep(300 * time.Millisecond)
	WebSocketClient.Close()
	appErr := WebSocketClient.Connect()
	require.Nil(t, appErr)
	WebSocketClient.Listen()
	resp := <-WebSocketClient.ResponseChannel
	require.Equal(t, resp.Status, model.StatusOk, "should have responded OK to authentication challenge")
	WebSocketClient.SendMessage("ping", nil)
	resp = <-WebSocketClient.ResponseChannel
	require.Equal(t, resp.Data["text"].(string), "pong", "wrong response")
	WebSocketClient.SendMessage("", nil)
	resp = <-WebSocketClient.ResponseChannel
	require.Equal(t, resp.Error.Id, "api.web_socket_router.no_action.app_error", "should have been no action response")
	WebSocketClient.SendMessage("junk", nil)
	resp = <-WebSocketClient.ResponseChannel
	require.Equal(t, resp.Error.Id, "api.web_socket_router.bad_action.app_error", "should have been bad action response")
	WebSocketClient.UserTyping("", "")
	resp = <-WebSocketClient.ResponseChannel
	require.Equal(t, resp.Error.Id, "api.websocket_handler.invalid_param.app_error", "should have been invalid param response")
	require.Equal(t, resp.Error.DetailedError, "", "detailed error not cleared")
	WebSocketClient.UserTyping(th.BasicChannel.Id, "")
	resp = <-WebSocketClient.ResponseChannel
	require.Nil(t, resp.Error)
	WebSocketClient.UserTyping(th.BasicPrivateChannel2.Id, "")
	resp = <-WebSocketClient.ResponseChannel
	require.Equal(t, resp.Error.Id, "api.websocket_handler.invalid_param.app_error", "should have been invalid param response")
	require.Equal(t, resp.Error.DetailedError, "", "detailed error not cleared")
}