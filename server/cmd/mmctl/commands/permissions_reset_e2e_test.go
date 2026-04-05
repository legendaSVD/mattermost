package commands
import (
	"github.com/spf13/cobra"
	"github.com/mattermost/mattermost/server/v8/cmd/mmctl/client"
	"github.com/mattermost/mattermost/server/v8/cmd/mmctl/printer"
	"github.com/mattermost/mattermost/server/public/model"
)
func (s *MmctlE2ETestSuite) TestResetPermissionsCmd() {
	s.SetupEnterpriseTestHelper().InitBasic(s.T())
	s.Run("Shouldn't let a non-system-admin reset a role's permissions", func() {
		printer.Clean()
		role, err := s.th.App.GetRoleByName(s.th.Context, model.SystemUserManagerRoleId)
		s.Require().Nil(err)
		defaultPermissions := role.Permissions
		expectedPermissions := []string{model.PermissionUseGroupMentions.Id, model.PermissionUseChannelMentions.Id}
		role.Permissions = expectedPermissions
		role, err = s.th.App.UpdateRole(role)
		s.Require().Nil(err)
		defer func() {
			role.Permissions = defaultPermissions
			_, err = s.th.App.UpdateRole(role)
			s.Require().Nil(err)
		}()
		err2 := resetPermissionsCmdF(s.th.Client, &cobra.Command{}, []string{model.SystemUserManagerRoleId})
		s.Require().Error(err2)
		s.Require().Len(printer.GetLines(), 0)
		s.Require().Len(printer.GetErrorLines(), 0)
		roleAfterResetAttempt, err := s.th.App.GetRoleByName(s.th.Context, model.SystemUserManagerRoleId)
		s.Require().Nil(err)
		s.Require().ElementsMatch(expectedPermissions, roleAfterResetAttempt.Permissions)
	})
	s.RunForSystemAdminAndLocal("Reset a role's permissions", func(c client.Client) {
		printer.Clean()
		role, err := s.th.App.GetRoleByName(s.th.Context, model.SystemUserManagerRoleId)
		s.Require().Nil(err)
		defaultPermissions := role.Permissions
		expectedPermissions := []string{model.PermissionUseGroupMentions.Id, model.PermissionUseChannelMentions.Id}
		role.Permissions = expectedPermissions
		role, err = s.th.App.UpdateRole(role)
		defer func() {
			role.Permissions = defaultPermissions
			_, err = s.th.App.UpdateRole(role)
			s.Require().Nil(err)
		}()
		err2 := resetPermissionsCmdF(c, &cobra.Command{}, []string{model.SystemUserManagerRoleId})
		s.Require().Nil(err2)
		s.Require().Len(printer.GetLines(), 1)
		s.Require().Len(printer.GetErrorLines(), 0)
		roleAfterResetAttempt, err := s.th.App.GetRoleByName(s.th.Context, model.SystemUserManagerRoleId)
		s.Require().Nil(err)
		s.Require().ElementsMatch(defaultPermissions, roleAfterResetAttempt.Permissions)
	})
}