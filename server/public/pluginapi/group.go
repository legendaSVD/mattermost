package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type GroupService struct {
	api plugin.API
}
func (g *GroupService) Get(groupID string) (*model.Group, error) {
	group, appErr := g.api.GetGroup(groupID)
	return group, normalizeAppErr(appErr)
}
func (g *GroupService) GetByName(name string) (*model.Group, error) {
	group, appErr := g.api.GetGroupByName(name)
	return group, normalizeAppErr(appErr)
}
func (g *GroupService) GetMemberUsers(groupID string, page, perPage int) ([]*model.User, error) {
	users, appErr := g.api.GetGroupMemberUsers(groupID, page, perPage)
	return users, normalizeAppErr(appErr)
}
func (g *GroupService) GetBySource(groupSource model.GroupSource) ([]*model.Group, error) {
	groups, appErr := g.api.GetGroupsBySource(groupSource)
	return groups, normalizeAppErr(appErr)
}
func (g *GroupService) ListForUser(userID string) ([]*model.Group, error) {
	groups, appErr := g.api.GetGroupsForUser(userID)
	return groups, normalizeAppErr(appErr)
}
func (g *GroupService) UpsertMember(groupID string, userID string) (*model.GroupMember, error) {
	member, appErr := g.api.UpsertGroupMember(groupID, userID)
	return member, normalizeAppErr(appErr)
}
func (g *GroupService) UpsertMembers(groupID string, userIDs []string) ([]*model.GroupMember, error) {
	members, appErr := g.api.UpsertGroupMembers(groupID, userIDs)
	return members, normalizeAppErr(appErr)
}
func (g *GroupService) GetByRemoteID(remoteID string, groupSource model.GroupSource) (*model.Group, error) {
	group, appErr := g.api.GetGroupByRemoteID(remoteID, groupSource)
	return group, normalizeAppErr(appErr)
}
func (g *GroupService) Create(group *model.Group) (*model.Group, error) {
	group, appErr := g.api.CreateGroup(group)
	return group, normalizeAppErr(appErr)
}
func (g *GroupService) Update(group *model.Group) (*model.Group, error) {
	group, appErr := g.api.UpdateGroup(group)
	return group, normalizeAppErr(appErr)
}
func (g *GroupService) Delete(groupID string) (*model.Group, error) {
	group, appErr := g.api.DeleteGroup(groupID)
	return group, normalizeAppErr(appErr)
}
func (g *GroupService) Restore(groupID string) (*model.Group, error) {
	group, appErr := g.api.RestoreGroup(groupID)
	return group, normalizeAppErr(appErr)
}
func (g *GroupService) DeleteMember(groupID string, userID string) (*model.GroupMember, error) {
	member, appErr := g.api.DeleteGroupMember(groupID, userID)
	return member, normalizeAppErr(appErr)
}
func (g *GroupService) GetSyncable(groupID string, syncableID string, syncableType model.GroupSyncableType) (*model.GroupSyncable, error) {
	syncable, appErr := g.api.GetGroupSyncable(groupID, syncableID, syncableType)
	return syncable, normalizeAppErr(appErr)
}
func (g *GroupService) GetSyncables(groupID string, syncableType model.GroupSyncableType) ([]*model.GroupSyncable, error) {
	syncables, appErr := g.api.GetGroupSyncables(groupID, syncableType)
	return syncables, normalizeAppErr(appErr)
}
func (g *GroupService) UpsertSyncable(groupSyncable *model.GroupSyncable) (*model.GroupSyncable, error) {
	syncable, appErr := g.api.UpsertGroupSyncable(groupSyncable)
	return syncable, normalizeAppErr(appErr)
}
func (g *GroupService) UpdateSyncable(groupSyncable *model.GroupSyncable) (*model.GroupSyncable, error) {
	syncable, appErr := g.api.UpdateGroupSyncable(groupSyncable)
	return syncable, normalizeAppErr(appErr)
}
func (g *GroupService) DeleteSyncable(groupID string, syncableID string, syncableType model.GroupSyncableType) (*model.GroupSyncable, error) {
	syncable, appErr := g.api.DeleteGroupSyncable(groupID, syncableID, syncableType)
	return syncable, normalizeAppErr(appErr)
}
func (g *GroupService) GetGroups(page, perPage int, opts model.GroupSearchOpts, viewRestrictions *model.ViewUsersRestrictions) ([]*model.Group, error) {
	groups, appErr := g.api.GetGroups(page, perPage, opts, viewRestrictions)
	return groups, normalizeAppErr(appErr)
}
func (g *GroupService) CreateDefaultSyncableMemberships(params model.CreateDefaultMembershipParams) error {
	appErr := g.api.CreateDefaultSyncableMemberships(params)
	return normalizeAppErr(appErr)
}
func (g *GroupService) DeleteGroupConstrainedMemberships() error {
	appErr := g.api.DeleteGroupConstrainedMemberships()
	return normalizeAppErr(appErr)
}