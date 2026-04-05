package storetest
import (
	"database/sql"
	"errors"
	"fmt"
	"math/rand"
	"sync"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
func TestChannelStoreCategories(t *testing.T, rctx request.CTX, ss store.Store, s SqlStore) {
	t.Run("CreateInitialSidebarCategories", func(t *testing.T) { testCreateInitialSidebarCategories(t, rctx, ss) })
	t.Run("CreateSidebarCategory", func(t *testing.T) { testCreateSidebarCategory(t, rctx, ss) })
	t.Run("GetSidebarCategory", func(t *testing.T) { testGetSidebarCategory(t, rctx, ss, s) })
	t.Run("GetSidebarCategories", func(t *testing.T) { testGetSidebarCategories(t, rctx, ss) })
	t.Run("UpdateSidebarCategories", func(t *testing.T) { testUpdateSidebarCategories(t, rctx, ss) })
	t.Run("ClearSidebarOnTeamLeave", func(t *testing.T) { testClearSidebarOnTeamLeave(t, rctx, ss, s) })
	t.Run("DeleteSidebarCategory", func(t *testing.T) { testDeleteSidebarCategory(t, rctx, ss, s) })
	t.Run("UpdateSidebarChannelsByPreferences", func(t *testing.T) { testUpdateSidebarChannelsByPreferences(t, rctx, ss) })
	t.Run("SidebarCategoryDeadlock", func(t *testing.T) { testSidebarCategoryDeadlock(t, rctx, ss) })
	t.Run("SidebarCategoryConcurrentAccess", func(t *testing.T) { testSidebarCategoryConcurrentAccess(t, rctx, ss, s) })
}
func setupTeam(t *testing.T, rctx request.CTX, ss store.Store, userIds ...string) *model.Team {
	team, err := ss.Team().Save(&model.Team{
		DisplayName: "Name",
		Name:        NewTestID(),
		Email:       MakeEmail(),
		Type:        model.TeamOpen,
	})
	assert.NoError(t, err)
	members := make([]*model.TeamMember, 0, len(userIds))
	for _, userID := range userIds {
		members = append(members, &model.TeamMember{
			TeamId: team.Id,
			UserId: userID,
		})
	}
	if len(members) > 0 {
		_, err = ss.Team().SaveMultipleMembers(members, len(userIds)+1)
		assert.NoError(t, err)
	}
	return team
}
func testCreateInitialSidebarCategories(t *testing.T, rctx request.CTX, ss store.Store) {
	t.Run("should create initial favorites/channels/DMs categories", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		assert.NoError(t, nErr)
		require.Len(t, res.Categories, 3)
		assert.Equal(t, model.SidebarCategoryFavorites, res.Categories[0].Type)
		assert.Equal(t, model.SidebarCategoryChannels, res.Categories[1].Type)
		assert.Equal(t, model.SidebarCategoryDirectMessages, res.Categories[2].Type)
		res2, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		assert.NoError(t, err)
		assert.Equal(t, res, res2)
	})
	t.Run("should create initial favorites/channels/DMs categories for multiple users", func(t *testing.T) {
		userID := model.NewId()
		userID2 := model.NewId()
		team := setupTeam(t, rctx, ss, userID, userID2)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		res, nErr = ss.Channel().CreateInitialSidebarCategories(rctx, userID2, team.Id)
		assert.NoError(t, nErr)
		assert.Len(t, res.Categories, 3)
		assert.Equal(t, model.SidebarCategoryFavorites, res.Categories[0].Type)
		assert.Equal(t, model.SidebarCategoryChannels, res.Categories[1].Type)
		assert.Equal(t, model.SidebarCategoryDirectMessages, res.Categories[2].Type)
		res2, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID2, team.Id)
		assert.NoError(t, err)
		assert.Equal(t, res, res2)
	})
	t.Run("should create initial favorites/channels/DMs categories on different teams", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		team2 := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		res, nErr = ss.Channel().CreateInitialSidebarCategories(rctx, userID, team2.Id)
		assert.NoError(t, nErr)
		assert.Len(t, res.Categories, 3)
		assert.Equal(t, model.SidebarCategoryFavorites, res.Categories[0].Type)
		assert.Equal(t, model.SidebarCategoryChannels, res.Categories[1].Type)
		assert.Equal(t, model.SidebarCategoryDirectMessages, res.Categories[2].Type)
		res2, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team2.Id)
		assert.NoError(t, err)
		assert.Equal(t, res, res2)
	})
	t.Run("shouldn't create additional categories when ones already exist", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		initialCategories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Equal(t, res, initialCategories)
		res, nErr = ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		assert.NoError(t, nErr)
		assert.NotEmpty(t, res)
		res, err = ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		assert.NoError(t, err)
		assert.Equal(t, initialCategories.Categories, res.Categories)
	})
	t.Run("shouldn't create additional categories when ones already exist even when ran simultaneously", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		var wg sync.WaitGroup
		for range 10 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, _ = ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
			}()
		}
		wg.Wait()
		res, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		assert.NoError(t, err)
		assert.Len(t, res.Categories, 3)
	})
	t.Run("should populate the Favorites category with regular channels", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			TeamId: team.Id,
			Type:   model.ChannelTypeOpen,
			Name:   "channel1",
		}, 1000)
		require.NoError(t, nErr)
		_, err := ss.Channel().SaveMember(rctx, &model.ChannelMember{
			ChannelId:   channel1.Id,
			UserId:      userID,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, err)
		channel2, nErr := ss.Channel().Save(rctx, &model.Channel{
			TeamId: team.Id,
			Type:   model.ChannelTypeOpen,
			Name:   "channel2",
		}, 1000)
		require.NoError(t, nErr)
		_, err = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			ChannelId:   channel2.Id,
			UserId:      userID,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, err)
		nErr = ss.Preference().Save(model.Preferences{
			{
				UserId:   userID,
				Category: model.PreferenceCategoryFavoriteChannel,
				Name:     channel1.Id,
				Value:    "true",
			},
		})
		require.NoError(t, nErr)
		categories, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.Len(t, categories.Categories, 3)
		assert.Equal(t, model.SidebarCategoryFavorites, categories.Categories[0].Type)
		assert.Equal(t, []string{channel1.Id}, categories.Categories[0].Channels)
		assert.Equal(t, model.SidebarCategoryChannels, categories.Categories[1].Type)
		assert.Equal(t, []string{channel2.Id}, categories.Categories[1].Channels)
		categories2, nErr := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, nErr)
		require.Equal(t, categories, categories2)
	})
	t.Run("should populate the Favorites category in alphabetical order", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			TeamId:      team.Id,
			Type:        model.ChannelTypeOpen,
			Name:        "channel1",
			DisplayName: "zebra",
		}, 1000)
		require.NoError(t, nErr)
		_, err := ss.Channel().SaveMember(rctx, &model.ChannelMember{
			ChannelId:   channel1.Id,
			UserId:      userID,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, err)
		channel2, nErr := ss.Channel().Save(rctx, &model.Channel{
			TeamId:      team.Id,
			Type:        model.ChannelTypeOpen,
			Name:        "channel2",
			DisplayName: "aardvark",
		}, 1000)
		require.NoError(t, nErr)
		_, err = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			ChannelId:   channel2.Id,
			UserId:      userID,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, err)
		nErr = ss.Preference().Save(model.Preferences{
			{
				UserId:   userID,
				Category: model.PreferenceCategoryFavoriteChannel,
				Name:     channel1.Id,
				Value:    "true",
			},
			{
				UserId:   userID,
				Category: model.PreferenceCategoryFavoriteChannel,
				Name:     channel2.Id,
				Value:    "true",
			},
		})
		require.NoError(t, nErr)
		categories, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.Len(t, categories.Categories, 3)
		assert.Equal(t, model.SidebarCategoryFavorites, categories.Categories[0].Type)
		assert.Equal(t, []string{channel2.Id, channel1.Id}, categories.Categories[0].Channels)
		categories2, nErr := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, nErr)
		require.Equal(t, categories, categories2)
	})
	t.Run("should populate the Favorites category with DMs and GMs", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		otherUserID1 := model.NewId()
		otherUserID2 := model.NewId()
		dmChannel1, err := ss.Channel().SaveDirectChannel(rctx,
			&model.Channel{
				Name: model.GetDMNameFromIds(userID, otherUserID1),
				Type: model.ChannelTypeDirect,
			},
			&model.ChannelMember{
				UserId:      userID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
			&model.ChannelMember{
				UserId:      otherUserID1,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
		)
		require.NoError(t, err)
		dmChannel2, err := ss.Channel().SaveDirectChannel(rctx,
			&model.Channel{
				Name: model.GetDMNameFromIds(userID, otherUserID2),
				Type: model.ChannelTypeDirect,
			},
			&model.ChannelMember{
				UserId:      userID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
			&model.ChannelMember{
				UserId:      otherUserID2,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
		)
		require.NoError(t, err)
		err = ss.Preference().Save(model.Preferences{
			{
				UserId:   userID,
				Category: model.PreferenceCategoryFavoriteChannel,
				Name:     dmChannel1.Id,
				Value:    "true",
			},
		})
		require.NoError(t, err)
		categories, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.Len(t, categories.Categories, 3)
		assert.Equal(t, model.SidebarCategoryFavorites, categories.Categories[0].Type)
		assert.Equal(t, []string{dmChannel1.Id}, categories.Categories[0].Channels)
		assert.Equal(t, model.SidebarCategoryDirectMessages, categories.Categories[2].Type)
		assert.Equal(t, []string{dmChannel2.Id}, categories.Categories[2].Channels)
		categories2, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Equal(t, categories, categories2)
	})
	t.Run("should not populate the Favorites category with channels from other teams", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		team2 := setupTeam(t, rctx, ss, userID)
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			TeamId: team2.Id,
			Type:   model.ChannelTypeOpen,
			Name:   "channel1",
		}, 1000)
		require.NoError(t, nErr)
		_, err := ss.Channel().SaveMember(rctx, &model.ChannelMember{
			ChannelId:   channel1.Id,
			UserId:      userID,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, err)
		nErr = ss.Preference().Save(model.Preferences{
			{
				UserId:   userID,
				Category: model.PreferenceCategoryFavoriteChannel,
				Name:     channel1.Id,
				Value:    "true",
			},
		})
		require.NoError(t, nErr)
		categories, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.Len(t, categories.Categories, 3)
		assert.Equal(t, model.SidebarCategoryFavorites, categories.Categories[0].Type)
		assert.Equal(t, []string{}, categories.Categories[0].Channels)
		assert.Equal(t, model.SidebarCategoryChannels, categories.Categories[1].Type)
		assert.Equal(t, []string{}, categories.Categories[1].Channels)
		categories2, nErr := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, nErr)
		require.Equal(t, categories, categories2)
	})
}
func testCreateSidebarCategory(t *testing.T, rctx request.CTX, ss store.Store) {
	t.Run("Creating category without initial categories should fail", func(t *testing.T) {
		userID := model.NewId()
		teamID := model.NewId()
		created, err := ss.Channel().CreateSidebarCategory(userID, teamID, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				DisplayName: model.NewId(),
			},
		})
		require.Error(t, err)
		var errNotFound *store.ErrNotFound
		require.ErrorAs(t, err, &errNotFound)
		require.Nil(t, created)
	})
	t.Run("should place the new category second if Favorites comes first", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		created, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				DisplayName: model.NewId(),
			},
		})
		require.NoError(t, err)
		res, err = ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Len(t, res.Categories, 4)
		assert.Equal(t, model.SidebarCategoryFavorites, res.Categories[0].Type)
		assert.Equal(t, model.SidebarCategoryCustom, res.Categories[1].Type)
		assert.Equal(t, created.Id, res.Categories[1].Id)
	})
	t.Run("should place the new category first if Favorites is not first", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Equal(t, model.SidebarCategoryFavorites, categories.Categories[0].Type)
		err = ss.Channel().UpdateSidebarCategoryOrder(userID, team.Id, []string{
			categories.Categories[1].Id,
			categories.Categories[2].Id,
			categories.Categories[0].Id,
		})
		require.NoError(t, err)
		created, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				DisplayName: model.NewId(),
			},
		})
		require.NoError(t, err)
		res, err = ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Len(t, res.Categories, 4)
		assert.Equal(t, model.SidebarCategoryCustom, res.Categories[0].Type)
		assert.Equal(t, created.Id, res.Categories[0].Id)
	})
	t.Run("should create the category with its channels", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		channel1, err := ss.Channel().Save(rctx, &model.Channel{
			Type:   model.ChannelTypeOpen,
			TeamId: team.Id,
			Name:   model.NewId(),
		}, 100)
		require.NoError(t, err)
		channel2, err := ss.Channel().Save(rctx, &model.Channel{
			Type:   model.ChannelTypeOpen,
			TeamId: team.Id,
			Name:   model.NewId(),
		}, 100)
		require.NoError(t, err)
		created, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				DisplayName: model.NewId(),
			},
			Channels: []string{channel2.Id, channel1.Id},
		})
		require.NoError(t, err)
		assert.Equal(t, []string{channel2.Id, channel1.Id}, created.Channels)
		res2, err := ss.Channel().GetSidebarCategory(created.Id)
		require.NoError(t, err)
		assert.Equal(t, []string{channel2.Id, channel1.Id}, res2.Channels)
	})
	t.Run("should remove any channels from their previous categories", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		favoritesCategory := categories.Categories[0]
		require.Equal(t, model.SidebarCategoryFavorites, favoritesCategory.Type)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			Type:   model.ChannelTypeOpen,
			TeamId: team.Id,
			Name:   model.NewId(),
		}, 100)
		require.NoError(t, nErr)
		channel2, nErr := ss.Channel().Save(rctx, &model.Channel{
			Type:   model.ChannelTypeOpen,
			TeamId: team.Id,
			Name:   model.NewId(),
		}, 100)
		require.NoError(t, nErr)
		favoritesCategory.Channels = []string{channel1.Id}
		channelsCategory.Channels = []string{channel2.Id}
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			favoritesCategory,
			channelsCategory,
		})
		require.NoError(t, err)
		created, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				DisplayName: model.NewId(),
			},
			Channels: []string{channel2.Id, channel1.Id},
		})
		require.NoError(t, err)
		assert.Equal(t, []string{channel2.Id, channel1.Id}, created.Channels)
		res2, err := ss.Channel().GetSidebarCategory(favoritesCategory.Id)
		require.NoError(t, err)
		assert.Equal(t, []string{}, res2.Channels)
		res2, err = ss.Channel().GetSidebarCategory(channelsCategory.Id)
		require.NoError(t, err)
		assert.Equal(t, []string{}, res2.Channels)
	})
	t.Run("should store the correct sorting value", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		created, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				DisplayName: model.NewId(),
				Sorting:     model.SidebarCategorySortManual,
			},
		})
		require.NoError(t, err)
		res, err = ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Len(t, res.Categories, 4)
		assert.Equal(t, model.SidebarCategoryCustom, res.Categories[1].Type)
		assert.Equal(t, created.Id, res.Categories[1].Id)
		assert.Equal(t, model.SidebarCategorySortManual, res.Categories[1].Sorting)
		assert.Equal(t, model.SidebarCategorySortManual, created.Sorting)
	})
}
func testGetSidebarCategory(t *testing.T, rctx request.CTX, ss store.Store, s SqlStore) {
	t.Run("should return a custom category with its Channels field set", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		channelID1 := model.NewId()
		channelID2 := model.NewId()
		channelID3 := model.NewId()
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		created, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      userID,
				TeamId:      team.Id,
				DisplayName: model.NewId(),
			},
			Channels: []string{channelID1, channelID2, channelID3},
		})
		require.NoError(t, err)
		require.NotNil(t, created)
		res2, err := ss.Channel().GetSidebarCategory(created.Id)
		assert.NoError(t, err)
		assert.Equal(t, created.Id, res2.Id)
		assert.Equal(t, model.SidebarCategoryCustom, res2.Type)
		assert.Equal(t, created.DisplayName, res2.DisplayName)
		assert.Equal(t, []string{channelID1, channelID2, channelID3}, res2.Channels)
	})
	t.Run("should return any orphaned channels with the Channels category", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:        "channel1",
			DisplayName: "DEF",
			TeamId:      team.Id,
			Type:        model.ChannelTypePrivate,
		}, 10)
		require.NoError(t, nErr)
		_, nErr = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel1.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, nErr)
		channel2, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:        "channel2",
			DisplayName: "ABC",
			TeamId:      team.Id,
			Type:        model.ChannelTypeOpen,
		}, 10)
		require.NoError(t, nErr)
		_, nErr = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel2.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, nErr)
		var count int64
		countErr := s.GetMaster().Get(&count, `
			SELECT
				COUNT(*)
			FROM
				SidebarChannels
			WHERE
				CategoryId = ?`, channelsCategory.Id)
		require.NoError(t, countErr)
		assert.Equal(t, int64(0), count)
		res2, err := ss.Channel().GetSidebarCategory(channelsCategory.Id)
		assert.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, res2.Id)
		assert.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		assert.Equal(t, []string{channel2.Id, channel1.Id}, res2.Channels)
	})
	t.Run("shouldn't return orphaned channels on another team with the Channels category", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Equal(t, model.SidebarCategoryChannels, categories.Categories[1].Type)
		channelsCategory := categories.Categories[1]
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   "abc",
			TeamId: model.NewId(),
			Type:   model.ChannelTypeOpen,
		}, 10)
		require.NoError(t, nErr)
		defer ss.Channel().PermanentDelete(rctx, channel1.Id)
		_, nErr = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel1.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, nErr)
		res2, err := ss.Channel().GetSidebarCategory(channelsCategory.Id)
		assert.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, res2.Id)
		assert.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		assert.Len(t, res2.Channels, 0)
	})
	t.Run("shouldn't return non-orphaned channels with the Channels category", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		favoritesCategory := categories.Categories[0]
		require.Equal(t, model.SidebarCategoryFavorites, favoritesCategory.Type)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:        "channel1",
			DisplayName: "DEF",
			TeamId:      team.Id,
			Type:        model.ChannelTypePrivate,
		}, 10)
		require.NoError(t, nErr)
		_, nErr = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel1.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, nErr)
		channel2, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:        "channel2",
			DisplayName: "ABC",
			TeamId:      team.Id,
			Type:        model.ChannelTypeOpen,
		}, 10)
		require.NoError(t, nErr)
		_, nErr = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel2.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, nErr)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: favoritesCategory.SidebarCategory,
				Channels:        []string{channel2.Id},
			},
		})
		require.NoError(t, err)
		res2, err := ss.Channel().GetSidebarCategory(channelsCategory.Id)
		assert.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, res2.Id)
		assert.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		assert.Equal(t, []string{channel1.Id}, res2.Channels)
	})
	t.Run("should return any orphaned DM channels with the Direct Messages category", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Equal(t, model.SidebarCategoryDirectMessages, categories.Categories[2].Type)
		dmsCategory := categories.Categories[2]
		otherUserID := model.NewId()
		dmChannel, nErr := ss.Channel().SaveDirectChannel(rctx,
			&model.Channel{
				Name: model.GetDMNameFromIds(userID, otherUserID),
				Type: model.ChannelTypeDirect,
			},
			&model.ChannelMember{
				UserId:      userID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
			&model.ChannelMember{
				UserId:      otherUserID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
		)
		require.NoError(t, nErr)
		res2, err := ss.Channel().GetSidebarCategory(dmsCategory.Id)
		assert.NoError(t, err)
		assert.Equal(t, dmsCategory.Id, res2.Id)
		assert.Equal(t, model.SidebarCategoryDirectMessages, res2.Type)
		assert.Equal(t, []string{dmChannel.Id}, res2.Channels)
	})
	t.Run("should return any orphaned GM channels with the Direct Messages category", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Equal(t, model.SidebarCategoryDirectMessages, categories.Categories[2].Type)
		dmsCategory := categories.Categories[2]
		gmChannel, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   "abc",
			TeamId: "",
			Type:   model.ChannelTypeGroup,
		}, 10)
		require.NoError(t, nErr)
		defer ss.Channel().PermanentDelete(rctx, gmChannel.Id)
		_, nErr = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   gmChannel.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, nErr)
		res2, err := ss.Channel().GetSidebarCategory(dmsCategory.Id)
		assert.NoError(t, err)
		assert.Equal(t, dmsCategory.Id, res2.Id)
		assert.Equal(t, model.SidebarCategoryDirectMessages, res2.Type)
		assert.Equal(t, []string{gmChannel.Id}, res2.Channels)
	})
	t.Run("should return orphaned DM channels in the DMs category which are in a custom category on another team", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Equal(t, model.SidebarCategoryDirectMessages, categories.Categories[2].Type)
		dmsCategory := categories.Categories[2]
		otherUserID := model.NewId()
		dmChannel, nErr := ss.Channel().SaveDirectChannel(rctx,
			&model.Channel{
				Name: model.GetDMNameFromIds(userID, otherUserID),
				Type: model.ChannelTypeDirect,
			},
			&model.ChannelMember{
				UserId:      userID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
			&model.ChannelMember{
				UserId:      otherUserID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
		)
		require.NoError(t, nErr)
		otherTeam := setupTeam(t, rctx, ss, userID)
		res, nErr = ss.Channel().CreateInitialSidebarCategories(rctx, userID, otherTeam.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		_, err = ss.Channel().CreateSidebarCategory(userID, otherTeam.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId: userID,
				TeamId: team.Id,
			},
			Channels: []string{dmChannel.Id},
		})
		require.NoError(t, err)
		res2, err := ss.Channel().GetSidebarCategory(dmsCategory.Id)
		assert.NoError(t, err)
		assert.Equal(t, dmsCategory.Id, res2.Id)
		assert.Equal(t, model.SidebarCategoryDirectMessages, res2.Type)
		assert.Equal(t, []string{dmChannel.Id}, res2.Channels)
	})
}
func testGetSidebarCategories(t *testing.T, rctx request.CTX, ss store.Store) {
	t.Run("should return channels in the same order between different ways of getting categories", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		channelIds := []string{
			model.NewId(),
			model.NewId(),
			model.NewId(),
		}
		newCategory, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{
			Channels: channelIds,
		})
		require.NoError(t, err)
		require.NotNil(t, newCategory)
		gotCategory, err := ss.Channel().GetSidebarCategory(newCategory.Id)
		require.NoError(t, err)
		res, err = ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		require.Len(t, res.Categories, 4)
		require.Equal(t, model.SidebarCategoryCustom, res.Categories[1].Type)
		assert.Equal(t, newCategory.Channels, res.Categories[1].Channels)
		assert.Equal(t, gotCategory.Channels, res.Categories[1].Channels)
		assert.Equal(t, channelIds, res.Categories[1].Channels)
	})
}
func testUpdateSidebarCategories(t *testing.T, rctx request.CTX, ss store.Store) {
	t.Run("ensure the query to update SidebarCategories hasn't been polluted by UpdateSidebarCategoryOrder", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, err := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, err)
		require.NotEmpty(t, res)
		initialCategories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		favoritesCategory := initialCategories.Categories[0]
		channelsCategory := initialCategories.Categories[1]
		dmsCategory := initialCategories.Categories[2]
		updated, _, err := ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			channelsCategory,
		})
		require.NoError(t, err)
		assert.Equal(t, channelsCategory, updated[0])
		assert.Equal(t, "Channels", updated[0].DisplayName)
		err = ss.Channel().UpdateSidebarCategoryOrder(userID, team.Id, []string{dmsCategory.Id, favoritesCategory.Id, channelsCategory.Id})
		require.NoError(t, err)
		got, err := ss.Channel().GetSidebarCategory(favoritesCategory.Id)
		require.NoError(t, err)
		assert.Equal(t, "Favorites", got.DisplayName)
	})
	t.Run("categories should be returned in their original order", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, err := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, err)
		require.NotEmpty(t, res)
		initialCategories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		favoritesCategory := initialCategories.Categories[0]
		channelsCategory := initialCategories.Categories[1]
		dmsCategory := initialCategories.Categories[2]
		updatedCategories, _, err := ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			favoritesCategory,
			channelsCategory,
			dmsCategory,
		})
		assert.NoError(t, err)
		assert.Equal(t, favoritesCategory.Id, updatedCategories[0].Id)
		assert.Equal(t, channelsCategory.Id, updatedCategories[1].Id)
		assert.Equal(t, dmsCategory.Id, updatedCategories[2].Id)
	})
	t.Run("should silently fail to update read only fields", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		initialCategories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		favoritesCategory := initialCategories.Categories[0]
		channelsCategory := initialCategories.Categories[1]
		dmsCategory := initialCategories.Categories[2]
		customCategory, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{})
		require.NoError(t, err)
		categoriesToUpdate := []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: model.SidebarCategory{
					Id:          favoritesCategory.Id,
					DisplayName: "something else",
				},
				Channels: favoritesCategory.Channels,
			},
			{
				SidebarCategory: model.SidebarCategory{
					Id:   channelsCategory.Id,
					Type: model.SidebarCategoryDirectMessages,
				},
				Channels: channelsCategory.Channels,
			},
			{
				SidebarCategory: dmsCategory.SidebarCategory,
				Channels:        []string{"fakechannel"},
			},
			{
				SidebarCategory: model.SidebarCategory{
					Id:          customCategory.Id,
					UserId:      model.NewId(),
					TeamId:      model.NewId(),
					Sorting:     customCategory.Sorting,
					DisplayName: customCategory.DisplayName,
				},
				Channels: customCategory.Channels,
			},
		}
		updatedCategories, _, err := ss.Channel().UpdateSidebarCategories(userID, team.Id, categoriesToUpdate)
		assert.NoError(t, err)
		assert.NotEqual(t, "Favorites", categoriesToUpdate[0].DisplayName)
		assert.Equal(t, "Favorites", updatedCategories[0].DisplayName)
		assert.NotEqual(t, model.SidebarCategoryChannels, categoriesToUpdate[1].Type)
		assert.Equal(t, model.SidebarCategoryChannels, updatedCategories[1].Type)
		assert.NotEqual(t, []string{}, categoriesToUpdate[2].Channels)
		assert.Equal(t, []string{}, updatedCategories[2].Channels)
		assert.NotEqual(t, userID, categoriesToUpdate[3].UserId)
		assert.Equal(t, userID, updatedCategories[3].UserId)
	})
	t.Run("should add and remove favorites preferences based on the Favorites category", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		favoritesCategory := categories.Categories[0]
		require.Equal(t, model.SidebarCategoryFavorites, favoritesCategory.Type)
		channel, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   "channel",
			Type:   model.ChannelTypeOpen,
			TeamId: team.Id,
		}, 10)
		require.NoError(t, nErr)
		_, nErr = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, nErr)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: favoritesCategory.SidebarCategory,
				Channels:        []string{channel.Id},
			},
		})
		assert.NoError(t, err)
		res2, nErr := ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.NoError(t, nErr)
		assert.NotNil(t, res2)
		assert.Equal(t, "true", res2.Value)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: channelsCategory.SidebarCategory,
				Channels:        []string{channel.Id},
			},
		})
		assert.NoError(t, err)
		res2, nErr = ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.Error(t, nErr)
		assert.True(t, errors.Is(nErr, sql.ErrNoRows))
		assert.Nil(t, res2)
	})
	t.Run("should add and remove favorites preferences for DMs", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		favoritesCategory := categories.Categories[0]
		require.Equal(t, model.SidebarCategoryFavorites, favoritesCategory.Type)
		otherUserID := model.NewId()
		dmChannel, nErr := ss.Channel().SaveDirectChannel(rctx,
			&model.Channel{
				Name: model.GetDMNameFromIds(userID, otherUserID),
				Type: model.ChannelTypeDirect,
			},
			&model.ChannelMember{
				UserId:      userID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
			&model.ChannelMember{
				UserId:      otherUserID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
		)
		assert.NoError(t, nErr)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: favoritesCategory.SidebarCategory,
				Channels:        []string{dmChannel.Id},
			},
		})
		assert.NoError(t, err)
		res2, nErr := ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, dmChannel.Id)
		assert.NoError(t, nErr)
		assert.NotNil(t, res2)
		assert.Equal(t, "true", res2.Value)
		dmsCategory := categories.Categories[2]
		require.Equal(t, model.SidebarCategoryDirectMessages, dmsCategory.Type)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: dmsCategory.SidebarCategory,
				Channels:        []string{dmChannel.Id},
			},
		})
		assert.NoError(t, err)
		res2, nErr = ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, dmChannel.Id)
		assert.Error(t, nErr)
		assert.True(t, errors.Is(nErr, sql.ErrNoRows))
		assert.Nil(t, res2)
	})
	t.Run("should add and remove favorites preferences, even if the channel is already favorited in preferences", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		team2 := setupTeam(t, rctx, ss, userID)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		favoritesCategory := categories.Categories[0]
		require.Equal(t, model.SidebarCategoryFavorites, favoritesCategory.Type)
		res, nErr = ss.Channel().CreateInitialSidebarCategories(rctx, userID, team2.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories2, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team2.Id)
		require.NoError(t, err)
		favoritesCategory2 := categories2.Categories[0]
		require.Equal(t, model.SidebarCategoryFavorites, favoritesCategory2.Type)
		otherUserID := model.NewId()
		dmChannel, nErr := ss.Channel().SaveDirectChannel(rctx,
			&model.Channel{
				Name: model.GetDMNameFromIds(userID, otherUserID),
				Type: model.ChannelTypeDirect,
			},
			&model.ChannelMember{
				UserId:      userID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
			&model.ChannelMember{
				UserId:      otherUserID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
		)
		assert.NoError(t, nErr)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: favoritesCategory.SidebarCategory,
				Channels:        []string{dmChannel.Id},
			},
		})
		assert.NoError(t, err)
		res2, nErr := ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, dmChannel.Id)
		assert.NoError(t, nErr)
		assert.NotNil(t, res2)
		assert.Equal(t, "true", res2.Value)
		updated, _, err := ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: favoritesCategory2.SidebarCategory,
				Channels:        []string{dmChannel.Id},
			},
		})
		assert.NoError(t, err)
		assert.Equal(t, []string{dmChannel.Id}, updated[0].Channels)
		res2, nErr = ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, dmChannel.Id)
		assert.NoError(t, nErr)
		assert.NotNil(t, res2)
		assert.Equal(t, "true", res2.Value)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: favoritesCategory.SidebarCategory,
				Channels:        []string{},
			},
		})
		assert.NoError(t, err)
		res2, nErr = ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, dmChannel.Id)
		require.Error(t, nErr)
		assert.Nil(t, res2)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: favoritesCategory2.SidebarCategory,
				Channels:        []string{},
			},
		})
		assert.NoError(t, err)
		res2, nErr = ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, dmChannel.Id)
		require.Error(t, nErr)
		assert.Nil(t, res2)
	})
	t.Run("should not affect other users' favorites preferences", func(t *testing.T) {
		userID := model.NewId()
		userID2 := model.NewId()
		team := setupTeam(t, rctx, ss, userID, userID2)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		favoritesCategory := categories.Categories[0]
		require.Equal(t, model.SidebarCategoryFavorites, favoritesCategory.Type)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		res, nErr = ss.Channel().CreateInitialSidebarCategories(rctx, userID2, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		categories2, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID2, team.Id)
		require.NoError(t, err)
		favoritesCategory2 := categories2.Categories[0]
		require.Equal(t, model.SidebarCategoryFavorites, favoritesCategory2.Type)
		channelsCategory2 := categories2.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory2.Type)
		channel, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   "channel",
			Type:   model.ChannelTypeOpen,
			TeamId: team.Id,
		}, 10)
		require.NoError(t, nErr)
		_, nErr = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, nErr)
		_, nErr = ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID2,
			ChannelId:   channel.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, nErr)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: favoritesCategory.SidebarCategory,
				Channels:        []string{channel.Id},
			},
			{
				SidebarCategory: channelsCategory.SidebarCategory,
				Channels:        []string{},
			},
		})
		assert.NoError(t, err)
		res2, nErr := ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.NoError(t, nErr)
		assert.NotNil(t, res2)
		assert.Equal(t, "true", res2.Value)
		res2, nErr = ss.Preference().Get(userID2, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.True(t, errors.Is(nErr, sql.ErrNoRows))
		assert.Nil(t, res2)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID2, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: favoritesCategory2.SidebarCategory,
				Channels:        []string{channel.Id},
			},
			{
				SidebarCategory: channelsCategory2.SidebarCategory,
				Channels:        []string{},
			},
		})
		assert.NoError(t, err)
		res2, nErr = ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.NoError(t, nErr)
		assert.NotNil(t, res2)
		assert.Equal(t, "true", res2.Value)
		res2, nErr = ss.Preference().Get(userID2, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.NoError(t, nErr)
		assert.NotNil(t, res2)
		assert.Equal(t, "true", res2.Value)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: channelsCategory.SidebarCategory,
				Channels:        []string{channel.Id},
			},
			{
				SidebarCategory: favoritesCategory.SidebarCategory,
				Channels:        []string{},
			},
		})
		assert.NoError(t, err)
		res2, nErr = ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.True(t, errors.Is(nErr, sql.ErrNoRows))
		assert.Nil(t, res2)
		res2, nErr = ss.Preference().Get(userID2, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.NoError(t, nErr)
		assert.NotNil(t, res2)
		assert.Equal(t, "true", res2.Value)
		_, _, err = ss.Channel().UpdateSidebarCategories(userID2, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: channelsCategory2.SidebarCategory,
				Channels:        []string{channel.Id},
			},
			{
				SidebarCategory: favoritesCategory2.SidebarCategory,
				Channels:        []string{},
			},
		})
		assert.NoError(t, err)
		res2, nErr = ss.Preference().Get(userID, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.True(t, errors.Is(nErr, sql.ErrNoRows))
		assert.Nil(t, res2)
		res2, nErr = ss.Preference().Get(userID2, model.PreferenceCategoryFavoriteChannel, channel.Id)
		assert.True(t, errors.Is(nErr, sql.ErrNoRows))
		assert.Nil(t, res2)
	})
	t.Run("channels removed from Channels or DMs categories should be re-added", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		channel, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   "channel",
			Type:   model.ChannelTypeOpen,
			TeamId: team.Id,
		}, 10)
		require.NoError(t, nErr)
		_, err := ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, err)
		otherUserID := model.NewId()
		dmChannel, nErr := ss.Channel().SaveDirectChannel(
			rctx,
			&model.Channel{
				Name: model.GetDMNameFromIds(userID, otherUserID),
				Type: model.ChannelTypeDirect,
			},
			&model.ChannelMember{
				UserId:      userID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
			&model.ChannelMember{
				UserId:      otherUserID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
		)
		require.NoError(t, nErr)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		initialCategories, nErr := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, nErr)
		channelsCategory := initialCategories.Categories[1]
		dmsCategory := initialCategories.Categories[2]
		require.Equal(t, []string{channel.Id}, channelsCategory.Channels)
		require.Equal(t, []string{dmChannel.Id}, dmsCategory.Channels)
		categoriesToUpdate := []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: channelsCategory.SidebarCategory,
				Channels:        []string{},
			},
			{
				SidebarCategory: dmsCategory.SidebarCategory,
				Channels:        []string{},
			},
		}
		updatedCategories, _, nErr := ss.Channel().UpdateSidebarCategories(userID, team.Id, categoriesToUpdate)
		assert.NoError(t, nErr)
		assert.Equal(t, []string{channel.Id}, updatedCategories[0].Channels)
		assert.Equal(t, []string{dmChannel.Id}, updatedCategories[1].Channels)
	})
	t.Run("should be able to move DMs into and out of custom categories", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		otherUserID := model.NewId()
		dmChannel, nErr := ss.Channel().SaveDirectChannel(rctx,
			&model.Channel{
				Name: model.GetDMNameFromIds(userID, otherUserID),
				Type: model.ChannelTypeDirect,
			},
			&model.ChannelMember{
				UserId:      userID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
			&model.ChannelMember{
				UserId:      otherUserID,
				NotifyProps: model.GetDefaultChannelNotifyProps(),
			},
		)
		require.NoError(t, nErr)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		initialCategories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, err)
		dmsCategory := initialCategories.Categories[2]
		require.Equal(t, []string{dmChannel.Id}, dmsCategory.Channels)
		customCategory, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{})
		require.NoError(t, err)
		categoriesToUpdate := []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: dmsCategory.SidebarCategory,
				Channels:        []string{},
			},
			{
				SidebarCategory: customCategory.SidebarCategory,
				Channels:        []string{dmChannel.Id},
			},
		}
		updatedCategories, _, err := ss.Channel().UpdateSidebarCategories(userID, team.Id, categoriesToUpdate)
		assert.NoError(t, err)
		assert.Equal(t, dmsCategory.Id, updatedCategories[0].Id)
		assert.Equal(t, []string{}, updatedCategories[0].Channels)
		assert.Equal(t, customCategory.Id, updatedCategories[1].Id)
		assert.Equal(t, []string{dmChannel.Id}, updatedCategories[1].Channels)
		updatedDmsCategory, err := ss.Channel().GetSidebarCategory(dmsCategory.Id)
		require.NoError(t, err)
		assert.Equal(t, []string{}, updatedDmsCategory.Channels)
		updatedCustomCategory, err := ss.Channel().GetSidebarCategory(customCategory.Id)
		require.NoError(t, err)
		assert.Equal(t, []string{dmChannel.Id}, updatedCustomCategory.Channels)
		categoriesToUpdate = []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: dmsCategory.SidebarCategory,
				Channels:        []string{dmChannel.Id},
			},
			{
				SidebarCategory: customCategory.SidebarCategory,
				Channels:        []string{},
			},
		}
		updatedCategories, _, err = ss.Channel().UpdateSidebarCategories(userID, team.Id, categoriesToUpdate)
		assert.NoError(t, err)
		assert.Equal(t, dmsCategory.Id, updatedCategories[0].Id)
		assert.Equal(t, []string{dmChannel.Id}, updatedCategories[0].Channels)
		assert.Equal(t, customCategory.Id, updatedCategories[1].Id)
		assert.Equal(t, []string{}, updatedCategories[1].Channels)
		updatedDmsCategory, err = ss.Channel().GetSidebarCategory(dmsCategory.Id)
		require.NoError(t, err)
		assert.Equal(t, []string{dmChannel.Id}, updatedDmsCategory.Channels)
		updatedCustomCategory, err = ss.Channel().GetSidebarCategory(customCategory.Id)
		require.NoError(t, err)
		assert.Equal(t, []string{}, updatedCustomCategory.Channels)
	})
	t.Run("should successfully move channels between categories", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		channel, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   "channel",
			Type:   model.ChannelTypeOpen,
			TeamId: team.Id,
		}, 10)
		require.NoError(t, nErr)
		_, err := ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, err)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		initialCategories, nErr := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, nErr)
		channelsCategory := initialCategories.Categories[1]
		require.Equal(t, []string{channel.Id}, channelsCategory.Channels)
		customCategory, nErr := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{})
		require.NoError(t, nErr)
		updatedCategories, _, nErr := ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: channelsCategory.SidebarCategory,
				Channels:        []string{},
			},
			{
				SidebarCategory: customCategory.SidebarCategory,
				Channels:        []string{channel.Id},
			},
		})
		assert.NoError(t, nErr)
		assert.Equal(t, []string{}, updatedCategories[0].Channels)
		assert.Equal(t, []string{channel.Id}, updatedCategories[1].Channels)
		updatedCategories, _, nErr = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: channelsCategory.SidebarCategory,
				Channels:        []string{channel.Id},
			},
			{
				SidebarCategory: customCategory.SidebarCategory,
				Channels:        []string{},
			},
		})
		assert.NoError(t, nErr)
		assert.Equal(t, []string{channel.Id}, updatedCategories[0].Channels)
		assert.Equal(t, []string{}, updatedCategories[1].Channels)
	})
	t.Run("should correctly return the original categories that were modified", func(t *testing.T) {
		userID := model.NewId()
		team := setupTeam(t, rctx, ss, userID)
		channel, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   "channel",
			Type:   model.ChannelTypeOpen,
			TeamId: team.Id,
		}, 10)
		require.NoError(t, nErr)
		_, err := ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, err)
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		initialCategories, nErr := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
		require.NoError(t, nErr)
		channelsCategory := initialCategories.Categories[1]
		require.Equal(t, []string{channel.Id}, channelsCategory.Channels)
		customCategory, nErr := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				DisplayName: "originalName",
			},
		})
		require.NoError(t, nErr)
		updatedCategories, originalCategories, nErr := ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: model.SidebarCategory{
					Id:          customCategory.Id,
					DisplayName: "updatedName",
				},
			},
		})
		require.NoError(t, nErr)
		require.Equal(t, len(updatedCategories), len(originalCategories))
		assert.Equal(t, "originalName", originalCategories[0].DisplayName)
		assert.Equal(t, "updatedName", updatedCategories[0].DisplayName)
		updatedCategories, originalCategories, nErr = ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: channelsCategory.SidebarCategory,
				Channels:        []string{},
			},
			{
				SidebarCategory: customCategory.SidebarCategory,
				Channels:        []string{channel.Id},
			},
		})
		require.NoError(t, nErr)
		require.Equal(t, len(updatedCategories), len(originalCategories))
		require.Equal(t, updatedCategories[0].Id, originalCategories[0].Id)
		require.Equal(t, updatedCategories[1].Id, originalCategories[1].Id)
		assert.Equal(t, []string{channel.Id}, originalCategories[0].Channels)
		assert.Equal(t, []string{}, updatedCategories[0].Channels)
		assert.Equal(t, []string{}, originalCategories[1].Channels)
		assert.Equal(t, []string{channel.Id}, updatedCategories[1].Channels)
	})
}
func setupInitialSidebarCategories(t *testing.T, rctx request.CTX, ss store.Store) (string, string) {
	userID := model.NewId()
	team := setupTeam(t, rctx, ss, userID)
	res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
	require.NoError(t, nErr)
	require.NotEmpty(t, res)
	res, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
	require.NoError(t, err)
	require.Len(t, res.Categories, 3)
	return userID, team.Id
}
func testClearSidebarOnTeamLeave(t *testing.T, rctx request.CTX, ss store.Store, s SqlStore) {
	t.Run("should delete all sidebar categories and channels on the team", func(t *testing.T) {
		userID, teamID := setupInitialSidebarCategories(t, rctx, ss)
		user := &model.User{
			Id: userID,
		}
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   model.NewId(),
			TeamId: teamID,
			Type:   model.ChannelTypeOpen,
		}, 1000)
		require.NoError(t, nErr)
		dmChannel1, nErr := ss.Channel().CreateDirectChannel(rctx, user, &model.User{
			Id: model.NewId(),
		})
		require.NoError(t, nErr)
		_, err := ss.Channel().CreateSidebarCategory(userID, teamID, &model.SidebarCategoryWithChannels{
			Channels: []string{channel1.Id, dmChannel1.Id},
		})
		require.NoError(t, err)
		var count int64
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarCategories WHERE UserId = ?", userID)
		require.NoError(t, err)
		require.Equal(t, int64(4), count)
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarChannels WHERE UserId = ?", userID)
		require.NoError(t, err)
		require.Equal(t, int64(2), count)
		err = ss.Channel().ClearSidebarOnTeamLeave(userID, teamID)
		assert.NoError(t, err)
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarCategories WHERE UserId = ?", userID)
		require.NoError(t, err)
		assert.Equal(t, int64(0), count)
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarChannels WHERE UserId = ?", userID)
		require.NoError(t, err)
		assert.Equal(t, int64(0), count)
	})
	t.Run("should not delete sidebar categories and channels on another the team", func(t *testing.T) {
		userID, teamID := setupInitialSidebarCategories(t, rctx, ss)
		user := &model.User{
			Id: userID,
		}
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   model.NewId(),
			TeamId: teamID,
			Type:   model.ChannelTypeOpen,
		}, 1000)
		require.NoError(t, nErr)
		dmChannel1, nErr := ss.Channel().CreateDirectChannel(rctx, user, &model.User{
			Id: model.NewId(),
		})
		require.NoError(t, nErr)
		_, err := ss.Channel().CreateSidebarCategory(userID, teamID, &model.SidebarCategoryWithChannels{
			Channels: []string{channel1.Id, dmChannel1.Id},
		})
		require.NoError(t, err)
		var count int64
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarCategories WHERE UserId = ?", userID)
		require.NoError(t, err)
		require.Equal(t, int64(4), count)
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarChannels WHERE UserId = ?", userID)
		require.NoError(t, err)
		require.Equal(t, int64(2), count)
		err = ss.Channel().ClearSidebarOnTeamLeave(userID, model.NewId())
		assert.NoError(t, err)
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarCategories WHERE UserId = ?", userID)
		require.NoError(t, err)
		assert.Equal(t, int64(4), count)
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarChannels WHERE UserId = ?", userID)
		require.NoError(t, err)
		assert.Equal(t, int64(2), count)
	})
	t.Run("MM-30314 should not delete channels on another team under specific circumstances", func(t *testing.T) {
		userID, teamID := setupInitialSidebarCategories(t, rctx, ss)
		user := &model.User{
			Id: userID,
		}
		user2 := &model.User{
			Id: model.NewId(),
		}
		team2 := setupTeam(t, rctx, ss, userID)
		res, err := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team2.Id)
		require.NoError(t, err)
		require.NotEmpty(t, res)
		res, err = ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team2.Id)
		require.NoError(t, err)
		require.Len(t, res.Categories, 3)
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   model.NewId(),
			TeamId: teamID,
			Type:   model.ChannelTypeOpen,
		}, 1000)
		require.NoError(t, nErr)
		dmChannel1, nErr := ss.Channel().CreateDirectChannel(rctx, user, user2)
		require.NoError(t, nErr)
		_, err = ss.Channel().CreateSidebarCategory(userID, teamID, &model.SidebarCategoryWithChannels{
			Channels: []string{channel1.Id, dmChannel1.Id},
		})
		require.NoError(t, err)
		channel2, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   model.NewId(),
			TeamId: team2.Id,
			Type:   model.ChannelTypeOpen,
		}, 1000)
		require.NoError(t, nErr)
		_, err = ss.Channel().CreateSidebarCategory(userID, team2.Id, &model.SidebarCategoryWithChannels{
			Channels: []string{channel2.Id, dmChannel1.Id},
		})
		require.NoError(t, err)
		var count int64
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarCategories WHERE UserId = ?", userID)
		require.NoError(t, err)
		require.Equal(t, int64(8), count)
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarChannels WHERE UserId = ?", userID)
		require.NoError(t, err)
		require.Equal(t, int64(4), count)
		err = ss.Channel().ClearSidebarOnTeamLeave(userID, teamID)
		assert.NoError(t, err)
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarCategories WHERE UserId = ?", userID)
		require.NoError(t, err)
		assert.Equal(t, int64(4), count)
		err = s.GetMaster().Get(&count, "SELECT COUNT(*) FROM SidebarChannels WHERE UserId = ?", userID)
		require.NoError(t, err)
		assert.Equal(t, int64(2), count)
		res, err = ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team2.Id)
		require.NoError(t, err)
		assert.Len(t, res.Categories, 4)
		assert.Equal(t, model.SidebarCategoryCustom, res.Categories[1].Type)
		assert.Equal(t, []string{channel2.Id, dmChannel1.Id}, res.Categories[1].Channels)
	})
}
func testDeleteSidebarCategory(t *testing.T, rctx request.CTX, ss store.Store, s SqlStore) {
	t.Run("should correctly remove an empty category", func(t *testing.T) {
		userID, teamID := setupInitialSidebarCategories(t, rctx, ss)
		defer ss.User().PermanentDelete(rctx, userID)
		newCategory, err := ss.Channel().CreateSidebarCategory(userID, teamID, &model.SidebarCategoryWithChannels{})
		require.NoError(t, err)
		require.NotNil(t, newCategory)
		res, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, teamID)
		require.NoError(t, err)
		require.Len(t, res.Categories, 4)
		err = ss.Channel().DeleteSidebarCategory(newCategory.Id)
		assert.NoError(t, err)
		res, err = ss.Channel().GetSidebarCategoriesForTeamForUser(userID, teamID)
		require.NoError(t, err)
		require.Len(t, res.Categories, 3)
	})
	t.Run("should correctly remove a category and its channels", func(t *testing.T) {
		userID, teamID := setupInitialSidebarCategories(t, rctx, ss)
		defer ss.User().PermanentDelete(rctx, userID)
		user := &model.User{
			Id: userID,
		}
		channel1, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   model.NewId(),
			TeamId: teamID,
			Type:   model.ChannelTypeOpen,
		}, 1000)
		require.NoError(t, nErr)
		defer ss.Channel().PermanentDelete(rctx, channel1.Id)
		channel2, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   model.NewId(),
			TeamId: teamID,
			Type:   model.ChannelTypePrivate,
		}, 1000)
		require.NoError(t, nErr)
		defer ss.Channel().PermanentDelete(rctx, channel2.Id)
		dmChannel1, nErr := ss.Channel().CreateDirectChannel(rctx, user, &model.User{
			Id: model.NewId(),
		})
		require.NoError(t, nErr)
		defer ss.Channel().PermanentDelete(rctx, dmChannel1.Id)
		newCategory, err := ss.Channel().CreateSidebarCategory(userID, teamID, &model.SidebarCategoryWithChannels{
			Channels: []string{channel1.Id, channel2.Id, dmChannel1.Id},
		})
		require.NoError(t, err)
		require.NotNil(t, newCategory)
		res, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, teamID)
		require.NoError(t, err)
		require.Len(t, res.Categories, 4)
		require.Equal(t, model.SidebarCategoryCustom, res.Categories[1].Type)
		require.Equal(t, []string{channel1.Id, channel2.Id, dmChannel1.Id}, res.Categories[1].Channels)
		err = ss.Channel().DeleteSidebarCategory(newCategory.Id)
		assert.NoError(t, err)
		res, err = ss.Channel().GetSidebarCategoriesForTeamForUser(userID, teamID)
		assert.NoError(t, err)
		assert.Len(t, res.Categories, 3)
		var count int64
		countErr := s.GetMaster().Get(&count, `
			SELECT
				COUNT(*)
			FROM
				SidebarChannels
			WHERE
				CategoryId = ?`, newCategory.Id)
		require.NoError(t, countErr)
		assert.Equal(t, int64(0), count)
	})
	t.Run("should not allow you to remove non-custom categories", func(t *testing.T) {
		userID, teamID := setupInitialSidebarCategories(t, rctx, ss)
		defer ss.User().PermanentDelete(rctx, userID)
		res, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, teamID)
		require.NoError(t, err)
		require.Len(t, res.Categories, 3)
		require.Equal(t, model.SidebarCategoryFavorites, res.Categories[0].Type)
		require.Equal(t, model.SidebarCategoryChannels, res.Categories[1].Type)
		require.Equal(t, model.SidebarCategoryDirectMessages, res.Categories[2].Type)
		err = ss.Channel().DeleteSidebarCategory(res.Categories[0].Id)
		assert.Error(t, err)
		err = ss.Channel().DeleteSidebarCategory(res.Categories[1].Id)
		assert.Error(t, err)
		err = ss.Channel().DeleteSidebarCategory(res.Categories[2].Id)
		assert.Error(t, err)
	})
}
func testUpdateSidebarChannelsByPreferences(t *testing.T, rctx request.CTX, ss store.Store) {
	t.Run("Should be able to update sidebar channels", func(t *testing.T) {
		userID := model.NewId()
		teamID := model.NewId()
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, teamID)
		require.NoError(t, nErr)
		require.NotEmpty(t, res)
		channel, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:   "channel",
			Type:   model.ChannelTypeOpen,
			TeamId: teamID,
		}, 10)
		require.NoError(t, nErr)
		err := ss.Channel().UpdateSidebarChannelsByPreferences(model.Preferences{
			model.Preference{
				Name:     channel.Id,
				Category: model.PreferenceCategoryFavoriteChannel,
				Value:    "true",
			},
		})
		assert.NoError(t, err)
	})
	t.Run("Should not panic if channel is not found", func(t *testing.T) {
		userID := model.NewId()
		teamID := model.NewId()
		res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, teamID)
		assert.NoError(t, nErr)
		require.NotEmpty(t, res)
		require.NotPanics(t, func() {
			_ = ss.Channel().UpdateSidebarChannelsByPreferences(model.Preferences{
				model.Preference{
					Name:     "fakeid",
					Category: model.PreferenceCategoryFavoriteChannel,
					Value:    "true",
				},
			})
		})
	})
}
func testSidebarCategoryDeadlock(t *testing.T, rctx request.CTX, ss store.Store) {
	userID := model.NewId()
	team := setupTeam(t, rctx, ss, userID)
	channel, err := ss.Channel().Save(rctx, &model.Channel{
		Name:   "channel",
		Type:   model.ChannelTypeOpen,
		TeamId: team.Id,
	}, 10)
	require.NoError(t, err)
	_, err = ss.Channel().SaveMember(rctx, &model.ChannelMember{
		UserId:      userID,
		ChannelId:   channel.Id,
		NotifyProps: model.GetDefaultChannelNotifyProps(),
	})
	require.NoError(t, err)
	res, err := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
	require.NoError(t, err)
	require.NotEmpty(t, res)
	initialCategories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
	require.NoError(t, err)
	channelsCategory := initialCategories.Categories[1]
	require.Equal(t, []string{channel.Id}, channelsCategory.Channels)
	customCategory, err := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{})
	require.NoError(t, err)
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		_, _, err := ss.Channel().UpdateSidebarCategories(userID, team.Id, []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: channelsCategory.SidebarCategory,
				Channels:        []string{},
			},
			{
				SidebarCategory: customCategory.SidebarCategory,
				Channels:        []string{channel.Id},
			},
		})
		if err != nil {
			var nfErr *store.ErrNotFound
			require.True(t, errors.As(err, &nfErr))
		}
	}()
	go func() {
		defer wg.Done()
		err := ss.Channel().DeleteSidebarCategory(customCategory.Id)
		require.NoError(t, err)
	}()
	wg.Wait()
}
func testSidebarCategoryConcurrentAccess(t *testing.T, rctx request.CTX, ss store.Store, s SqlStore) {
	for i := range 2 {
		t.Run(fmt.Sprint(i), func(t *testing.T) {
			t.Parallel()
			doTestSidebarCategoryConcurrentAccess(t, rctx, ss)
		})
	}
}
func doTestSidebarCategoryConcurrentAccess(t *testing.T, rctx request.CTX, ss store.Store) {
	userID := model.NewId()
	team := setupTeam(t, rctx, ss, userID)
	numGoroutines := 20
	channels := make([]*model.Channel, 5)
	for i := range channels {
		channel, nErr := ss.Channel().Save(rctx, &model.Channel{
			Name:        fmt.Sprintf("channel-%d", i),
			DisplayName: fmt.Sprintf("Channel %d", i),
			Type:        model.ChannelTypeOpen,
			TeamId:      team.Id,
		}, 10)
		require.NoError(t, nErr)
		_, err := ss.Channel().SaveMember(rctx, &model.ChannelMember{
			UserId:      userID,
			ChannelId:   channel.Id,
			NotifyProps: model.GetDefaultChannelNotifyProps(),
		})
		require.NoError(t, err)
		channels[i] = channel
	}
	dmChannels := make([]*model.Channel, 3)
	for i := range dmChannels {
		otherUserID := model.NewId()
		dmChannel, nErr := ss.Channel().CreateDirectChannel(rctx, &model.User{
			Id: userID,
		}, &model.User{
			Id: otherUserID,
		})
		require.NoError(t, nErr)
		dmChannels[i] = dmChannel
	}
	channelChan := make(chan string, 4*numGoroutines)
	for i := 0; i < cap(channelChan); i++ {
		channelChan <- channels[i%len(channels)].Id
	}
	dmChannelChan := make(chan string, 4*numGoroutines)
	for i := 0; i < cap(dmChannelChan); i++ {
		dmChannelChan <- dmChannels[i%len(dmChannels)].Id
	}
	res, nErr := ss.Channel().CreateInitialSidebarCategories(rctx, userID, team.Id)
	require.NoError(t, nErr)
	require.NotEmpty(t, res)
	initialCategories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
	require.NoError(t, err)
	customCategories := make([]*model.SidebarCategoryWithChannels, 2)
	for i := range 2 {
		customCategory, createErr := ss.Channel().CreateSidebarCategory(userID, team.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				DisplayName: fmt.Sprintf("Custom Category %d", i),
			},
		})
		require.NoError(t, createErr)
		customCategories[i] = customCategory
	}
	var wg sync.WaitGroup
	for i := range numGoroutines {
		wg.Add(1)
		go func() {
			defer wg.Done()
			categories, getErr := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
			require.NoError(t, getErr)
			require.NotEmpty(t, categories.Categories)
		}()
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			var updatedCategories []*model.SidebarCategoryWithChannels
			switch iteration % 8 {
			case 0:
				updatedCategories = []*model.SidebarCategoryWithChannels{
					{
						SidebarCategory: initialCategories.Categories[1].SidebarCategory,
						Channels:        []string{},
					},
					{
						SidebarCategory: customCategories[0].SidebarCategory,
						Channels:        []string{<-channelChan, <-channelChan, <-channelChan},
					},
				}
			case 1:
				updatedCategories = []*model.SidebarCategoryWithChannels{
					{
						SidebarCategory: initialCategories.Categories[1].SidebarCategory,
						Channels:        []string{<-channelChan, <-channelChan, <-channelChan},
					},
					{
						SidebarCategory: customCategories[0].SidebarCategory,
						Channels:        []string{},
					},
				}
			case 2:
				updatedCategories = []*model.SidebarCategoryWithChannels{
					{
						SidebarCategory: initialCategories.Categories[2].SidebarCategory,
						Channels:        []string{},
					},
					{
						SidebarCategory: customCategories[1].SidebarCategory,
						Channels:        []string{<-dmChannelChan, <-channelChan, <-channelChan},
					},
				}
			case 3:
				updatedCategories = []*model.SidebarCategoryWithChannels{
					{
						SidebarCategory: initialCategories.Categories[2].SidebarCategory,
						Channels:        []string{<-dmChannelChan},
					},
					{
						SidebarCategory: customCategories[1].SidebarCategory,
						Channels:        []string{<-channelChan, <-channelChan},
					},
				}
			case 4:
				updatedCategories = []*model.SidebarCategoryWithChannels{
					{
						SidebarCategory: customCategories[0].SidebarCategory,
						Channels:        []string{<-channelChan, <-channelChan, <-channelChan},
					},
					{
						SidebarCategory: customCategories[1].SidebarCategory,
						Channels:        []string{<-channelChan},
					},
				}
			case 5:
				updatedCategories = []*model.SidebarCategoryWithChannels{
					{
						SidebarCategory: customCategories[0].SidebarCategory,
						Channels:        []string{<-channelChan},
					},
					{
						SidebarCategory: customCategories[1].SidebarCategory,
						Channels:        []string{<-channelChan, <-channelChan, <-channelChan},
					},
				}
			case 6:
				updatedCategories = []*model.SidebarCategoryWithChannels{
					{
						SidebarCategory: initialCategories.Categories[0].SidebarCategory,
						Channels:        []string{<-channelChan, <-dmChannelChan},
					},
				}
			case 7:
				customCatIndex := rand.Intn(2)
				updatedCategories = []*model.SidebarCategoryWithChannels{
					{
						SidebarCategory: model.SidebarCategory{
							Id:          customCategories[customCatIndex].Id,
							DisplayName: fmt.Sprintf("Updated Name %d", iteration),
							Sorting:     model.SidebarCategorySortRecent,
							Muted:       iteration%2 == 0,
						},
						Channels: customCategories[customCatIndex].Channels,
					},
				}
			}
			for i, category := range updatedCategories {
				updatedCategories[i].Channels = model.RemoveDuplicateStringsNonSort(category.Channels)
			}
			_, _, updateErr := ss.Channel().UpdateSidebarCategories(userID, team.Id, updatedCategories)
			if err != nil {
				require.NoError(t, fmt.Errorf("[iteration %d]: %v", iteration, updateErr))
			}
		}(i)
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(3)))
	}
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(30 * time.Second):
		t.Log("Test timed out, likely deadlock")
		t.FailNow()
	}
	finalCategories, err := ss.Channel().GetSidebarCategoriesForTeamForUser(userID, team.Id)
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(finalCategories.Categories), 5, "Should have at least 5 categories (3 default + 2 custom)")
	channelFound := make(map[string]bool)
	for _, channel := range channels {
		channelFound[channel.Id] = false
	}
	for _, category := range finalCategories.Categories {
		for _, channelId := range category.Channels {
			if _, exists := channelFound[channelId]; exists {
				channelFound[channelId] = true
			}
		}
	}
	for channelId, found := range channelFound {
		require.True(t, found, "Channel %s should be assigned to at least one category", channelId)
	}
}