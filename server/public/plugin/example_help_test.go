package plugin_test
import (
	"strings"
	"sync"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type configuration struct {
	TeamName    string
	ChannelName string
	channelID string
}
type HelpPlugin struct {
	plugin.MattermostPlugin
	configurationLock sync.RWMutex
	configuration *configuration
}
func (p *HelpPlugin) getConfiguration() *configuration {
	p.configurationLock.RLock()
	defer p.configurationLock.RUnlock()
	if p.configuration == nil {
		return &configuration{}
	}
	return p.configuration
}
func (p *HelpPlugin) setConfiguration(configuration *configuration) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()
	p.configuration = configuration
}
func (p *HelpPlugin) OnConfigurationChange() error {
	var configuration = new(configuration)
	if err := p.API.LoadPluginConfiguration(configuration); err != nil {
		return errors.Wrap(err, "failed to load plugin configuration")
	}
	team, err := p.API.GetTeamByName(configuration.TeamName)
	if err != nil {
		return errors.Wrapf(err, "failed to find team %s", configuration.TeamName)
	}
	channel, err := p.API.GetChannelByName(team.Id, configuration.ChannelName, false)
	if err != nil {
		return errors.Wrapf(err, "failed to find channel %s", configuration.ChannelName)
	}
	configuration.channelID = channel.Id
	p.setConfiguration(configuration)
	return nil
}
func (p *HelpPlugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	configuration := p.getConfiguration()
	if post.ChannelId != configuration.channelID {
		return
	}
	if sentByPlugin, _ := post.GetProp("sent_by_plugin").(bool); sentByPlugin {
		return
	}
	if !strings.Contains(post.Message, "help") {
		return
	}
	p.API.SendEphemeralPost(post.UserId, &model.Post{
		ChannelId: configuration.channelID,
		Message:   "You asked for help? Checkout https://support.mattermost.com/hc/en-us",
		Props: map[string]any{
			"sent_by_plugin": true,
		},
	})
}
func Example_helpPlugin() {
	plugin.ClientMain(&HelpPlugin{})
}