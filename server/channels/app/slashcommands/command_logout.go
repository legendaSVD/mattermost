package slashcommands
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/app"
)
type LogoutProvider struct {
}
const (
	CmdLogout = "logout"
)
func init() {
	app.RegisterCommandProvider(&LogoutProvider{})
}
func (*LogoutProvider) GetTrigger() string {
	return CmdLogout
}
func (*LogoutProvider) GetCommand(a *app.App, T i18n.TranslateFunc) *model.Command {
	return &model.Command{
		Trigger:          CmdLogout,
		AutoComplete:     true,
		AutoCompleteDesc: T("api.command_logout.desc"),
		AutoCompleteHint: "",
		DisplayName:      T("api.command_logout.name"),
	}
}
func (*LogoutProvider) DoCommand(a *app.App, _ request.CTX, args *model.CommandArgs, message string) *model.CommandResponse {
	return &model.CommandResponse{GotoLocation: "/login"}
}