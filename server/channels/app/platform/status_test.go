package platform
import (
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
)
func TestSaveStatus(t *testing.T) {
	th := Setup(t).InitBasic(t)
	user := th.BasicUser
	for _, statusString := range []string{
		model.StatusOnline,
		model.StatusAway,
		model.StatusDnd,
		model.StatusOffline,
	} {
		t.Run(statusString, func(t *testing.T) {
			status := &model.Status{
				UserId: user.Id,
				Status: statusString,
			}
			th.Service.SaveAndBroadcastStatus(status)
			after, err := th.Service.GetStatus(user.Id)
			require.Nil(t, err, "failed to get status after save: %v", err)
			require.Equal(t, statusString, after.Status, "failed to save status, got %v, expected %v", after.Status, statusString)
		})
	}
}
func TestTruncateDNDEndTime(t *testing.T) {
	assert.Equal(t, int64(1737393180), truncateDNDEndTime(1737393212))
	assert.Equal(t, int64(1737393180), truncateDNDEndTime(1737393180))
	assert.Equal(t, int64(1737331200), truncateDNDEndTime(1737331210))
	assert.Equal(t, int64(1737331200), truncateDNDEndTime(1737331200))
}
func TestQueueSetStatusOffline(t *testing.T) {
	th := Setup(t).InitBasic(t)
	userIDs := []string{
		th.BasicUser.Id,
		model.NewId(),
		model.NewId(),
		model.NewId(),
	}
	userIDs = append(userIDs, userIDs[0], userIDs[1])
	for _, userID := range userIDs {
		th.Service.SetStatusOnline(userID, false)
		status, err := th.Service.GetStatus(userID)
		require.Nil(t, err, "Failed to get initial status")
		require.Equal(t, model.StatusOnline, status.Status, "User should be online initially")
	}
	for i, userID := range userIDs {
		manual := i%2 == 0
		th.Service.QueueSetStatusOffline(userID, manual)
	}
	for idx, userID := range userIDs {
		var status *model.Status
		var err *model.AppError
		require.Eventually(t, func() bool {
			status, err = th.Service.GetStatus(userID)
			return err == nil && status.Status == model.StatusOffline
		}, 5*time.Second, 100*time.Millisecond, "Status wasn't updated to offline")
		switch idx {
		case 0, 4:
			require.True(t, status.Manual, "User should have manual status (duplicate case)")
		case 1, 5:
			require.False(t, status.Manual, "User should have automatic status (duplicate case)")
		default:
			require.Equal(t, idx%2 == 0, status.Manual, "Manual flag incorrect")
		}
	}
	for _, userID := range model.RemoveDuplicateStrings(userIDs) {
		status, err := th.Service.GetStatus(userID)
		require.Nil(t, err, "Failed to get status")
		require.Equal(t, model.StatusOffline, status.Status, "User should be offline")
		require.Equal(t, "", status.ActiveChannel, "ActiveChannel should be empty")
	}
	th.Shutdown(t)
	select {
	case _, ok := <-th.Service.statusUpdateDoneSignal:
		assert.False(t, ok, "statusUpdateDoneSignal channel should be closed after teardown")
	case <-time.After(5 * time.Second):
		require.Fail(t, "Timed out waiting for status update processor to shut down")
	}
}
func TestSetStatusOffline(t *testing.T) {
	th := Setup(t).InitBasic(t)
	user := th.BasicUser
	t.Run("when user statuses are disabled", func(t *testing.T) {
		th.Service.UpdateConfig(func(cfg *model.Config) {
			*cfg.ServiceSettings.EnableUserStatuses = false
		})
		status := &model.Status{
			UserId: user.Id,
			Status: model.StatusOnline,
		}
		th.Service.SaveAndBroadcastStatus(status)
		th.Service.SetStatusOffline(user.Id, false, false)
		th.Service.UpdateConfig(func(cfg *model.Config) {
			*cfg.ServiceSettings.EnableUserStatuses = true
		})
		after, err := th.Service.GetStatus(user.Id)
		require.Nil(t, err)
		assert.Equal(t, model.StatusOnline, after.Status)
	})
	t.Run("when setting status manually over manually set status", func(t *testing.T) {
		th.Service.UpdateConfig(func(cfg *model.Config) {
			*cfg.ServiceSettings.EnableUserStatuses = true
		})
		status := &model.Status{
			UserId: user.Id,
			Status: model.StatusOnline,
			Manual: true,
		}
		th.Service.SaveAndBroadcastStatus(status)
		th.Service.SetStatusOffline(user.Id, false, false)
		after, err := th.Service.GetStatus(user.Id)
		require.Nil(t, err)
		assert.Equal(t, model.StatusOnline, after.Status)
		assert.True(t, after.Manual)
	})
	t.Run("when force flag is true over manually set status", func(t *testing.T) {
		th.Service.UpdateConfig(func(cfg *model.Config) {
			*cfg.ServiceSettings.EnableUserStatuses = true
		})
		status := &model.Status{
			UserId: user.Id,
			Status: model.StatusOnline,
			Manual: true,
		}
		th.Service.SaveAndBroadcastStatus(status)
		th.Service.SetStatusOffline(user.Id, false, true)
		after, err := th.Service.GetStatus(user.Id)
		require.Nil(t, err)
		assert.Equal(t, model.StatusOffline, after.Status)
		assert.False(t, after.Manual)
	})
	t.Run("when setting status normally", func(t *testing.T) {
		th.Service.UpdateConfig(func(cfg *model.Config) {
			*cfg.ServiceSettings.EnableUserStatuses = true
		})
		status := &model.Status{
			UserId: user.Id,
			Status: model.StatusOnline,
			Manual: false,
		}
		th.Service.SaveAndBroadcastStatus(status)
		th.Service.SetStatusOffline(user.Id, false, false)
		after, err := th.Service.GetStatus(user.Id)
		require.Nil(t, err)
		assert.Equal(t, model.StatusOffline, after.Status)
		assert.False(t, after.Manual)
	})
	t.Run("when setting status manually over normal status", func(t *testing.T) {
		th.Service.UpdateConfig(func(cfg *model.Config) {
			*cfg.ServiceSettings.EnableUserStatuses = true
		})
		status := &model.Status{
			UserId: user.Id,
			Status: model.StatusOnline,
			Manual: false,
		}
		th.Service.SaveAndBroadcastStatus(status)
		th.Service.SetStatusOffline(user.Id, true, false)
		after, err := th.Service.GetStatus(user.Id)
		require.Nil(t, err)
		assert.Equal(t, model.StatusOffline, after.Status)
		assert.True(t, after.Manual)
	})
}