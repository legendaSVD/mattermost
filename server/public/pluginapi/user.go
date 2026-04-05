package pluginapi
import (
	"bytes"
	"io"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type UserService struct {
	api plugin.API
}
func (u *UserService) Get(userID string) (*model.User, error) {
	user, appErr := u.api.GetUser(userID)
	return user, normalizeAppErr(appErr)
}
func (u *UserService) GetByEmail(email string) (*model.User, error) {
	user, appErr := u.api.GetUserByEmail(email)
	return user, normalizeAppErr(appErr)
}
func (u *UserService) GetByUsername(username string) (*model.User, error) {
	user, appErr := u.api.GetUserByUsername(username)
	return user, normalizeAppErr(appErr)
}
func (u *UserService) List(options *model.UserGetOptions) ([]*model.User, error) {
	users, appErr := u.api.GetUsers(options)
	return users, normalizeAppErr(appErr)
}
func (u *UserService) ListByUserIDs(userIDs []string) ([]*model.User, error) {
	users, appErr := u.api.GetUsersByIds(userIDs)
	return users, normalizeAppErr(appErr)
}
func (u *UserService) ListByUsernames(usernames []string) ([]*model.User, error) {
	users, appErr := u.api.GetUsersByUsernames(usernames)
	return users, normalizeAppErr(appErr)
}
func (u *UserService) ListInChannel(channelID, sortBy string, page, perPage int) ([]*model.User, error) {
	users, appErr := u.api.GetUsersInChannel(channelID, sortBy, page, perPage)
	return users, normalizeAppErr(appErr)
}
func (u *UserService) ListInTeam(teamID string, page, perPage int) ([]*model.User, error) {
	users, appErr := u.api.GetUsersInTeam(teamID, page, perPage)
	return users, normalizeAppErr(appErr)
}
func (u *UserService) Search(search *model.UserSearch) ([]*model.User, error) {
	users, appErr := u.api.SearchUsers(search)
	return users, normalizeAppErr(appErr)
}
func (u *UserService) Create(user *model.User) error {
	createdUser, appErr := u.api.CreateUser(user)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*user = *createdUser
	return nil
}
func (u *UserService) Update(user *model.User) error {
	updatedUser, appErr := u.api.UpdateUser(user)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*user = *updatedUser
	return nil
}
func (u *UserService) Delete(userID string) error {
	appErr := u.api.DeleteUser(userID)
	return normalizeAppErr(appErr)
}
func (u *UserService) GetStatus(userID string) (*model.Status, error) {
	status, appErr := u.api.GetUserStatus(userID)
	return status, normalizeAppErr(appErr)
}
func (u *UserService) ListStatusesByIDs(userIDs []string) ([]*model.Status, error) {
	statuses, appErr := u.api.GetUserStatusesByIds(userIDs)
	return statuses, normalizeAppErr(appErr)
}
func (u *UserService) UpdateStatus(userID, status string) (*model.Status, error) {
	rStatus, appErr := u.api.UpdateUserStatus(userID, status)
	return rStatus, normalizeAppErr(appErr)
}
func (u *UserService) UpdateActive(userID string, active bool) error {
	appErr := u.api.UpdateUserActive(userID, active)
	return normalizeAppErr(appErr)
}
func (u *UserService) GetProfileImage(userID string) (io.Reader, error) {
	contentBytes, appErr := u.api.GetProfileImage(userID)
	if appErr != nil {
		return nil, normalizeAppErr(appErr)
	}
	return bytes.NewReader(contentBytes), nil
}
func (u *UserService) SetProfileImage(userID string, content io.Reader) error {
	contentBytes, err := io.ReadAll(content)
	if err != nil {
		return err
	}
	return normalizeAppErr(u.api.SetProfileImage(userID, contentBytes))
}
func (u *UserService) HasPermissionTo(userID string, permission *model.Permission) bool {
	return u.api.HasPermissionTo(userID, permission)
}
func (u *UserService) HasPermissionToTeam(userID, teamID string, permission *model.Permission) bool {
	return u.api.HasPermissionToTeam(userID, teamID, permission)
}
func (u *UserService) HasPermissionToChannel(userID, channelID string, permission *model.Permission) bool {
	return u.api.HasPermissionToChannel(userID, channelID, permission)
}
func (u *UserService) RolesGrantPermission(roleNames []string, permissionID string) bool {
	return u.api.RolesGrantPermission(roleNames, permissionID)
}
func (u *UserService) GetLDAPAttributes(userID string, attributes []string) (map[string]string, error) {
	ldapUserAttributes, appErr := u.api.GetLDAPUserAttributes(userID, attributes)
	return ldapUserAttributes, normalizeAppErr(appErr)
}
func (u *UserService) CreateAccessToken(userID, description string) (*model.UserAccessToken, error) {
	token := &model.UserAccessToken{
		UserId:      userID,
		Description: description,
	}
	createdToken, appErr := u.api.CreateUserAccessToken(token)
	return createdToken, normalizeAppErr(appErr)
}
func (u *UserService) RevokeAccessToken(tokenID string) error {
	return normalizeAppErr(u.api.RevokeUserAccessToken(tokenID))
}
func (u *UserService) UpdateRoles(userID, newRoles string) (*model.User, error) {
	user, appErr := u.api.UpdateUserRoles(userID, newRoles)
	return user, normalizeAppErr(appErr)
}