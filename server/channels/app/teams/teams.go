package teams
import (
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
func (ts *TeamService) CreateTeam(rctx request.CTX, team *model.Team) (*model.Team, error) {
	team.InviteId = ""
	rteam, err := ts.store.Save(team)
	if err != nil {
		return nil, err
	}
	if _, err := ts.createDefaultChannels(rctx, rteam.Id); err != nil {
		return nil, err
	}
	return rteam, nil
}
func (ts *TeamService) GetTeam(teamID string) (*model.Team, error) {
	team, err := ts.store.Get(teamID)
	if err != nil {
		return nil, err
	}
	return team, nil
}
func (ts *TeamService) GetTeams(teamIDs []string) ([]*model.Team, error) {
	teams, err := ts.store.GetMany(teamIDs)
	if err != nil {
		return nil, err
	}
	return teams, nil
}
func (ts *TeamService) createDefaultChannels(rctx request.CTX, teamID string) ([]*model.Channel, error) {
	displayNames := map[string]string{
		"town-square": i18n.T("api.channel.create_default_channels.town_square"),
		"off-topic":   i18n.T("api.channel.create_default_channels.off_topic"),
	}
	channels := []*model.Channel{}
	defaultChannelNames := ts.DefaultChannelNames()
	for _, name := range defaultChannelNames {
		var displayName string
		if displayNameValue, ok := displayNames[name]; ok {
			displayName = i18n.TDefault(displayNameValue, name)
		} else {
			displayName = name
		}
		channel := &model.Channel{DisplayName: displayName, Name: name, Type: model.ChannelTypeOpen, TeamId: teamID}
		if _, err := ts.channelStore.Save(rctx, channel, *ts.config().TeamSettings.MaxChannelsPerTeam); err != nil {
			return nil, err
		}
		channels = append(channels, channel)
	}
	return channels, nil
}
type UpdateOptions struct {
	Sanitized bool
	Imported  bool
}
func (ts *TeamService) UpdateTeam(team *model.Team, opts UpdateOptions) (*model.Team, error) {
	oldTeam := team
	var err error
	if !opts.Imported {
		oldTeam, err = ts.store.Get(team.Id)
		if err != nil {
			return nil, err
		}
		if err = ts.checkValidDomains(team); err != nil {
			return nil, err
		}
	}
	if opts.Sanitized {
		oldTeam.DisplayName = team.DisplayName
		oldTeam.Description = team.Description
		oldTeam.AllowOpenInvite = team.AllowOpenInvite
		oldTeam.CompanyName = team.CompanyName
		oldTeam.AllowedDomains = team.AllowedDomains
		oldTeam.LastTeamIconUpdate = team.LastTeamIconUpdate
		oldTeam.GroupConstrained = team.GroupConstrained
	}
	oldTeam, err = ts.store.Update(oldTeam)
	if err != nil {
		return team, err
	}
	return oldTeam, nil
}
func (ts *TeamService) PatchTeam(teamID string, patch *model.TeamPatch) (*model.Team, error) {
	team, err := ts.store.Get(teamID)
	if err != nil {
		return nil, err
	}
	team.Patch(patch)
	if patch.AllowOpenInvite != nil && !*patch.AllowOpenInvite {
		team.InviteId = model.NewId()
	}
	if err = ts.checkValidDomains(team); err != nil {
		return nil, err
	}
	team, err = ts.store.Update(team)
	if err != nil {
		return team, err
	}
	return team, nil
}
func applyPreSaveHooks(hooks []func(*model.TeamMember) (*model.TeamMember, error), tm *model.TeamMember) (*model.TeamMember, error) {
	for _, hook := range hooks {
		var err error
		tm, err = hook(tm)
		if err != nil {
			return nil, err
		}
		if tm == nil {
			return nil, fmt.Errorf("preSaveHook returned nil TeamMember without error")
		}
	}
	return tm, nil
}
func (ts *TeamService) JoinUserToTeam(rctx request.CTX, team *model.Team, user *model.User, preSaveHooks ...func(*model.TeamMember) (*model.TeamMember, error)) (*model.TeamMember, bool, error) {
	if !ts.IsTeamEmailAllowed(user, team) {
		return nil, false, AcceptedDomainError
	}
	tm := &model.TeamMember{
		TeamId:      team.Id,
		UserId:      user.Id,
		SchemeGuest: user.IsGuest(),
		SchemeUser:  !user.IsGuest(),
		CreateAt:    model.GetMillis(),
	}
	if !user.IsGuest() {
		userShouldBeAdmin, err := ts.userIsInAdminRoleGroup(user.Id, team.Id, model.GroupSyncableTypeTeam)
		if err != nil {
			return nil, false, err
		}
		tm.SchemeAdmin = userShouldBeAdmin
	}
	if team.Email == user.Email {
		tm.SchemeAdmin = true
	}
	rtm, err := ts.store.GetMember(rctx, team.Id, user.Id)
	if err != nil {
		tm, err = applyPreSaveHooks(preSaveHooks, tm)
		if err != nil {
			return nil, false, err
		}
		tmr, nErr := ts.store.SaveMember(rctx, tm, *ts.config().TeamSettings.MaxUsersPerTeam)
		if nErr != nil {
			return nil, false, nErr
		}
		return tmr, false, nil
	}
	if rtm.DeleteAt == 0 {
		return rtm, true, nil
	}
	membersCount, err := ts.store.GetActiveMemberCount(tm.TeamId, nil)
	if err != nil {
		return nil, false, MemberCountError
	}
	if membersCount >= int64(*ts.config().TeamSettings.MaxUsersPerTeam) {
		return nil, false, MaxMemberCountError
	}
	tm, err = applyPreSaveHooks(preSaveHooks, tm)
	if err != nil {
		return nil, false, err
	}
	member, nErr := ts.store.UpdateMember(rctx, tm)
	if nErr != nil {
		return nil, false, nErr
	}
	return member, false, nil
}
func (ts *TeamService) RemoveTeamMember(rctx request.CTX, teamMember *model.TeamMember) error {
	omitUsers := make(map[string]bool, 1)
	omitUsers[teamMember.UserId] = true
	messageTeam := model.NewWebSocketEvent(model.WebsocketEventLeaveTeam, teamMember.TeamId, "", "", omitUsers, "")
	messageTeam.Add("user_id", teamMember.UserId)
	messageTeam.Add("team_id", teamMember.TeamId)
	ts.wh.Publish(messageTeam)
	messageUser := model.NewWebSocketEvent(model.WebsocketEventLeaveTeam, "", "", teamMember.UserId, nil, "")
	messageUser.Add("user_id", teamMember.UserId)
	messageUser.Add("team_id", teamMember.TeamId)
	ts.wh.Publish(messageUser)
	teamMember.Roles = ""
	teamMember.DeleteAt = model.GetMillis()
	if _, nErr := ts.store.UpdateMember(rctx, teamMember); nErr != nil {
		return nErr
	}
	return nil
}
func (ts *TeamService) GetMember(rctx request.CTX, teamID string, userID string) (*model.TeamMember, error) {
	member, err := ts.store.GetMember(rctx, teamID, userID)
	if err != nil {
		return nil, err
	}
	return member, err
}