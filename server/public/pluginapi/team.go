package pluginapi
import (
	"bytes"
	"io"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type TeamService struct {
	api plugin.API
}
func (t *TeamService) Get(teamID string) (*model.Team, error) {
	team, appErr := t.api.GetTeam(teamID)
	return team, normalizeAppErr(appErr)
}
func (t *TeamService) GetByName(name string) (*model.Team, error) {
	team, appErr := t.api.GetTeamByName(name)
	return team, normalizeAppErr(appErr)
}
type TeamListOption func(*ListTeamsOptions)
type ListTeamsOptions struct {
	UserID string
}
func FilterTeamsByUser(userID string) TeamListOption {
	return func(o *ListTeamsOptions) {
		o.UserID = userID
	}
}
func (t *TeamService) List(options ...TeamListOption) ([]*model.Team, error) {
	opts := ListTeamsOptions{}
	for _, o := range options {
		o(&opts)
	}
	var teams []*model.Team
	var appErr *model.AppError
	if opts.UserID != "" {
		teams, appErr = t.api.GetTeamsForUser(opts.UserID)
	} else {
		teams, appErr = t.api.GetTeams()
	}
	return teams, normalizeAppErr(appErr)
}
func (t *TeamService) Search(term string) ([]*model.Team, error) {
	teams, appErr := t.api.SearchTeams(term)
	return teams, normalizeAppErr(appErr)
}
func (t *TeamService) Create(team *model.Team) error {
	createdTeam, appErr := t.api.CreateTeam(team)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*team = *createdTeam
	return nil
}
func (t *TeamService) Update(team *model.Team) error {
	updatedTeam, appErr := t.api.UpdateTeam(team)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*team = *updatedTeam
	return nil
}
func (t *TeamService) Delete(teamID string) error {
	return normalizeAppErr(t.api.DeleteTeam(teamID))
}
func (t *TeamService) GetIcon(teamID string) (io.Reader, error) {
	contentBytes, appErr := t.api.GetTeamIcon(teamID)
	if appErr != nil {
		return nil, normalizeAppErr(appErr)
	}
	return bytes.NewReader(contentBytes), nil
}
func (t *TeamService) SetIcon(teamID string, content io.Reader) error {
	contentBytes, err := io.ReadAll(content)
	if err != nil {
		return err
	}
	return normalizeAppErr(t.api.SetTeamIcon(teamID, contentBytes))
}
func (t *TeamService) DeleteIcon(teamID string) error {
	return normalizeAppErr(t.api.RemoveTeamIcon(teamID))
}
func (t *TeamService) ListUsers(teamID string, page, count int) ([]*model.User, error) {
	users, appErr := t.api.GetUsersInTeam(teamID, page, count)
	return users, normalizeAppErr(appErr)
}
func (t *TeamService) ListUnreadForUser(userID string) ([]*model.TeamUnread, error) {
	teamUnreads, appErr := t.api.GetTeamsUnreadForUser(userID)
	return teamUnreads, normalizeAppErr(appErr)
}
func (t *TeamService) GetMember(teamID, userID string) (*model.TeamMember, error) {
	teamMember, appErr := t.api.GetTeamMember(teamID, userID)
	return teamMember, normalizeAppErr(appErr)
}
func (t *TeamService) ListMembers(teamID string, page, perPage int) ([]*model.TeamMember, error) {
	teamMembers, appErr := t.api.GetTeamMembers(teamID, page, perPage)
	return teamMembers, normalizeAppErr(appErr)
}
func (t *TeamService) ListMembersForUser(userID string, page, perPage int) ([]*model.TeamMember, error) {
	teamMembers, appErr := t.api.GetTeamMembersForUser(userID, page, perPage)
	return teamMembers, normalizeAppErr(appErr)
}
func (t *TeamService) CreateMember(teamID, userID string) (*model.TeamMember, error) {
	teamMember, appErr := t.api.CreateTeamMember(teamID, userID)
	return teamMember, normalizeAppErr(appErr)
}
func (t *TeamService) CreateMembers(teamID string, userIDs []string, requestorID string) ([]*model.TeamMember, error) {
	teamMembers, appErr := t.api.CreateTeamMembers(teamID, userIDs, requestorID)
	return teamMembers, normalizeAppErr(appErr)
}
func (t *TeamService) DeleteMember(teamID, userID, requestorID string) error {
	return normalizeAppErr(t.api.DeleteTeamMember(teamID, userID, requestorID))
}
func (t *TeamService) UpdateMemberRoles(teamID, userID, newRoles string) (*model.TeamMember, error) {
	teamMember, appErr := t.api.UpdateTeamMemberRoles(teamID, userID, newRoles)
	return teamMember, normalizeAppErr(appErr)
}
func (t *TeamService) GetStats(teamID string) (*model.TeamStats, error) {
	teamStats, appErr := t.api.GetTeamStats(teamID)
	return teamStats, normalizeAppErr(appErr)
}