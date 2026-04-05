package slashcommands
import (
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/mattermost/mattermost/server/public/model"
)
func TestInvitePeopleProvider(t *testing.T) {
	th := setup(t).initBasic(t)
	th.App.UpdateConfig(func(cfg *model.Config) {
		*cfg.EmailSettings.SendEmailNotifications = true
		*cfg.ServiceSettings.EnableEmailInvitations = true
	})
	cmd := InvitePeopleProvider{}
	notTeamUser := th.createUser(t)
	args := &model.CommandArgs{
		T:         func(s string, args ...any) string { return s },
		ChannelId: th.BasicChannel.Id,
		TeamId:    th.BasicTeam.Id,
		UserId:    notTeamUser.Id,
	}
	actual := cmd.DoCommand(th.App, th.Context, args, model.NewId()+"@simulator.amazonses.com")
	assert.Equal(t, "api.command_invite_people.permission.app_error", actual.Text)
	args.UserId = th.BasicUser.Id
	actual = cmd.DoCommand(th.App, th.Context, args, model.NewId()+"@simulator.amazonses.com")
	assert.Equal(t, "api.command.invite_people.sent", actual.Text)
}