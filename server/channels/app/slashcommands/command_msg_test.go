package slashcommands
import (
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
)
func TestMsgProvider(t *testing.T) {
	th := setup(t).initBasic(t)
	team := th.createTeam(t)
	th.linkUserToTeam(t, th.BasicUser, team)
	cmd := &msgProvider{}
	th.removePermissionFromRole(t, model.PermissionCreateDirectChannel.Id, model.SystemUserRoleId)
	resp := cmd.DoCommand(th.App, th.Context, &model.CommandArgs{
		T:       i18n.IdentityTfunc(),
		SiteURL: "http://test.url",
		TeamId:  team.Id,
		UserId:  th.BasicUser.Id,
	}, "@"+th.BasicUser2.Username+" hello")
	channelName := model.GetDMNameFromIds(th.BasicUser.Id, th.BasicUser2.Id)
	assert.Equal(t, "api.command_msg.permission.app_error", resp.Text)
	assert.Equal(t, "", resp.GotoLocation)
	th.addPermissionToRole(t, model.PermissionCreateDirectChannel.Id, model.SystemUserRoleId)
	resp = cmd.DoCommand(th.App, th.Context, &model.CommandArgs{
		T:       i18n.IdentityTfunc(),
		SiteURL: "http://test.url",
		TeamId:  team.Id,
		UserId:  th.BasicUser.Id,
	}, "@"+th.BasicUser2.Username+" hello")
	assert.Equal(t, "", resp.Text)
	assert.Equal(t, "http://test.url/"+team.Name+"/channels/"+channelName, resp.GotoLocation)
	resp = cmd.DoCommand(th.App, th.Context, &model.CommandArgs{
		T:       i18n.IdentityTfunc(),
		SiteURL: "http://test.url",
		TeamId:  team.Id,
		UserId:  th.BasicUser.Id,
	}, "@"+th.BasicUser2.Username+" hello")
	assert.Equal(t, "", resp.Text)
	assert.Equal(t, "http://test.url/"+team.Name+"/channels/"+channelName, resp.GotoLocation)
	guest := th.createGuest(t)
	user := th.createUser(t)
	th.linkUserToTeam(t, user, team)
	th.linkUserToTeam(t, guest, th.BasicTeam)
	th.addUserToChannel(t, guest, th.BasicChannel)
	resp = cmd.DoCommand(th.App, th.Context, &model.CommandArgs{
		T:       i18n.IdentityTfunc(),
		SiteURL: "http://test.url",
		TeamId:  th.BasicTeam.Id,
		UserId:  guest.Id,
	}, "@"+user.Username+" hello")
	assert.Equal(t, "api.command_msg.missing.app_error", resp.Text)
	assert.Equal(t, "", resp.GotoLocation)
	th.linkUserToTeam(t, user, th.BasicTeam)
	th.addUserToChannel(t, user, th.BasicChannel)
	resp = cmd.DoCommand(th.App, th.Context, &model.CommandArgs{
		T:       i18n.IdentityTfunc(),
		SiteURL: "http://test.url",
		TeamId:  th.BasicTeam.Id,
		UserId:  guest.Id,
	}, "@"+user.Username+" hello")
	channelName = model.GetDMNameFromIds(guest.Id, user.Id)
	assert.Equal(t, "", resp.Text)
	assert.Equal(t, "http://test.url/"+th.BasicTeam.Name+"/channels/"+channelName, resp.GotoLocation)
}