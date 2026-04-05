package main_test
import (
	"database/sql"
	"testing"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/shared/driver"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/app/plugin_api_tests"
	"github.com/mattermost/mattermost/server/v8/channels/store/sqlstore"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
type MyPlugin struct {
	plugin.MattermostPlugin
	config plugin_api_tests.BasicConfig
	t      *testing.T
}
func (p *MyPlugin) OnConfigurationChange() error {
	if err := p.API.LoadPluginConfiguration(&p.config); err != nil {
		return err
	}
	return nil
}
func (p *MyPlugin) MessageWillBePosted(_ *plugin.Context, _ *model.Post) (*model.Post, string) {
	rctx := request.TestContext(p.t)
	settings := p.API.GetUnsanitizedConfig().SqlSettings
	settings.Trace = model.NewPointer(false)
	store, err := sqlstore.New(settings, rctx.Logger(), nil, sqlstore.DisableMorphLogging())
	if err != nil {
		panic(err)
	}
	store.GetMaster().Close()
	for _, isMaster := range []bool{true, false} {
		handle := sql.OpenDB(driver.NewConnector(p.Driver, isMaster))
		store.SetMasterX(handle)
		wrapper := sqlstore.NewStoreTestWrapper(store)
		storetest.TestPostStore(p.t, rctx, store, wrapper)
		storetest.TestUserStore(p.t, rctx, store, wrapper)
		storetest.TestTeamStore(p.t, rctx, store)
		storetest.TestChannelStore(p.t, rctx, store, wrapper)
		storetest.TestBotStore(p.t, rctx, store, wrapper)
		store.GetMaster().Close()
	}
	return nil, "OK"
}
func TestDBAPI(t *testing.T) {
	plugin.ClientMain(&MyPlugin{t: t})
}