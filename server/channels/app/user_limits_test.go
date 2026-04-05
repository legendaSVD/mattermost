package app
import (
	"testing"
	"github.com/mattermost/mattermost/server/public/model"
	storemocks "github.com/mattermost/mattermost/server/v8/channels/store/storetest/mocks"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)
func TestUpdateActiveWithUserLimits(t *testing.T) {
	mainHelper.Parallel(t)
	t.Run("unlicensed server", func(t *testing.T) {
		t.Run("reactivation allowed below hard limit", func(t *testing.T) {
			th := Setup(t).InitBasic(t)
			th.App.Srv().SetLicense(nil)
			deactivatedUser, appErr := th.App.UpdateActive(th.Context, th.BasicUser, false)
			require.Nil(t, appErr)
			require.NotEqual(t, 0, deactivatedUser.DeleteAt)
			updatedUser, appErr := th.App.UpdateActive(th.Context, th.BasicUser, true)
			require.Nil(t, appErr)
			require.Equal(t, int64(0), updatedUser.DeleteAt)
		})
		t.Run("reactivation blocked at hard limit", func(t *testing.T) {
			th := SetupWithStoreMock(t)
			th.App.Srv().SetLicense(nil)
			mockUserStore := storemocks.UserStore{}
			mockUserStore.On("Count", mock.Anything).Return(int64(5000), nil)
			mockStore := th.App.Srv().Store().(*storemocks.Store)
			mockStore.On("User").Return(&mockUserStore)
			user := &model.User{
				Id:       model.NewId(),
				Email:    "test@example.com",
				Username: "testuser",
				DeleteAt: model.GetMillis(),
			}
			updatedUser, appErr := th.App.UpdateActive(th.Context, user, true)
			require.NotNil(t, appErr)
			require.Nil(t, updatedUser)
			require.Equal(t, "app.user.update_active.user_limit.exceeded", appErr.Id)
		})
		t.Run("reactivation blocked above hard limit", func(t *testing.T) {
			th := SetupWithStoreMock(t)
			th.App.Srv().SetLicense(nil)
			mockUserStore := storemocks.UserStore{}
			mockUserStore.On("Count", mock.Anything).Return(int64(6000), nil)
			mockStore := th.App.Srv().Store().(*storemocks.Store)
			mockStore.On("User").Return(&mockUserStore)
			user := &model.User{
				Id:       model.NewId(),
				Email:    "test@example.com",
				Username: "testuser",
				DeleteAt: model.GetMillis(),
			}
			updatedUser, appErr := th.App.UpdateActive(th.Context, user, true)
			require.NotNil(t, appErr)
			require.Nil(t, updatedUser)
			require.Equal(t, "app.user.update_active.user_limit.exceeded", appErr.Id)
		})
	})
	t.Run("licensed server with seat count enforcement", func(t *testing.T) {
		t.Run("reactivation allowed below limit", func(t *testing.T) {
			th := Setup(t).InitBasic(t)
			userLimit := 100
			license := model.NewTestLicense("")
			license.IsSeatCountEnforced = true
			license.Features.Users = &userLimit
			th.App.Srv().SetLicense(license)
			_, appErr := th.App.UpdateActive(th.Context, th.BasicUser, false)
			require.Nil(t, appErr)
			updatedUser, appErr := th.App.UpdateActive(th.Context, th.BasicUser, true)
			require.Nil(t, appErr)
			require.Equal(t, int64(0), updatedUser.DeleteAt)
		})
		t.Run("reactivation blocked at grace limit", func(t *testing.T) {
			th := SetupWithStoreMock(t)
			userLimit := 100
			license := model.NewTestLicense("")
			license.IsSeatCountEnforced = true
			license.Features.Users = &userLimit
			th.App.Srv().SetLicense(license)
			mockUserStore := storemocks.UserStore{}
			mockUserStore.On("Count", mock.Anything).Return(int64(105), nil)
			mockStore := th.App.Srv().Store().(*storemocks.Store)
			mockStore.On("User").Return(&mockUserStore)
			user := &model.User{
				Id:       model.NewId(),
				Email:    "test@example.com",
				Username: "testuser",
				DeleteAt: model.GetMillis(),
			}
			updatedUser, appErr := th.App.UpdateActive(th.Context, user, true)
			require.NotNil(t, appErr)
			require.Nil(t, updatedUser)
			require.Equal(t, "app.user.update_active.license_user_limit.exceeded", appErr.Id)
		})
		t.Run("reactivation allowed at base limit but below grace limit", func(t *testing.T) {
			th := Setup(t).InitBasic(t)
			userLimit := 5
			license := model.NewTestLicense("")
			license.IsSeatCountEnforced = true
			license.Features.Users = &userLimit
			th.App.Srv().SetLicense(license)
			th.CreateUser(t)
			th.CreateUser(t)
			_, appErr := th.App.UpdateActive(th.Context, th.BasicUser, false)
			require.Nil(t, appErr)
			updatedUser, appErr := th.App.UpdateActive(th.Context, th.BasicUser, true)
			require.Nil(t, appErr)
			require.Equal(t, int64(0), updatedUser.DeleteAt)
		})
		t.Run("reactivation blocked above grace limit", func(t *testing.T) {
			th := SetupWithStoreMock(t)
			userLimit := 100
			license := model.NewTestLicense("")
			license.IsSeatCountEnforced = true
			license.Features.Users = &userLimit
			th.App.Srv().SetLicense(license)
			mockUserStore := storemocks.UserStore{}
			mockUserStore.On("Count", mock.Anything).Return(int64(106), nil)
			mockStore := th.App.Srv().Store().(*storemocks.Store)
			mockStore.On("User").Return(&mockUserStore)
			user := &model.User{
				Id:       model.NewId(),
				Email:    "test@example.com",
				Username: "testuser",
				DeleteAt: model.GetMillis(),
			}
			updatedUser, appErr := th.App.UpdateActive(th.Context, user, true)
			require.NotNil(t, appErr)
			require.Nil(t, updatedUser)
			require.Equal(t, "app.user.update_active.license_user_limit.exceeded", appErr.Id)
		})
	})
	t.Run("licensed server without seat count enforcement", func(t *testing.T) {
		t.Run("reactivation allowed below unenforced limit", func(t *testing.T) {
			th := Setup(t).InitBasic(t)
			userLimit := 5
			license := model.NewTestLicense("")
			license.IsSeatCountEnforced = false
			license.Features.Users = &userLimit
			th.App.Srv().SetLicense(license)
			th.CreateUser(t)
			th.CreateUser(t)
			_, appErr := th.App.UpdateActive(th.Context, th.BasicUser, false)
			require.Nil(t, appErr)
			updatedUser, appErr := th.App.UpdateActive(th.Context, th.BasicUser, true)
			require.Nil(t, appErr)
			require.Equal(t, int64(0), updatedUser.DeleteAt)
		})
		t.Run("reactivation allowed at unenforced limit", func(t *testing.T) {
			th := Setup(t).InitBasic(t)
			userLimit := 5
			license := model.NewTestLicense("")
			license.IsSeatCountEnforced = false
			license.Features.Users = &userLimit
			th.App.Srv().SetLicense(license)
			th.CreateUser(t)
			th.CreateUser(t)
			th.CreateUser(t)
			th.CreateUser(t)
			testUser := th.CreateUser(t)
			_, appErr := th.App.UpdateActive(th.Context, testUser, false)
			require.Nil(t, appErr)
			updatedUser, appErr := th.App.UpdateActive(th.Context, testUser, true)
			require.Nil(t, appErr)
			require.Equal(t, int64(0), updatedUser.DeleteAt)
		})
		t.Run("reactivation allowed above unenforced limit", func(t *testing.T) {
			th := Setup(t).InitBasic(t)
			userLimit := 5
			license := model.NewTestLicense("")
			license.IsSeatCountEnforced = false
			license.Features.Users = &userLimit
			th.App.Srv().SetLicense(license)
			th.CreateUser(t)
			th.CreateUser(t)
			th.CreateUser(t)
			th.CreateUser(t)
			th.CreateUser(t)
			testUser := th.CreateUser(t)
			_, appErr := th.App.UpdateActive(th.Context, testUser, false)
			require.Nil(t, appErr)
			updatedUser, appErr := th.App.UpdateActive(th.Context, testUser, true)
			require.Nil(t, appErr)
			require.Equal(t, int64(0), updatedUser.DeleteAt)
		})
	})
}
func TestCreateUserOrGuestSeatCountEnforcement(t *testing.T) {
	mainHelper.Parallel(t)
	t.Run("seat count enforced - allows user creation when under limit", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		userLimit := 5
		license := model.NewTestLicense("")
		license.IsSeatCountEnforced = true
		license.Features.Users = &userLimit
		th.App.Srv().SetLicense(license)
		user := &model.User{
			Email:         "TestCreateUserOrGuest@example.com",
			Username:      "username_123",
			Password:      "Password1",
			EmailVerified: true,
		}
		createdUser, appErr := th.App.createUserOrGuest(th.Context, user, false)
		require.Nil(t, appErr)
		require.NotNil(t, createdUser)
		require.Equal(t, "username_123", createdUser.Username)
	})
	t.Run("seat count enforced - blocks user creation when at limit", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		userLimit := 5
		extraUsers := 1
		license := model.NewTestLicense("")
		license.IsSeatCountEnforced = true
		license.Features.Users = &userLimit
		license.ExtraUsers = &extraUsers
		th.App.Srv().SetLicense(license)
		th.CreateUser(t)
		th.CreateUser(t)
		th.CreateUser(t)
		user := &model.User{
			Email:         "TestSeatCount@example.com",
			Username:      "seat_test_user",
			Password:      "Password1",
			EmailVerified: true,
		}
		createdUser, appErr := th.App.createUserOrGuest(th.Context, user, false)
		require.NotNil(t, appErr)
		require.Nil(t, createdUser)
		require.Equal(t, "api.user.create_user.license_user_limits.exceeded", appErr.Id)
	})
	t.Run("seat count enforced - blocks user creation when over limit", func(t *testing.T) {
		th := SetupWithStoreMock(t)
		userLimit := 5
		extraUsers := 0
		currentUserCount := int64(6)
		mockUserStore := storemocks.UserStore{}
		mockUserStore.On("Count", mock.Anything).Return(currentUserCount, nil)
		mockUserStore.On("IsEmpty", true).Return(false, nil)
		mockGroupStore := storemocks.GroupStore{}
		mockGroupStore.On("GetByName", "seat_test_user", mock.Anything).Return(nil, nil)
		mockStore := th.App.Srv().Store().(*storemocks.Store)
		mockStore.On("User").Return(&mockUserStore)
		mockStore.On("Group").Return(&mockGroupStore)
		license := model.NewTestLicense("")
		license.IsSeatCountEnforced = true
		license.Features.Users = &userLimit
		license.ExtraUsers = &extraUsers
		th.App.Srv().SetLicense(license)
		user := &model.User{
			Email:         "TestSeatCount@example.com",
			Username:      "seat_test_user",
			Password:      "Password1",
			EmailVerified: true,
		}
		createdUser, appErr := th.App.createUserOrGuest(th.Context, user, false)
		require.NotNil(t, appErr)
		require.Nil(t, createdUser)
		require.Equal(t, "api.user.create_user.license_user_limits.exceeded", appErr.Id)
	})
	t.Run("seat count not enforced - allows user creation even when over limit", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		userLimit := 5
		license := model.NewTestLicense("")
		license.IsSeatCountEnforced = false
		license.Features.Users = &userLimit
		th.App.Srv().SetLicense(license)
		th.CreateUser(t)
		th.CreateUser(t)
		th.CreateUser(t)
		user := &model.User{
			Email:         "TestSeatCount@example.com",
			Username:      "seat_test_user",
			Password:      "Password1",
			EmailVerified: true,
		}
		createdUser, appErr := th.App.createUserOrGuest(th.Context, user, false)
		require.Nil(t, appErr)
		require.NotNil(t, createdUser)
		require.Equal(t, "seat_test_user", createdUser.Username)
	})
	t.Run("no license - uses existing hard limit logic", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		th.App.Srv().SetLicense(nil)
		user := &model.User{
			Email:         "TestSeatCount@example.com",
			Username:      "seat_test_user",
			Password:      "Password1",
			EmailVerified: true,
		}
		createdUser, appErr := th.App.createUserOrGuest(th.Context, user, false)
		require.Nil(t, appErr)
		require.NotNil(t, createdUser)
		require.Equal(t, "seat_test_user", createdUser.Username)
	})
	t.Run("license without Users feature - no seat count enforcement", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		license := model.NewTestLicense("")
		license.IsSeatCountEnforced = true
		license.Features.Users = nil
		th.App.Srv().SetLicense(license)
		user := &model.User{
			Email:         "TestSeatCount@example.com",
			Username:      "seat_test_user",
			Password:      "Password1",
			EmailVerified: true,
		}
		createdUser, appErr := th.App.createUserOrGuest(th.Context, user, false)
		require.Nil(t, appErr)
		require.NotNil(t, createdUser)
		require.Equal(t, "seat_test_user", createdUser.Username)
	})
	t.Run("guest creation with seat count enforcement - blocks when at limit", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		userLimit := 5
		extraUsers := 1
		license := model.NewTestLicense("")
		license.IsSeatCountEnforced = true
		license.Features.Users = &userLimit
		license.ExtraUsers = &extraUsers
		th.App.Srv().SetLicense(license)
		th.CreateUser(t)
		th.CreateUser(t)
		th.CreateUser(t)
		user := &model.User{
			Email:         "TestSeatCountGuest@example.com",
			Username:      "seat_test_guest",
			Password:      "Password1",
			EmailVerified: true,
		}
		createdUser, appErr := th.App.createUserOrGuest(th.Context, user, true)
		require.NotNil(t, appErr)
		require.Nil(t, createdUser)
		require.Equal(t, "api.user.create_user.license_user_limits.exceeded", appErr.Id)
	})
	t.Run("guest creation with seat count enforcement - allows when under limit", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		userLimit := 5
		extraUsers := 0
		license := model.NewTestLicense("")
		license.IsSeatCountEnforced = true
		license.Features.Users = &userLimit
		license.ExtraUsers = &extraUsers
		th.App.Srv().SetLicense(license)
		user := &model.User{
			Email:         "TestSeatCountGuest@example.com",
			Username:      "seat_test_guest",
			Password:      "Password1",
			EmailVerified: true,
		}
		createdUser, appErr := th.App.createUserOrGuest(th.Context, user, true)
		require.Nil(t, appErr)
		require.NotNil(t, createdUser)
		require.Equal(t, "seat_test_guest", createdUser.Username)
	})
}