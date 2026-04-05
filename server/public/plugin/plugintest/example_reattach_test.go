package plugintest_test
import (
	"context"
	"os"
	"testing"
	"time"
	"github.com/stretchr/testify/require"
	goPlugin "github.com/hashicorp/go-plugin"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type UnitTestedPlugin struct {
	plugin.MattermostPlugin
}
func Example_unitTestingPlugins() {
	t := &testing.T{}
	manifest := &model.Manifest{
		Id: "reattach-plugin-test",
	}
	ctx, cancel := context.WithCancel(context.Background())
	reattachConfigCh := make(chan *goPlugin.ReattachConfig)
	closeCh := make(chan struct{})
	go plugin.ClientMain(
		&UnitTestedPlugin{},
		plugin.WithTestContext(ctx),
		plugin.WithTestReattachConfigCh(reattachConfigCh),
		plugin.WithTestCloseCh(closeCh),
	)
	t.Cleanup(func() {
		cancel()
		select {
		case <-closeCh:
		case <-time.After(5 * time.Second):
			panic("plugin failed to close after 5 seconds")
		}
	})
	var reattachConfig *goPlugin.ReattachConfig
	select {
	case reattachConfig = <-reattachConfigCh:
	case <-time.After(5 * time.Second):
		t.Fatal("failed to get reattach config")
	}
	socketPath := os.Getenv("MM_LOCALSOCKETPATH")
	if socketPath == "" {
		socketPath = model.LocalModeSocketPath
	}
	clientLocal := model.NewAPIv4SocketClient(socketPath)
	_, err := clientLocal.ReattachPlugin(ctx, &model.PluginReattachRequest{
		Manifest:             manifest,
		PluginReattachConfig: model.NewPluginReattachConfig(reattachConfig),
	})
	require.NoError(t, err)
}