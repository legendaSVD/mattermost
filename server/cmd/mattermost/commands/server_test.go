package commands
import (
	"net"
	"os"
	"syscall"
	"testing"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/v8/channels/jobs"
	"github.com/mattermost/mattermost/server/v8/config"
)
const (
	unitTestListeningPort = "localhost:0"
)
type ServerTestHelper struct {
	disableConfigWatch bool
	interruptChan      chan os.Signal
	originalInterval   int
}
func SetupServerTest(tb testing.TB) *ServerTestHelper {
	if testing.Short() {
		tb.SkipNow()
	}
	interruptChan := make(chan os.Signal, 1)
	interruptChan <- syscall.SIGINT
	originalInterval := jobs.DefaultWatcherPollingInterval
	jobs.DefaultWatcherPollingInterval = 200
	th := &ServerTestHelper{
		disableConfigWatch: true,
		interruptChan:      interruptChan,
		originalInterval:   originalInterval,
	}
	return th
}
func (th *ServerTestHelper) TearDownServerTest() {
	jobs.DefaultWatcherPollingInterval = th.originalInterval
}
func TestRunServerSuccess(t *testing.T) {
	th := SetupServerTest(t)
	defer th.TearDownServerTest()
	configStore := config.NewTestMemoryStore()
	cfg := configStore.Get()
	*cfg.ServiceSettings.ListenAddress = unitTestListeningPort
	cfg.SqlSettings = *mainHelper.GetSQLSettings()
	configStore.Set(cfg)
	err := runServer(configStore, th.interruptChan)
	require.NoError(t, err)
}
func TestRunServerSystemdNotification(t *testing.T) {
	th := SetupServerTest(t)
	defer th.TearDownServerTest()
	socketFile, err := os.CreateTemp("", "mattermost-systemd-mock-socket-")
	require.NoError(t, err)
	socketPath := socketFile.Name()
	os.Remove(socketPath)
	originalSocket := os.Getenv("NOTIFY_SOCKET")
	os.Setenv("NOTIFY_SOCKET", socketPath)
	defer os.Setenv("NOTIFY_SOCKET", originalSocket)
	addr := &net.UnixAddr{
		Name: socketPath,
		Net:  "unixgram",
	}
	connection, err := net.ListenUnixgram("unixgram", addr)
	require.NoError(t, err)
	defer connection.Close()
	defer os.Remove(socketPath)
	socketReader := make(chan string)
	go func(ch chan string) {
		buffer := make([]byte, 512)
		count, readErr := connection.Read(buffer)
		require.NoError(t, readErr)
		data := buffer[0:count]
		ch <- string(data)
	}(socketReader)
	configStore := config.NewTestMemoryStore()
	cfg := configStore.Get()
	*cfg.ServiceSettings.ListenAddress = unitTestListeningPort
	cfg.SqlSettings = *mainHelper.GetSQLSettings()
	configStore.Set(cfg)
	err = runServer(configStore, th.interruptChan)
	require.NoError(t, err)
	notification := <-socketReader
	require.Equal(t, notification, "READY=1")
}
func TestRunServerNoSystemd(t *testing.T) {
	th := SetupServerTest(t)
	defer th.TearDownServerTest()
	originalSocket := os.Getenv("NOTIFY_SOCKET")
	os.Unsetenv("NOTIFY_SOCKET")
	defer os.Setenv("NOTIFY_SOCKET", originalSocket)
	configStore := config.NewTestMemoryStore()
	cfg := configStore.Get()
	*cfg.ServiceSettings.ListenAddress = unitTestListeningPort
	cfg.SqlSettings = *mainHelper.GetSQLSettings()
	configStore.Set(cfg)
	err := runServer(configStore, th.interruptChan)
	require.NoError(t, err)
}