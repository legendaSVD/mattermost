package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type ConfigurationService struct {
	api plugin.API
}
func (c *ConfigurationService) LoadPluginConfiguration(dest any) error {
	return c.api.LoadPluginConfiguration(dest)
}
func (c *ConfigurationService) GetConfig() *model.Config {
	return c.api.GetConfig()
}
func (c *ConfigurationService) GetUnsanitizedConfig() *model.Config {
	return c.api.GetUnsanitizedConfig()
}
func (c *ConfigurationService) SaveConfig(cfg *model.Config) error {
	return normalizeAppErr(c.api.SaveConfig(cfg))
}
func (c *ConfigurationService) GetPluginConfig() map[string]any {
	return c.api.GetPluginConfig()
}
func (c *ConfigurationService) SavePluginConfig(cfg map[string]any) error {
	return normalizeAppErr(c.api.SavePluginConfig(cfg))
}