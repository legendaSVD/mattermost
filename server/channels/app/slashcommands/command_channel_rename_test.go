package slashcommands
import (
	"strings"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/mattermost/mattermost/server/public/model"
)
func TestRenameProviderDoCommand(t *testing.T) {
	th := setup(t).initBasic(t)
	th.addPermissionToRole(t, model.PermissionManagePublicChannelProperties.Id, model.ChannelUserRoleId)
	rp := RenameProvider{}
	args := &model.CommandArgs{
		T:         func(s string, args ...any) string { return s },
		ChannelId: th.BasicChannel.Id,
		UserId:    th.BasicUser.Id,
	}
	for msg, expected := range map[string]string{
		"":                                    "api.command_channel_rename.message.app_error",
		"o":                                   "",
		"joram":                               "",
		"More than 22 chars but less than 64": "",
		strings.Repeat("12345", 13):           "api.command_channel_rename.too_long.app_error",
	} {
		actual := rp.DoCommand(th.App, th.Context, args, msg).Text
		assert.Equal(t, expected, actual)
	}
	th.removePermissionFromRole(t, model.PermissionManagePublicChannelProperties.Id, model.ChannelUserRoleId)
	args = &model.CommandArgs{
		T:         func(s string, args ...any) string { return s },
		ChannelId: th.BasicChannel.Id,
		UserId:    th.BasicUser.Id,
	}
	actual := rp.DoCommand(th.App, th.Context, args, "hello").Text
	assert.Equal(t, "api.command_channel_rename.permission.app_error", actual)
	privateChannel := th.createPrivateChannel(t, th.BasicTeam)
	th.addPermissionToRole(t, model.PermissionManagePrivateChannelProperties.Id, model.ChannelUserRoleId)
	args = &model.CommandArgs{
		T:         func(s string, args ...any) string { return s },
		ChannelId: privateChannel.Id,
		UserId:    th.BasicUser.Id,
	}
	actual = rp.DoCommand(th.App, th.Context, args, "hello").Text
	assert.Equal(t, "", actual)
	th.removePermissionFromRole(t, model.PermissionManagePrivateChannelProperties.Id, model.ChannelUserRoleId)
	args = &model.CommandArgs{
		T:         func(s string, args ...any) string { return s },
		ChannelId: privateChannel.Id,
		UserId:    th.BasicUser.Id,
	}
	actual = rp.DoCommand(th.App, th.Context, args, "hello").Text
	assert.Equal(t, "api.command_channel_rename.permission.app_error", actual)
	user1 := th.createUser(t)
	user2 := th.createUser(t)
	groupChannel := th.createGroupChannel(t, user1, user2)
	args = &model.CommandArgs{
		T:         func(s string, args ...any) string { return s },
		ChannelId: groupChannel.Id,
		UserId:    th.BasicUser.Id,
	}
	actual = rp.DoCommand(th.App, th.Context, args, "hello").Text
	assert.Equal(t, "api.command_channel_rename.direct_group.app_error", actual)
	directChannel := th.createDmChannel(t, user1)
	args = &model.CommandArgs{
		T:         func(s string, args ...any) string { return s },
		ChannelId: directChannel.Id,
		UserId:    th.BasicUser.Id,
	}
	actual = rp.DoCommand(th.App, th.Context, args, "hello").Text
	assert.Equal(t, "api.command_channel_rename.direct_group.app_error", actual)
}