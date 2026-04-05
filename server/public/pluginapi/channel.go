package pluginapi
import (
	"net/http"
	"time"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type ChannelService struct {
	api plugin.API
}
func (c *ChannelService) Get(channelID string) (*model.Channel, error) {
	channel, appErr := c.api.GetChannel(channelID)
	return channel, normalizeAppErr(appErr)
}
func (c *ChannelService) GetByName(teamID, channelName string, includeDeleted bool) (*model.Channel, error) {
	channel, appErr := c.api.GetChannelByName(teamID, channelName, includeDeleted)
	return channel, normalizeAppErr(appErr)
}
func (c *ChannelService) GetDirect(userID1, userID2 string) (*model.Channel, error) {
	channel, appErr := c.api.GetDirectChannel(userID1, userID2)
	return channel, normalizeAppErr(appErr)
}
func (c *ChannelService) GetGroup(userIDs []string) (*model.Channel, error) {
	channel, appErr := c.api.GetGroupChannel(userIDs)
	return channel, normalizeAppErr(appErr)
}
func (c *ChannelService) GetByNameForTeamName(teamName, channelName string, includeDeleted bool) (*model.Channel, error) {
	channel, appErr := c.api.GetChannelByNameForTeamName(teamName, channelName, includeDeleted)
	return channel, normalizeAppErr(appErr)
}
func (c *ChannelService) ListForTeamForUser(teamID, userID string, includeDeleted bool) ([]*model.Channel, error) {
	channels, appErr := c.api.GetChannelsForTeamForUser(teamID, userID, includeDeleted)
	return channels, normalizeAppErr(appErr)
}
func (c *ChannelService) ListPublicChannelsForTeam(teamID string, page, perPage int) ([]*model.Channel, error) {
	channels, appErr := c.api.GetPublicChannelsForTeam(teamID, page, perPage)
	return channels, normalizeAppErr(appErr)
}
func (c *ChannelService) Search(teamID, term string) ([]*model.Channel, error) {
	channels, appErr := c.api.SearchChannels(teamID, term)
	return channels, normalizeAppErr(appErr)
}
func (c *ChannelService) Create(channel *model.Channel) error {
	createdChannel, appErr := c.api.CreateChannel(channel)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*channel = *createdChannel
	return c.waitForChannelCreation(channel.Id)
}
func (c *ChannelService) Update(channel *model.Channel) error {
	updatedChannel, appErr := c.api.UpdateChannel(channel)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*channel = *updatedChannel
	return nil
}
func (c *ChannelService) Delete(channelID string) error {
	return normalizeAppErr(c.api.DeleteChannel(channelID))
}
func (c *ChannelService) GetChannelStats(channelID string) (*model.ChannelStats, error) {
	channelStats, appErr := c.api.GetChannelStats(channelID)
	return channelStats, normalizeAppErr(appErr)
}
func (c *ChannelService) GetMember(channelID, userID string) (*model.ChannelMember, error) {
	channelMember, appErr := c.api.GetChannelMember(channelID, userID)
	return channelMember, normalizeAppErr(appErr)
}
func (c *ChannelService) ListMembers(channelID string, page, perPage int) ([]*model.ChannelMember, error) {
	channelMembers, appErr := c.api.GetChannelMembers(channelID, page, perPage)
	return channelMembersToChannelMemberSlice(channelMembers), normalizeAppErr(appErr)
}
func (c *ChannelService) ListMembersByIDs(channelID string, userIDs []string) ([]*model.ChannelMember, error) {
	channelMembers, appErr := c.api.GetChannelMembersByIds(channelID, userIDs)
	return channelMembersToChannelMemberSlice(channelMembers), normalizeAppErr(appErr)
}
func (c *ChannelService) ListMembersForUser(teamID, userID string, page, perPage int) ([]*model.ChannelMember, error) {
	channelMembers, appErr := c.api.GetChannelMembersForUser(teamID, userID, page, perPage)
	return channelMembers, normalizeAppErr(appErr)
}
func (c *ChannelService) AddMember(channelID, userID string) (*model.ChannelMember, error) {
	channelMember, appErr := c.api.AddChannelMember(channelID, userID)
	return channelMember, normalizeAppErr(appErr)
}
func (c *ChannelService) AddUser(channelID, userID, asUserID string) (*model.ChannelMember, error) {
	channelMember, appErr := c.api.AddUserToChannel(channelID, userID, asUserID)
	return channelMember, normalizeAppErr(appErr)
}
func (c *ChannelService) DeleteMember(channelID, userID string) error {
	appErr := c.api.DeleteChannelMember(channelID, userID)
	return normalizeAppErr(appErr)
}
func (c *ChannelService) UpdateChannelMemberRoles(channelID, userID, newRoles string) (*model.ChannelMember, error) {
	channelMember, appErr := c.api.UpdateChannelMemberRoles(channelID, userID, newRoles)
	return channelMember, normalizeAppErr(appErr)
}
func (c *ChannelService) UpdateChannelMemberNotifications(channelID, userID string, notifications map[string]string) (*model.ChannelMember, error) {
	channelMember, appErr := c.api.UpdateChannelMemberNotifications(channelID, userID, notifications)
	return channelMember, normalizeAppErr(appErr)
}
func (c *ChannelService) CreateSidebarCategory(
	userID, teamID string, newCategory *model.SidebarCategoryWithChannels) error {
	category, appErr := c.api.CreateChannelSidebarCategory(userID, teamID, newCategory)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	*newCategory = *category
	return nil
}
func (c *ChannelService) GetSidebarCategories(userID, teamID string) (*model.OrderedSidebarCategories, error) {
	categories, appErr := c.api.GetChannelSidebarCategories(userID, teamID)
	return categories, normalizeAppErr(appErr)
}
func (c *ChannelService) UpdateSidebarCategories(
	userID, teamID string, categories []*model.SidebarCategoryWithChannels) error {
	updatedCategories, appErr := c.api.UpdateChannelSidebarCategories(userID, teamID, categories)
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	copy(categories, updatedCategories)
	return nil
}
func (c *ChannelService) waitForChannelCreation(channelID string) error {
	if len(c.api.GetConfig().SqlSettings.DataSourceReplicas) == 0 {
		return nil
	}
	now := time.Now()
	for time.Since(now) < 1500*time.Millisecond {
		time.Sleep(100 * time.Millisecond)
		if _, err := c.api.GetChannel(channelID); err == nil {
			return nil
		} else if err.StatusCode != http.StatusNotFound {
			return err
		}
	}
	return errors.Errorf("giving up waiting for channel creation, channelID=%s", channelID)
}
func channelMembersToChannelMemberSlice(cm model.ChannelMembers) []*model.ChannelMember {
	cmp := make([]*model.ChannelMember, len(cm))
	for i := range cm {
		cmp[i] = &(cm)[i]
	}
	return cmp
}