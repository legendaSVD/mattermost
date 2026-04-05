package app
import (
	"testing"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
func TestHealthCheckJob(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)
	tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
		`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/model"
				"github.com/mattermost/mattermost/server/public/plugin"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) MessageWillBePosted(c *plugin.Context, post *model.Post) (*model.Post, string) {
				panic("Uncaught error")
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
	}, th.App, th.NewPluginAPI)
	defer tearDown()
	env := th.App.GetPluginsEnvironment()
	job := env.GetPluginHealthCheckJob()
	require.NotNil(t, job)
	bundles := env.Active()
	require.Equal(t, 1, len(bundles))
	id := bundles[0].Manifest.Id
	hooks, err := env.HooksForPlugin(id)
	require.NoError(t, err)
	hooks.MessageWillBePosted(&plugin.Context{}, &model.Post{})
	job.CheckPlugin(id)
	bundles = env.Active()
	require.Equal(t, 1, len(bundles))
	require.Equal(t, id, bundles[0].Manifest.Id)
	require.Equal(t, model.PluginStateRunning, env.GetPluginState(id))
	hooks, err = env.HooksForPlugin(id)
	require.NoError(t, err)
	hooks.MessageWillBePosted(&plugin.Context{}, &model.Post{})
	job.CheckPlugin(id)
	bundles = env.Active()
	require.Equal(t, 1, len(bundles))
	require.Equal(t, id, bundles[0].Manifest.Id)
	require.Equal(t, model.PluginStateRunning, env.GetPluginState(id))
	hooks, err = env.HooksForPlugin(id)
	require.NoError(t, err)
	hooks.MessageWillBePosted(&plugin.Context{}, &model.Post{})
	job.CheckPlugin(id)
	bundles = env.Active()
	require.Equal(t, 0, len(bundles))
	require.Equal(t, model.PluginStateFailedToStayRunning, env.GetPluginState(id))
	_, _, err = env.Activate(id)
	require.NoError(t, err)
	job.CheckPlugin(id)
	bundles = env.Active()
	require.Equal(t, 1, len(bundles))
	require.Equal(t, model.PluginStateRunning, env.GetPluginState(id))
}