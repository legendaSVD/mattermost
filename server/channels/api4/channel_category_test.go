package api4
import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
)
func TestCreateCategoryForTeamForUser(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	t.Run("should silently prevent the user from creating a category with an invalid channel ID", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      user.Id,
				TeamId:      th.BasicTeam.Id,
				DisplayName: "test",
			},
			Channels: []string{th.BasicChannel.Id, "notachannel", th.BasicChannel2.Id},
		}
		received, _, err := client.CreateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, category)
		require.NoError(t, err)
		assert.NotContains(t, received.Channels, "notachannel")
		assert.Equal(t, []string{th.BasicChannel.Id, th.BasicChannel2.Id}, received.Channels)
	})
	t.Run("should silently prevent the user from creating a category with a channel that they're not a member of", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channel, _, err := th.SystemAdminClient.CreateChannel(context.Background(), &model.Channel{
			TeamId:      th.BasicTeam.Id,
			Type:        model.ChannelTypeOpen,
			Name:        "testchannel",
			DisplayName: "testchannel",
		})
		require.NoError(t, err)
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      user.Id,
				TeamId:      th.BasicTeam.Id,
				DisplayName: "test",
			},
			Channels: []string{th.BasicChannel.Id, channel.Id},
		}
		received, _, err := client.CreateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, category)
		require.NoError(t, err)
		assert.NotContains(t, received.Channels, channel.Id)
		assert.Equal(t, []string{th.BasicChannel.Id}, received.Channels)
	})
	t.Run("should return expected sort order value", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		customCategory, _, err := client.CreateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      user.Id,
				TeamId:      th.BasicTeam.Id,
				DisplayName: "custom123",
			},
		})
		require.NoError(t, err)
		require.Equal(t, int64(10), customCategory.SortOrder)
	})
	t.Run("should not crash with null input", func(t *testing.T) {
		require.NotPanics(t, func() {
			user, client := setupUserForSubtest(t, th)
			payload := `null`
			route := fmt.Sprintf("/users/%s/teams/%s/channels/categories", user.Id, th.BasicTeam.Id)
			r, err := client.DoAPIPost(context.Background(), route, payload)
			require.Error(t, err)
			closeBody(r)
		})
	})
	t.Run("should return error when user tries to create a category for a team they're not a member of", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		team, appErr := th.App.CreateTeam(th.Context, &model.Team{
			DisplayName: "Team for testing",
			Name:        "test-team-" + model.NewId(),
			Email:       th.GenerateTestEmail(),
			Type:        model.TeamOpen,
		})
		require.Nil(t, appErr)
		th.LinkUserToTeam(t, user, team)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		appErr = th.App.RemoveUserFromTeam(th.Context, team.Id, user.Id, th.SystemAdminUser.Id)
		require.Nil(t, appErr)
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      user.Id,
				TeamId:      team.Id,
				DisplayName: "test category",
			},
		}
		_, resp, err := client.CreateSidebarCategoryForTeamForUser(context.Background(), user.Id, team.Id, category)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
	t.Run("should publish expected WS payload", func(t *testing.T) {
		userWSClient := th.CreateConnectedWebSocketClient(t)
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      th.BasicUser.Id,
				TeamId:      th.BasicTeam.Id,
				DisplayName: "test",
			},
			Channels: []string{th.BasicChannel.Id, "notachannel", th.BasicChannel2.Id},
		}
		received, _, err := th.Client.CreateSidebarCategoryForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, category)
		require.NoError(t, err)
		testCategories := []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: model.SidebarCategory{
					Id:      received.Id,
					UserId:  th.BasicUser.Id,
					TeamId:  th.BasicTeam.Id,
					Sorting: model.SidebarCategorySortRecent,
					Muted:   true,
				},
				Channels: []string{th.BasicChannel.Id},
			},
		}
		testCategories, _, err = th.Client.UpdateSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, testCategories)
		require.NoError(t, err)
		b, err := json.Marshal(testCategories)
		require.NoError(t, err)
		expected := string(b)
		var caught bool
		func() {
			for {
				select {
				case ev := <-userWSClient.EventChannel:
					if ev.EventType() == model.WebsocketEventSidebarCategoryUpdated {
						caught = true
						data := ev.GetData()
						updatedCategoriesData, ok := data["updatedCategories"]
						require.True(t, ok)
						require.EqualValues(t, expected, updatedCategoriesData)
					}
				case <-time.After(2 * time.Second):
					return
				}
			}
		}()
		require.Truef(t, caught, "User should have received %s event", model.WebsocketEventSidebarCategoryUpdated)
	})
}
func TestUpdateCategoryForTeamForUser(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	t.Run("should update the channel order of the Channels category", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		require.Len(t, channelsCategory.Channels, 5)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: channelsCategory.SidebarCategory,
			Channels:        []string{channelsCategory.Channels[1], channelsCategory.Channels[0], channelsCategory.Channels[4], channelsCategory.Channels[3], channelsCategory.Channels[2]},
		}
		received, _, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, channelsCategory.Id, updatedCategory)
		assert.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, received.Id)
		assert.Equal(t, updatedCategory.Channels, received.Channels)
		received, _, err = client.GetSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, channelsCategory.Id, "")
		assert.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, received.Id)
		assert.Equal(t, updatedCategory.Channels, received.Channels)
	})
	t.Run("should update the sort order of the DM category", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		dmsCategory := categories.Categories[2]
		require.Equal(t, model.SidebarCategoryDirectMessages, dmsCategory.Type)
		require.Equal(t, model.SidebarCategorySortRecent, dmsCategory.Sorting)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: dmsCategory.SidebarCategory,
			Channels:        dmsCategory.Channels,
		}
		updatedCategory.Sorting = model.SidebarCategorySortAlphabetical
		received, _, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, dmsCategory.Id, updatedCategory)
		assert.NoError(t, err)
		assert.Equal(t, dmsCategory.Id, received.Id)
		assert.Equal(t, model.SidebarCategorySortAlphabetical, received.Sorting)
		received, _, err = client.GetSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, dmsCategory.Id, "")
		assert.NoError(t, err)
		assert.Equal(t, dmsCategory.Id, received.Id)
		assert.Equal(t, model.SidebarCategorySortAlphabetical, received.Sorting)
	})
	t.Run("should update the display name of a custom category", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		customCategory, _, err := client.CreateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      user.Id,
				TeamId:      th.BasicTeam.Id,
				DisplayName: "custom123",
			},
		})
		require.NoError(t, err)
		require.Equal(t, "custom123", customCategory.DisplayName)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: customCategory.SidebarCategory,
			Channels:        customCategory.Channels,
		}
		updatedCategory.DisplayName = "abcCustom"
		received, _, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, customCategory.Id, updatedCategory)
		assert.NoError(t, err)
		assert.Equal(t, customCategory.Id, received.Id)
		assert.Equal(t, updatedCategory.DisplayName, received.DisplayName)
		received, _, err = client.GetSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, customCategory.Id, "")
		assert.NoError(t, err)
		assert.Equal(t, customCategory.Id, received.Id)
		assert.Equal(t, updatedCategory.DisplayName, received.DisplayName)
	})
	t.Run("should update the channel order of the category even if it contains archived channels", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		require.Len(t, channelsCategory.Channels, 5)
		_, err = client.DeleteChannel(context.Background(), th.BasicChannel.Id)
		require.NoError(t, err)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: channelsCategory.SidebarCategory,
			Channels:        []string{channelsCategory.Channels[1], channelsCategory.Channels[0], channelsCategory.Channels[4], channelsCategory.Channels[3], channelsCategory.Channels[2]},
		}
		received, _, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, channelsCategory.Id, updatedCategory)
		require.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, received.Id)
		assert.Equal(t, updatedCategory.Channels, received.Channels)
	})
	t.Run("should silently prevent the user from adding an invalid channel ID", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: channelsCategory.SidebarCategory,
			Channels:        append(channelsCategory.Channels, "notachannel"),
		}
		received, _, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, channelsCategory.Id, updatedCategory)
		require.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, received.Id)
		assert.NotContains(t, received.Channels, "notachannel")
		assert.Equal(t, channelsCategory.Channels, received.Channels)
	})
	t.Run("should silently prevent the user from adding a channel that they're not a member of", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		channel, _, err := th.SystemAdminClient.CreateChannel(context.Background(), &model.Channel{
			TeamId:      th.BasicTeam.Id,
			Type:        model.ChannelTypeOpen,
			Name:        "testchannel",
			DisplayName: "testchannel",
		})
		require.NoError(t, err)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: channelsCategory.SidebarCategory,
			Channels:        append(channelsCategory.Channels, channel.Id),
		}
		received, _, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, channelsCategory.Id, updatedCategory)
		require.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, received.Id)
		assert.NotContains(t, received.Channels, channel.Id)
		assert.Equal(t, channelsCategory.Channels, received.Channels)
	})
	t.Run("muting a category should mute all of its channels", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		require.True(t, len(channelsCategory.Channels) > 0)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				Id:      channelsCategory.Id,
				UserId:  user.Id,
				TeamId:  th.BasicTeam.Id,
				Sorting: channelsCategory.Sorting,
				Muted:   true,
			},
			Channels: channelsCategory.Channels,
		}
		received, _, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, channelsCategory.Id, updatedCategory)
		require.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, received.Id)
		assert.True(t, received.Muted)
		received, _, err = client.GetSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, channelsCategory.Id, "")
		require.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, received.Id)
		assert.True(t, received.Muted)
		member, _, err := client.GetChannelMember(context.Background(), channelsCategory.Channels[0], user.Id, "")
		require.NoError(t, err)
		assert.True(t, member.IsChannelMuted())
	})
	t.Run("should not be able to mute DM category", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		dmsCategory := categories.Categories[2]
		require.Equal(t, model.SidebarCategoryDirectMessages, dmsCategory.Type)
		require.Len(t, dmsCategory.Channels, 0)
		dmChannel, _, err := client.CreateDirectChannel(context.Background(), user.Id, th.BasicUser.Id)
		require.NoError(t, err)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				Id:      dmsCategory.Id,
				UserId:  user.Id,
				TeamId:  th.BasicTeam.Id,
				Sorting: dmsCategory.Sorting,
				Muted:   true,
			},
			Channels: []string{dmChannel.Id},
		}
		received, _, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, dmsCategory.Id, updatedCategory)
		require.NoError(t, err)
		assert.Equal(t, dmsCategory.Id, received.Id)
		assert.False(t, received.Muted)
		received, _, err = client.GetSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, dmsCategory.Id, "")
		require.NoError(t, err)
		assert.Equal(t, dmsCategory.Id, received.Id)
		assert.False(t, received.Muted)
		member, _, err := client.GetChannelMember(context.Background(), dmChannel.Id, user.Id, "")
		require.NoError(t, err)
		assert.False(t, member.IsChannelMuted())
	})
	t.Run("should not crash with null input", func(t *testing.T) {
		require.NotPanics(t, func() {
			user, client := setupUserForSubtest(t, th)
			categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
			require.NoError(t, err)
			require.Len(t, categories.Categories, 3)
			require.Len(t, categories.Order, 3)
			dmsCategory := categories.Categories[2]
			payload := `null`
			route := fmt.Sprintf("/users/%s/teams/%s/channels/categories/%s", user.Id, th.BasicTeam.Id, dmsCategory.Id)
			r, err := client.DoAPIPut(context.Background(), route, payload)
			require.Error(t, err)
			closeBody(r)
		})
	})
	t.Run("should return error when user tries to update a category for a team they're not a member of", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		team, appErr := th.App.CreateTeam(th.Context, &model.Team{
			DisplayName: "Team for testing",
			Name:        "test-team-" + model.NewId(),
			Email:       th.GenerateTestEmail(),
			Type:        model.TeamOpen,
		})
		require.Nil(t, appErr)
		th.LinkUserToTeam(t, user, team)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, team.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		categoryToUpdate := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				Id:          categories.Categories[0].Id,
				UserId:      user.Id,
				TeamId:      team.Id,
				DisplayName: "Updated Category",
				Type:        categories.Categories[0].Type,
			},
			Channels: categories.Categories[0].Channels,
		}
		appErr = th.App.RemoveUserFromTeam(th.Context, team.Id, user.Id, th.SystemAdminUser.Id)
		require.Nil(t, appErr)
		_, resp, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, team.Id, categoryToUpdate.Id, categoryToUpdate)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
}
func TestUpdateCategoriesForTeamForUser(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	t.Run("should silently prevent the user from adding an invalid channel ID", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: channelsCategory.SidebarCategory,
			Channels:        append(channelsCategory.Channels, "notachannel"),
		}
		received, _, err := client.UpdateSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, []*model.SidebarCategoryWithChannels{updatedCategory})
		require.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, received[0].Id)
		assert.NotContains(t, received[0].Channels, "notachannel")
		assert.Equal(t, channelsCategory.Channels, received[0].Channels)
	})
	t.Run("should silently prevent the user from adding a channel that they're not a member of", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		channel, _, err := th.SystemAdminClient.CreateChannel(context.Background(), &model.Channel{
			TeamId:      th.BasicTeam.Id,
			Type:        model.ChannelTypeOpen,
			Name:        "testchannel",
			DisplayName: "testchannel",
		})
		require.NoError(t, err)
		updatedCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: channelsCategory.SidebarCategory,
			Channels:        append(channelsCategory.Channels, channel.Id),
		}
		received, _, err := client.UpdateSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, []*model.SidebarCategoryWithChannels{updatedCategory})
		require.NoError(t, err)
		assert.Equal(t, channelsCategory.Id, received[0].Id)
		assert.NotContains(t, received[0].Channels, channel.Id)
		assert.Equal(t, channelsCategory.Channels, received[0].Channels)
	})
	t.Run("should update order", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		_, _, err = client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, []string{categories.Order[1], categories.Order[0], categories.Order[2]})
		require.NoError(t, err)
		categories, _, err = client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory = categories.Categories[0]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		newOrder, _, err := client.GetSidebarCategoryOrderForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.EqualValues(t, newOrder, categories.Order)
		_, _, err = client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, []string{categories.Order[1], categories.Order[0]})
		require.Error(t, err)
		_, _, err = client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, []string{categories.Order[1], categories.Order[0], "asd"})
		require.Error(t, err)
	})
	t.Run("should return error when user tries to update categories for a team they're not a member of", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		team, appErr := th.App.CreateTeam(th.Context, &model.Team{
			DisplayName: "Team for testing",
			Name:        "test-team-" + model.NewId(),
			Email:       th.GenerateTestEmail(),
			Type:        model.TeamOpen,
		})
		require.Nil(t, appErr)
		th.LinkUserToTeam(t, user, team)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		existingCategories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, team.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, existingCategories.Categories)
		categoriesToUpdate := []*model.SidebarCategoryWithChannels{
			{
				SidebarCategory: model.SidebarCategory{
					Id:          existingCategories.Categories[0].Id,
					UserId:      user.Id,
					TeamId:      team.Id,
					DisplayName: "Updated Category",
					Type:        existingCategories.Categories[0].Type,
				},
				Channels: existingCategories.Categories[0].Channels,
			},
		}
		appErr = th.App.RemoveUserFromTeam(th.Context, team.Id, user.Id, th.SystemAdminUser.Id)
		require.Nil(t, appErr)
		_, resp, err := client.UpdateSidebarCategoriesForTeamForUser(context.Background(), user.Id, team.Id, categoriesToUpdate)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
}
func TestGetCategoriesForTeamForUser(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	t.Run("should return categories when user has permission", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotNil(t, categories)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
	})
	t.Run("should return error when user doesn't have permission", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		_, resp, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
	t.Run("should return error for a team the user is not a member of", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		team, appErr := th.App.CreateTeam(th.Context, &model.Team{
			DisplayName: "Team for testing",
			Name:        "test-team-" + model.NewId(),
			Email:       th.GenerateTestEmail(),
			Type:        model.TeamOpen,
		})
		require.Nil(t, appErr)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		_, resp, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, team.Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
	t.Run("should return error with invalid user id", func(t *testing.T) {
		_, resp, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), "invalid_user_id", th.BasicTeam.Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error with invalid team id", func(t *testing.T) {
		_, resp, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, "invalid_team_id", "")
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error when user is not logged in", func(t *testing.T) {
		client := th.CreateClient()
		_, resp, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}
func TestGetCategoryOrderForTeamForUser(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	t.Run("should return category order when user has permission", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotNil(t, categories)
		require.Len(t, categories.Order, 3)
		order, _, err := th.Client.GetSidebarCategoryOrderForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotNil(t, order)
		require.Len(t, order, 3)
		require.ElementsMatch(t, categories.Order, order)
	})
	t.Run("should return error when user doesn't have permission", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		_, resp, err := client.GetSidebarCategoryOrderForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
	t.Run("should return error with invalid user id", func(t *testing.T) {
		_, resp, err := th.Client.GetSidebarCategoryOrderForTeamForUser(context.Background(), "invalid_user_id", th.BasicTeam.Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error with invalid team id", func(t *testing.T) {
		_, resp, err := th.Client.GetSidebarCategoryOrderForTeamForUser(context.Background(), th.BasicUser.Id, "invalid_team_id", "")
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error when user is not logged in", func(t *testing.T) {
		client := th.CreateClient()
		_, resp, err := client.GetSidebarCategoryOrderForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
	t.Run("should return error when user tries to get category order for a team they're not a member of", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		team, appErr := th.App.CreateTeam(th.Context, &model.Team{
			DisplayName: "Team for testing",
			Name:        "test-team-" + model.NewId(),
			Email:       th.GenerateTestEmail(),
			Type:        model.TeamOpen,
		})
		require.Nil(t, appErr)
		th.LinkUserToTeam(t, user, team)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		_, _, err = client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, team.Id, "")
		require.NoError(t, err)
		appErr = th.App.RemoveUserFromTeam(th.Context, team.Id, user.Id, th.SystemAdminUser.Id)
		require.Nil(t, appErr)
		_, resp, err := client.GetSidebarCategoryOrderForTeamForUser(context.Background(), user.Id, team.Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
}
func TestUpdateCategoryOrderForTeamForUser(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	t.Run("should update order", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		channelsCategory := categories.Categories[1]
		require.Equal(t, model.SidebarCategoryChannels, channelsCategory.Type)
		newOrder := []string{categories.Order[1], categories.Order[0], categories.Order[2]}
		updatedOrder, _, err := client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, newOrder)
		require.NoError(t, err)
		require.EqualValues(t, newOrder, updatedOrder)
		categories, _, err = client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.Len(t, categories.Categories, 3)
		require.Len(t, categories.Order, 3)
		require.EqualValues(t, newOrder, categories.Order)
	})
	t.Run("should return error when user doesn't have permission", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		newOrder := []string{categories.Order[1], categories.Order[0], categories.Order[2]}
		_, resp, err := client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, newOrder)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
	t.Run("should return error with invalid category id", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		newOrder := []string{categories.Order[0], "invalid_category_id", categories.Order[2]}
		_, resp, err := th.Client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, newOrder)
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
	t.Run("should return error with missing category", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		newOrder := []string{categories.Order[1], categories.Order[0]}
		_, resp, err := th.Client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, newOrder)
		require.Error(t, err)
		require.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})
	t.Run("should return error with invalid user id", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		newOrder := []string{categories.Order[1], categories.Order[0], categories.Order[2]}
		_, resp, err := th.Client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), "invalid_user_id", th.BasicTeam.Id, newOrder)
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error with invalid team id", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		newOrder := []string{categories.Order[1], categories.Order[0], categories.Order[2]}
		_, resp, err := th.Client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), th.BasicUser.Id, "invalid_team_id", newOrder)
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error when user is not logged in", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		client := th.CreateClient()
		newOrder := []string{categories.Order[1], categories.Order[0], categories.Order[2]}
		_, resp, err := client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, newOrder)
		require.Error(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
	t.Run("should not crash with null input", func(t *testing.T) {
		require.NotPanics(t, func() {
			user, client := setupUserForSubtest(t, th)
			payload := `null`
			route := fmt.Sprintf("/users/%s/teams/%s/channels/categories/order", user.Id, th.BasicTeam.Id)
			r, err := client.DoAPIPut(context.Background(), route, payload)
			require.Error(t, err)
			closeBody(r)
		})
	})
	t.Run("should return error when user tries to update category order for a team they're not a member of", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		team, appErr := th.App.CreateTeam(th.Context, &model.Team{
			DisplayName: "Team for testing",
			Name:        "test-team-" + model.NewId(),
			Email:       th.GenerateTestEmail(),
			Type:        model.TeamOpen,
		})
		require.Nil(t, appErr)
		th.LinkUserToTeam(t, user, team)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, team.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Order)
		appErr = th.App.RemoveUserFromTeam(th.Context, team.Id, user.Id, th.SystemAdminUser.Id)
		require.Nil(t, appErr)
		_, resp, err := client.UpdateSidebarCategoryOrderForTeamForUser(context.Background(), user.Id, team.Id, categories.Order)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
}
func TestGetCategoryForTeamForUser(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	t.Run("should return category when user has permission", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		category := categories.Categories[0]
		received, _, err := client.GetSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, category.Id, "")
		require.NoError(t, err)
		require.NotNil(t, received)
		require.Equal(t, category.Id, received.Id)
		require.Equal(t, category.DisplayName, received.DisplayName)
		require.Equal(t, category.Type, received.Type)
	})
	t.Run("should return error when user doesn't have permission", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		_, resp, err := client.GetSidebarCategoryForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, categories.Categories[0].Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
	t.Run("should return error with invalid user id", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		_, resp, err := th.Client.GetSidebarCategoryForTeamForUser(context.Background(), "invalid_user_id", th.BasicTeam.Id, categories.Categories[0].Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error with invalid team id", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		_, resp, err := th.Client.GetSidebarCategoryForTeamForUser(context.Background(), th.BasicUser.Id, "invalid_team_id", categories.Categories[0].Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error with invalid category id", func(t *testing.T) {
		_, resp, err := th.Client.GetSidebarCategoryForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "invalid_category_id", "")
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
	t.Run("should return error when user is not logged in", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		client := th.CreateClient()
		_, resp, err := client.GetSidebarCategoryForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, categories.Categories[0].Id, "")
		require.Error(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
	t.Run("should not crash with null input", func(t *testing.T) {
		require.NotPanics(t, func() {
			user, client := setupUserForSubtest(t, th)
			categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
			require.NoError(t, err)
			require.NotEmpty(t, categories.Categories)
			route := fmt.Sprintf("/users/%s/teams/%s/channels/categories/%s", user.Id, th.BasicTeam.Id, categories.Categories[0].Id)
			r, err := client.DoAPIGet(context.Background(), route, "")
			require.NoError(t, err)
			closeBody(r)
		})
	})
	t.Run("should return error when user tries to get category for a team they're not a member of", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		team, appErr := th.App.CreateTeam(th.Context, &model.Team{
			DisplayName: "Team for testing",
			Name:        "test-team-" + model.NewId(),
			Email:       th.GenerateTestEmail(),
			Type:        model.TeamOpen,
		})
		require.Nil(t, appErr)
		th.LinkUserToTeam(t, user, team)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, team.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		categoryID := categories.Categories[0].Id
		appErr = th.App.RemoveUserFromTeam(th.Context, team.Id, user.Id, th.SystemAdminUser.Id)
		require.Nil(t, appErr)
		_, resp, err := client.GetSidebarCategoryForTeamForUser(context.Background(), user.Id, team.Id, categoryID, "")
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
}
func TestValidateSidebarCategory(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	c := &Context{
		App:        th.App,
		AppContext: th.Context,
		Logger:     th.App.Log(),
	}
	t.Run("should validate category with valid channels", func(t *testing.T) {
		user, _ := setupUserForSubtest(t, th)
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId: user.Id,
				TeamId: th.BasicTeam.Id,
			},
			Channels: []string{th.BasicChannel.Id, th.BasicChannel2.Id},
		}
		err := validateSidebarCategory(c, th.BasicTeam.Id, user.Id, category)
		require.Nil(t, err)
		require.Len(t, category.Channels, 2)
		require.Contains(t, category.Channels, th.BasicChannel.Id)
		require.Contains(t, category.Channels, th.BasicChannel2.Id)
	})
	t.Run("should filter out invalid channel IDs", func(t *testing.T) {
		user, _ := setupUserForSubtest(t, th)
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId: user.Id,
				TeamId: th.BasicTeam.Id,
			},
			Channels: []string{th.BasicChannel.Id, "invalid_channel_id"},
		}
		err := validateSidebarCategory(c, th.BasicTeam.Id, user.Id, category)
		require.Nil(t, err)
		require.Len(t, category.Channels, 1)
		require.Contains(t, category.Channels, th.BasicChannel.Id)
		require.NotContains(t, category.Channels, "invalid_channel_id")
	})
	t.Run("should filter out channels user is not a member of", func(t *testing.T) {
		user, _ := setupUserForSubtest(t, th)
		channel, appErr := th.App.CreateChannel(th.Context, &model.Channel{
			TeamId:      th.BasicTeam.Id,
			Type:        model.ChannelTypeOpen,
			Name:        "testchannel",
			DisplayName: "Test Channel",
		}, false)
		require.Nil(t, appErr)
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId: user.Id,
				TeamId: th.BasicTeam.Id,
			},
			Channels: []string{th.BasicChannel.Id, channel.Id},
		}
		err := validateSidebarCategory(c, th.BasicTeam.Id, user.Id, category)
		require.Nil(t, err)
		require.Len(t, category.Channels, 1)
		require.Contains(t, category.Channels, th.BasicChannel.Id)
		require.NotContains(t, category.Channels, channel.Id)
	})
	t.Run("should return error with invalid team id", func(t *testing.T) {
		user, _ := setupUserForSubtest(t, th)
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId: user.Id,
				TeamId: "invalid_team_id",
			},
			Channels: []string{th.BasicChannel.Id},
		}
		err := validateSidebarCategory(c, "invalid_team_id", user.Id, category)
		require.NotNil(t, err)
		require.Equal(t, http.StatusBadRequest, err.StatusCode)
	})
	t.Run("should return error with invalid user id", func(t *testing.T) {
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId: "invalid_user_id",
				TeamId: th.BasicTeam.Id,
			},
			Channels: []string{th.BasicChannel.Id},
		}
		err := validateSidebarCategory(c, th.BasicTeam.Id, "invalid_user_id", category)
		require.NotNil(t, err)
		require.Equal(t, http.StatusBadRequest, err.StatusCode)
	})
	t.Run("should handle empty channel list", func(t *testing.T) {
		user, _ := setupUserForSubtest(t, th)
		category := &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId: user.Id,
				TeamId: th.BasicTeam.Id,
			},
			Channels: []string{},
		}
		err := validateSidebarCategory(c, th.BasicTeam.Id, user.Id, category)
		require.Nil(t, err)
		require.Empty(t, category.Channels)
	})
}
func TestValidateSidebarCategoryChannels(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	c := &Context{
		App:        th.App,
		AppContext: th.Context,
		Logger:     th.App.Log(),
	}
	t.Run("should filter valid channels", func(t *testing.T) {
		channelMap := channelListToMap(model.ChannelList{
			th.BasicChannel,
			th.BasicChannel2,
		})
		channelIds := []string{
			th.BasicChannel.Id,
			th.BasicChannel2.Id,
		}
		filtered := validateSidebarCategoryChannels(c, th.BasicUser.Id, channelIds, channelMap)
		require.Len(t, filtered, 2)
		require.ElementsMatch(t, channelIds, filtered)
	})
	t.Run("should filter out invalid channels", func(t *testing.T) {
		channelMap := channelListToMap(model.ChannelList{
			th.BasicChannel,
		})
		channelIds := []string{
			th.BasicChannel.Id,
			"invalid_channel_id",
		}
		filtered := validateSidebarCategoryChannels(c, th.BasicUser.Id, channelIds, channelMap)
		require.Len(t, filtered, 1)
		require.Contains(t, filtered, th.BasicChannel.Id)
		require.NotContains(t, filtered, "invalid_channel_id")
	})
	t.Run("should handle empty channel list", func(t *testing.T) {
		channelMap := channelListToMap(model.ChannelList{})
		channelIds := []string{th.BasicChannel.Id}
		filtered := validateSidebarCategoryChannels(c, th.BasicUser.Id, channelIds, channelMap)
		require.Empty(t, filtered)
	})
	t.Run("should handle empty channelIds", func(t *testing.T) {
		channelMap := channelListToMap(model.ChannelList{
			th.BasicChannel,
			th.BasicChannel2,
		})
		filtered := validateSidebarCategoryChannels(c, th.BasicUser.Id, []string{}, channelMap)
		require.Empty(t, filtered)
	})
	t.Run("should handle nil inputs", func(t *testing.T) {
		filtered := validateSidebarCategoryChannels(c, th.BasicUser.Id, nil, nil)
		require.Empty(t, filtered)
	})
	t.Run("should prevent duplicate channel IDs", func(t *testing.T) {
		channelMap := channelListToMap(model.ChannelList{
			th.BasicChannel,
		})
		channelIds := []string{
			th.BasicChannel.Id,
			th.BasicChannel.Id,
		}
		filtered := validateSidebarCategoryChannels(c, th.BasicUser.Id, channelIds, channelMap)
		require.Len(t, filtered, 1)
		require.Equal(t, []string{th.BasicChannel.Id}, filtered)
	})
}
func TestDeleteCategoryForTeamForUser(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	t.Run("should move channels to default categories when custom category is deleted", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		customCategory, _, err := client.CreateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      user.Id,
				TeamId:      th.BasicTeam.Id,
				DisplayName: "Custom Category",
				Type:        model.SidebarCategoryCustom,
			},
			Channels: []string{th.BasicChannel.Id, th.BasicPrivateChannel.Id},
		})
		require.NoError(t, err)
		require.NotNil(t, customCategory)
		dmChannel, _, err := client.CreateDirectChannel(context.Background(), user.Id, th.BasicUser2.Id)
		require.NoError(t, err)
		customCategory.Channels = append(customCategory.Channels, dmChannel.Id)
		updatedCategory, _, err := client.UpdateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, customCategory.Id, customCategory)
		require.NoError(t, err)
		require.ElementsMatch(t, []string{th.BasicChannel.Id, th.BasicPrivateChannel.Id, dmChannel.Id}, updatedCategory.Channels)
		resp, err := client.DeleteSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, customCategory.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		var channelsCategory, dmsCategory *model.SidebarCategoryWithChannels
		for _, cat := range categories.Categories {
			switch cat.Type {
			case model.SidebarCategoryChannels:
				channelsCategory = cat
			case model.SidebarCategoryDirectMessages:
				dmsCategory = cat
			}
		}
		require.NotNil(t, channelsCategory, "Channels category should exist")
		require.NotNil(t, dmsCategory, "DMs category should exist")
		require.Contains(t, channelsCategory.Channels, th.BasicChannel.Id, "Public channel should be in channels category")
		require.Contains(t, channelsCategory.Channels, th.BasicPrivateChannel.Id, "Private channel should be in channels category")
		require.Contains(t, dmsCategory.Channels, dmChannel.Id, "DM should be in direct messages category")
	})
	t.Run("should delete category when user has permission", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		category, _, err := client.CreateSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      user.Id,
				TeamId:      th.BasicTeam.Id,
				DisplayName: "Custom Category",
				Type:        model.SidebarCategoryCustom,
			},
		})
		require.NoError(t, err)
		require.NotNil(t, category)
		resp, err := client.DeleteSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, category.Id)
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, resp.StatusCode)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		for _, cat := range categories.Categories {
			require.NotEqual(t, category.Id, cat.Id)
		}
	})
	t.Run("should return error when user doesn't have permission", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		resp, err := client.DeleteSidebarCategoryForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, categories.Categories[0].Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
	t.Run("should return error with invalid user id", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		resp, err := th.Client.DeleteSidebarCategoryForTeamForUser(context.Background(), "invalid_user_id", th.BasicTeam.Id, categories.Categories[0].Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error with invalid team id", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		resp, err := th.Client.DeleteSidebarCategoryForTeamForUser(context.Background(), th.BasicUser.Id, "invalid_team_id", categories.Categories[0].Id)
		require.Error(t, err)
		require.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
	t.Run("should return error with invalid category id", func(t *testing.T) {
		resp, err := th.Client.DeleteSidebarCategoryForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "invalid_category_id")
		require.Error(t, err)
		require.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
	t.Run("should return error when user is not logged in", func(t *testing.T) {
		categories, _, err := th.Client.GetSidebarCategoriesForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		client := th.CreateClient()
		resp, err := client.DeleteSidebarCategoryForTeamForUser(context.Background(), th.BasicUser.Id, th.BasicTeam.Id, categories.Categories[0].Id)
		require.Error(t, err)
		require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
	t.Run("should not allow deletion of default categories", func(t *testing.T) {
		user, client := setupUserForSubtest(t, th)
		categories, _, err := client.GetSidebarCategoriesForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, "")
		require.NoError(t, err)
		require.NotEmpty(t, categories.Categories)
		for _, category := range categories.Categories {
			if category.Type != model.SidebarCategoryCustom {
				resp, err := client.DeleteSidebarCategoryForTeamForUser(context.Background(), user.Id, th.BasicTeam.Id, category.Id)
				require.Error(t, err)
				require.Equal(t, http.StatusBadRequest, resp.StatusCode)
			}
		}
	})
	t.Run("should return error when user tries to delete a category for a team they're not a member of", func(t *testing.T) {
		user, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:    th.GenerateTestEmail(),
			Username: "user_" + model.NewId(),
			Password: "password",
		})
		require.Nil(t, appErr)
		team, appErr := th.App.CreateTeam(th.Context, &model.Team{
			DisplayName: "Team for testing",
			Name:        "test-team-" + model.NewId(),
			Email:       th.GenerateTestEmail(),
			Type:        model.TeamOpen,
		})
		require.Nil(t, appErr)
		th.LinkUserToTeam(t, user, team)
		client := th.CreateClient()
		_, _, err := client.Login(context.Background(), user.Email, "password")
		require.NoError(t, err)
		customCategory, _, err := client.CreateSidebarCategoryForTeamForUser(context.Background(), user.Id, team.Id, &model.SidebarCategoryWithChannels{
			SidebarCategory: model.SidebarCategory{
				UserId:      user.Id,
				TeamId:      team.Id,
				DisplayName: "Custom Category",
				Type:        model.SidebarCategoryCustom,
			},
		})
		require.NoError(t, err)
		require.NotNil(t, customCategory)
		appErr = th.App.RemoveUserFromTeam(th.Context, team.Id, user.Id, th.SystemAdminUser.Id)
		require.Nil(t, appErr)
		resp, err := client.DeleteSidebarCategoryForTeamForUser(context.Background(), user.Id, team.Id, customCategory.Id)
		require.Error(t, err)
		require.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
}
func setupUserForSubtest(t *testing.T, th *TestHelper) (*model.User, *model.Client4) {
	password := "password"
	user, appErr := th.App.CreateUser(th.Context, &model.User{
		Email:    th.GenerateTestEmail(),
		Username: "user_" + model.NewId(),
		Password: password,
	})
	require.Nil(t, appErr)
	th.LinkUserToTeam(t, user, th.BasicTeam)
	th.AddUserToChannel(t, user, th.BasicChannel)
	th.AddUserToChannel(t, user, th.BasicChannel2)
	th.AddUserToChannel(t, user, th.BasicPrivateChannel)
	client := th.CreateClient()
	user, _, err := client.Login(context.Background(), user.Email, password)
	require.NoError(t, err)
	return user, client
}