package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type SlashCommandService struct {
	api plugin.API
}
func (c *SlashCommandService) Register(command *model.Command) error {
	return c.api.RegisterCommand(command)
}
func (c *SlashCommandService) Unregister(teamID, trigger string) error {
	return c.api.UnregisterCommand(teamID, trigger)
}
func (c *SlashCommandService) Execute(command *model.CommandArgs) (*model.CommandResponse, error) {
	return c.api.ExecuteSlashCommand(command)
}
func (c *SlashCommandService) Create(command *model.Command) (*model.Command, error) {
	return c.api.CreateCommand(command)
}
func (c *SlashCommandService) List(teamID string) ([]*model.Command, error) {
	return c.api.ListCommands(teamID)
}
func (c *SlashCommandService) ListCustom(teamID string) ([]*model.Command, error) {
	return c.api.ListCustomCommands(teamID)
}
func (c *SlashCommandService) ListPlugin(teamID string) ([]*model.Command, error) {
	return c.api.ListPluginCommands(teamID)
}
func (c *SlashCommandService) ListBuiltIn() ([]*model.Command, error) {
	return c.api.ListBuiltInCommands()
}
func (c *SlashCommandService) Get(commandID string) (*model.Command, error) {
	return c.api.GetCommand(commandID)
}
func (c *SlashCommandService) Update(commandID string, updatedCmd *model.Command) (*model.Command, error) {
	return c.api.UpdateCommand(commandID, updatedCmd)
}
func (c *SlashCommandService) Delete(commandID string) error {
	return c.api.DeleteCommand(commandID)
}