package plugin
import (
	"context"
	"github.com/hashicorp/go-plugin"
)
const (
	InternalKeyPrefix = "mmi_"
	BotUserKey        = InternalKeyPrefix + "botid"
)
func WithTestContext(ctx context.Context) func(*plugin.ServeConfig) error {
	return func(config *plugin.ServeConfig) error {
		if config.Test == nil {
			config.Test = &plugin.ServeTestConfig{}
		}
		config.Test.Context = ctx
		return nil
	}
}
func WithTestReattachConfigCh(reattachConfigCh chan<- *plugin.ReattachConfig) func(*plugin.ServeConfig) error {
	return func(config *plugin.ServeConfig) error {
		if config.Test == nil {
			config.Test = &plugin.ServeTestConfig{}
		}
		config.Test.ReattachConfigCh = reattachConfigCh
		return nil
	}
}
func WithTestCloseCh(closeCh chan<- struct{}) func(*plugin.ServeConfig) error {
	return func(config *plugin.ServeConfig) error {
		if config.Test == nil {
			config.Test = &plugin.ServeTestConfig{}
		}
		config.Test.CloseCh = closeCh
		return nil
	}
}
func ClientMain(pluginImplementation any, opts ...func(config *plugin.ServeConfig) error) {
	impl, ok := pluginImplementation.(interface {
		SetAPI(api API)
		SetDriver(driver Driver)
	})
	if !ok {
		panic("Plugin implementation given must embed plugin.MattermostPlugin")
	}
	impl.SetAPI(nil)
	impl.SetDriver(nil)
	pluginMap := map[string]plugin.Plugin{
		"hooks": &hooksPlugin{hooks: pluginImplementation},
	}
	serveConfig := &plugin.ServeConfig{
		HandshakeConfig: handshake,
		Plugins:         pluginMap,
	}
	for _, opt := range opts {
		err := opt(serveConfig)
		if err != nil {
			panic("failed to start serving plugin: " + err.Error())
		}
	}
	plugin.Serve(serveConfig)
}
type MattermostPlugin struct {
	API    API
	Driver Driver
}
func (p *MattermostPlugin) SetAPI(api API) {
	p.API = api
}
func (p *MattermostPlugin) SetDriver(driver Driver) {
	p.Driver = driver
}