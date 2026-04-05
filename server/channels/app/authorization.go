package app
import (
	"database/sql"
	"errors"
	"net/http"
	"slices"
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
func (a *App) SessionHasPermissionTo(session model.Session, permission *model.Permission) bool {
	if session.IsUnrestricted() {
		return true
	}
	return a.RolesGrantPermission(session.GetUserRoles(), permission.Id)
}
func (a *App) SessionHasPermissionToAndNotRestrictedAdmin(session model.Session, permission *model.Permission) bool {
	if session.IsUnrestricted() {
		return true
	}
	if *a.Config().ExperimentalSettings.RestrictSystemAdmin {
		return false
	}
	return a.RolesGrantPermission(session.GetUserRoles(), permission.Id)
}
func (a *App) SessionHasPermissionToAny(session model.Session, permissions []*model.Permission) bool {
	for _, perm := range permissions {
		if a.SessionHasPermissionTo(session, perm) {
			return true
		}
	}
	return false
}
func (a *App) SessionHasPermissionToTeam(session model.Session, teamID string, permission *model.Permission) bool {
	if teamID == "" {
		return false
	}
	if session.IsUnrestricted() {
		return true
	}
	teamMember := session.GetTeamByTeamId(teamID)
	if teamMember != nil {
		if a.RolesGrantPermission(teamMember.GetRoles(), permission.Id) {
			return true
		}
	}
	return a.RolesGrantPermission(session.GetUserRoles(), permission.Id)
}
func (a *App) SessionHasPermissionToTeams(rctx request.CTX, session model.Session, teamIDs []string, permission *model.Permission) bool {
	if len(teamIDs) == 0 {
		return true
	}
	if slices.Contains(teamIDs, "") {
		return false
	}
	if a.SessionHasPermissionTo(session, permission) {
		return true
	}
	for _, teamID := range teamIDs {
		tm := session.GetTeamByTeamId(teamID)
		if tm != nil {
			if a.RolesGrantPermission(tm.GetRoles(), permission.Id) {
				continue
			}
		}
		return false
	}
	return true
}
func (a *App) SessionHasPermissionToChannel(rctx request.CTX, session model.Session, channelID string, permission *model.Permission) (hasPermission bool, isMember bool) {
	if channelID == "" {
		return false, false
	}
	channel, appErr := a.GetChannel(rctx, channelID)
	if appErr != nil && appErr.StatusCode == http.StatusNotFound {
		return false, false
	} else if appErr != nil {
		rctx.Logger().Warn("Failed to get channel", mlog.String("channel_id", channelID), mlog.Err(appErr))
		return false, false
	}
	if session.IsUnrestricted() {
		return true, false
	}
	isMember = false
	ids, err := a.Srv().Store().Channel().GetAllChannelMembersForUser(rctx, session.UserId, true, true)
	var channelRoles []string
	if err == nil {
		if roles, ok := ids[channelID]; ok {
			isMember = true
			channelRoles = strings.Fields(roles)
			if a.RolesGrantPermission(channelRoles, permission.Id) {
				return true, isMember
			}
		}
	}
	if a.RolesGrantPermission(session.GetUserRoles(), model.PermissionManageSystem.Id) {
		return true, isMember
	}
	if channel.TeamId != "" {
		return a.SessionHasPermissionToTeam(session, channel.TeamId, permission), isMember
	}
	return a.SessionHasPermissionTo(session, permission), isMember
}
func (a *App) SessionHasPermissionToChannels(rctx request.CTX, session model.Session, channelIDs []string, permission *model.Permission) bool {
	if len(channelIDs) == 0 {
		return true
	}
	if session.IsUnrestricted() || a.RolesGrantPermission(session.GetUserRoles(), model.PermissionManageSystem.Id) {
		return true
	}
	for _, channelID := range channelIDs {
		if channelID == "" {
			return false
		}
		_, appErr := a.GetChannel(rctx, channelID)
		if appErr != nil {
			return false
		}
	}
	if a.SessionHasPermissionTo(session, permission) {
		return true
	}
	ids, err := a.Srv().Store().Channel().GetAllChannelMembersForUser(rctx, session.UserId, true, true)
	var channelRoles []string
	for _, channelID := range channelIDs {
		if err == nil {
			if roles, ok := ids[channelID]; ok {
				channelRoles = strings.Fields(roles)
				if a.RolesGrantPermission(channelRoles, permission.Id) {
					continue
				}
			}
		}
		return false
	}
	return true
}
func (a *App) SessionHasPermissionToGroup(session model.Session, groupID string, permission *model.Permission) bool {
	groupMember, err := a.Srv().Store().Group().GetMember(groupID, session.UserId)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return false
	}
	if groupMember != nil && a.RolesGrantPermission([]string{model.CustomGroupUserRoleId}, permission.Id) {
		return true
	}
	return a.SessionHasPermissionTo(session, permission)
}
func (a *App) SessionHasPermissionToChannelByPost(session model.Session, postID string, permission *model.Permission) bool {
	if postID == "" {
		return false
	}
	if channelMember, err := a.Srv().Store().Channel().GetMemberForPost(postID, session.UserId); err == nil {
		if a.RolesGrantPermission(channelMember.GetRoles(), permission.Id) {
			return true
		}
	}
	if channel, err := a.Srv().Store().Channel().GetForPost(postID); err == nil {
		if channel.TeamId != "" {
			return a.SessionHasPermissionToTeam(session, channel.TeamId, permission)
		}
	}
	return a.SessionHasPermissionTo(session, permission)
}
func (a *App) SessionHasPermissionToReadPost(rctx request.CTX, session model.Session, postID string) (hasPErmission bool, isMember bool) {
	if postID == "" {
		return false, false
	}
	channel, err := a.Srv().Store().Channel().GetForPost(postID)
	if err != nil {
		return a.SessionHasPermissionTo(session, model.PermissionReadChannelContent), false
	}
	return a.SessionHasPermissionToReadChannel(rctx, session, channel)
}
func (a *App) SessionHasPermissionToCategory(rctx request.CTX, session model.Session, userID, teamID, categoryId string) bool {
	if a.SessionHasPermissionTo(session, model.PermissionEditOtherUsers) {
		return true
	}
	category, err := a.GetSidebarCategory(rctx, categoryId)
	return err == nil && category != nil && category.UserId == session.UserId && category.UserId == userID && category.TeamId == teamID
}
func (a *App) SessionHasPermissionToUser(session model.Session, userID string) bool {
	if userID == "" {
		return false
	}
	if session.IsUnrestricted() || a.SessionHasPermissionTo(session, model.PermissionManageSystem) {
		return true
	}
	if session.UserId == userID {
		return true
	}
	if !a.SessionHasPermissionTo(session, model.PermissionEditOtherUsers) {
		return false
	}
	user, err := a.GetUser(userID)
	if err != nil {
		return false
	}
	if user.IsSystemAdmin() {
		return false
	}
	return true
}
func (a *App) SessionHasPermissionToUserOrBot(rctx request.CTX, session model.Session, userID string) bool {
	if session.IsUnrestricted() {
		return true
	}
	err := a.SessionHasPermissionToManageBot(rctx, session, userID)
	if err == nil {
		return true
	}
	if err.Id == "store.sql_bot.get.missing.app_error" && err.Where == "SqlBotStore.Get" {
		if a.SessionHasPermissionToUser(session, userID) {
			return true
		}
	}
	return false
}
func (a *App) HasPermissionTo(askingUserId string, permission *model.Permission) bool {
	user, err := a.GetUser(askingUserId)
	if err != nil {
		return false
	}
	roles := user.GetRoles()
	return a.RolesGrantPermission(roles, permission.Id)
}
func (a *App) HasPermissionToTeam(rctx request.CTX, askingUserId string, teamID string, permission *model.Permission) bool {
	if teamID == "" || askingUserId == "" {
		return false
	}
	teamMember, _ := a.GetTeamMember(rctx, teamID, askingUserId)
	if teamMember != nil && teamMember.DeleteAt == 0 {
		if a.RolesGrantPermission(teamMember.GetRoles(), permission.Id) {
			return true
		}
	}
	return a.HasPermissionTo(askingUserId, permission)
}
func (a *App) HasPermissionToChannel(rctx request.CTX, askingUserId string, channelID string, permission *model.Permission) (hasPermission bool, isMember bool) {
	if channelID == "" || askingUserId == "" {
		return false, false
	}
	isMember = false
	ids, err := a.Srv().Store().Channel().GetAllChannelMembersForUser(rctx, askingUserId, true, true)
	var channelRoles []string
	if err == nil {
		if roles, ok := ids[channelID]; ok {
			isMember = true
			channelRoles = strings.Fields(roles)
			if a.RolesGrantPermission(channelRoles, permission.Id) {
				return true, isMember
			}
		}
	}
	channel, appErr := a.GetChannel(rctx, channelID)
	if appErr == nil && channel.TeamId != "" {
		return a.HasPermissionToTeam(rctx, askingUserId, channel.TeamId, permission), isMember
	}
	return a.HasPermissionTo(askingUserId, permission), isMember
}
func (a *App) HasPermissionToChannelByPost(rctx request.CTX, askingUserId string, postID string, permission *model.Permission) bool {
	if channelMember, err := a.Srv().Store().Channel().GetMemberForPost(postID, askingUserId); err == nil {
		if a.RolesGrantPermission(channelMember.GetRoles(), permission.Id) {
			return true
		}
	}
	if channel, err := a.Srv().Store().Channel().GetForPost(postID); err == nil {
		return a.HasPermissionToTeam(rctx, askingUserId, channel.TeamId, permission)
	}
	return a.HasPermissionTo(askingUserId, permission)
}
func (a *App) HasPermissionToUser(askingUserId string, userID string) bool {
	if askingUserId == userID {
		return true
	}
	if a.HasPermissionTo(askingUserId, model.PermissionEditOtherUsers) {
		return true
	}
	return false
}
func (a *App) RolesGrantPermission(roleNames []string, permissionId string) bool {
	roles, err := a.GetRolesByNames(roleNames)
	if err != nil {
		mlog.Error("Failed to get roles from database with role names: "+strings.Join(roleNames, ",")+" ", mlog.Err(err))
		return false
	}
	for _, role := range roles {
		if role.DeleteAt != 0 {
			continue
		}
		permissions := role.Permissions
		if slices.Contains(permissions, permissionId) {
			return true
		}
	}
	return false
}
func (a *App) SessionHasPermissionToManageBot(rctx request.CTX, session model.Session, botUserId string) *model.AppError {
	existingBot, err := a.GetBot(rctx, botUserId, true)
	if err != nil {
		return err
	}
	if session.IsUnrestricted() {
		return nil
	}
	if existingBot.OwnerId == session.UserId {
		if !a.SessionHasPermissionTo(session, model.PermissionManageBots) {
			if !a.SessionHasPermissionTo(session, model.PermissionReadBots) {
				return model.MakeBotNotFoundError("permissions", botUserId)
			}
			return model.MakePermissionError(&session, []*model.Permission{model.PermissionManageBots})
		}
	} else {
		if !a.SessionHasPermissionTo(session, model.PermissionManageOthersBots) {
			if !a.SessionHasPermissionTo(session, model.PermissionReadOthersBots) {
				return model.MakeBotNotFoundError("permissions", botUserId)
			}
			return model.MakePermissionError(&session, []*model.Permission{model.PermissionManageOthersBots})
		}
	}
	return nil
}
func (a *App) SessionHasPermissionToReadChannel(rctx request.CTX, session model.Session, channel *model.Channel) (hasPermission bool, isMember bool) {
	if session.IsUnrestricted() {
		return true, false
	}
	return a.HasPermissionToReadChannel(rctx, session.UserId, channel)
}
func (a *App) HasPermissionToReadChannel(rctx request.CTX, userID string, channel *model.Channel) (hasPermission bool, isMember bool) {
	if ok, member := a.HasPermissionToChannel(rctx, userID, channel.Id, model.PermissionReadChannelContent); ok {
		return true, member
	}
	if channel.Type == model.ChannelTypeOpen && !*a.Config().ComplianceSettings.Enable {
		return a.HasPermissionToTeam(rctx, userID, channel.TeamId, model.PermissionReadPublicChannel), false
	}
	return false, false
}
func (a *App) HasPermissionToChannelMemberCount(rctx request.CTX, userID string, channel *model.Channel) bool {
	if ok, _ := a.HasPermissionToChannel(rctx, userID, channel.Id, model.PermissionReadChannelContent); ok {
		return true
	}
	if channel.Type == model.ChannelTypeOpen {
		return a.HasPermissionToTeam(rctx, userID, channel.TeamId, model.PermissionListTeamChannels)
	}
	return false
}