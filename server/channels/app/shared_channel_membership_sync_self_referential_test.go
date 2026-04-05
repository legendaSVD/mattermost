package app
import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"slices"
	"sync"
	"sync/atomic"
	"testing"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
	"github.com/mattermost/mattermost/server/v8/platform/services/sharedchannel"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestSharedChannelMembershipSyncSelfReferential(t *testing.T) {
	th := setupSharedChannels(t).InitBasic(t)
	ss := th.App.Srv().Store()
	scsInterface := th.App.Srv().GetSharedChannelSyncService()
	service, ok := scsInterface.(*sharedchannel.Service)
	require.True(t, ok, "Expected sharedchannel.Service concrete type")
	err := service.Start()
	require.NoError(t, err)
	require.Eventually(t, func() bool {
		return service.Active()
	}, 5*time.Second, 100*time.Millisecond, "SharedChannelService should be active")
	rcService := th.App.Srv().GetRemoteClusterService()
	if rcService != nil {
		_ = rcService.Start()
		if rc, ok := rcService.(*remotecluster.Service); ok {
			rc.SetActive(true)
		}
		require.Eventually(t, func() bool {
			return rcService.Active()
		}, 5*time.Second, 100*time.Millisecond, "RemoteClusterService should be active")
	}
	t.Run("Test 1: Automatic sync on membership changes", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncMessageCount int32
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			atomic.AddInt32(&syncMessageCount, 1)
			if syncHandler != nil {
				syncHandler.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer.Close()
		channel := th.CreateChannel(t, th.BasicTeam)
		sc := &model.SharedChannel{
			ChannelId: channel.Id,
			TeamId:    th.BasicTeam.Id,
			Home:      true,
			ShareName: "auto-sync-test",
			CreatorId: th.BasicUser.Id,
			RemoteId:  "",
		}
		_, shareErr := th.App.ShareChannel(th.Context, sc)
		require.NoError(t, shareErr)
		selfCluster := &model.RemoteCluster{
			RemoteId:    model.NewId(),
			Name:        "self-cluster",
			SiteURL:     testServer.URL,
			CreateAt:    model.GetMillis(),
			LastPingAt:  model.GetMillis(),
			Token:       model.NewId(),
			CreatorId:   th.BasicUser.Id,
			RemoteToken: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			RemoteId:          selfCluster.RemoteId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			LastMembersSyncAt: 0,
		}
		_, err = ss.SharedChannel().SaveRemote(scr)
		require.NoError(t, err)
		channel, appErr := th.App.GetChannel(th.Context, channel.Id)
		require.Nil(t, appErr)
		require.True(t, channel.IsShared(), "Channel should be marked as shared")
		user := th.CreateUser(t)
		_, _, appErr = th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, user.Id, th.BasicUser.Id)
		require.Nil(t, appErr)
		_, appErr = th.App.AddUserToChannel(th.Context, user, channel, false)
		require.Nil(t, appErr)
		require.Eventually(t, func() bool {
			_, memberErr := ss.Channel().GetMember(th.Context, channel.Id, user.Id)
			return memberErr == nil
		}, 5*time.Second, 100*time.Millisecond, "User should be locally added to channel")
		require.Eventually(t, func() bool {
			count := atomic.LoadInt32(&syncMessageCount)
			return count > 0
		}, 15*time.Second, 200*time.Millisecond, "Should have received at least one sync message via automatic sync")
		require.Eventually(t, func() bool {
			return !service.HasPendingTasksForTesting()
		}, 10*time.Second, 200*time.Millisecond, "All async sync tasks should be completed")
		member, memberErr := ss.Channel().GetMember(th.Context, channel.Id, user.Id)
		require.NoError(t, memberErr)
		require.Equal(t, user.Id, member.UserId)
		var initialCount int32
		require.Eventually(t, func() bool {
			initialCount = atomic.LoadInt32(&syncMessageCount)
			return !service.HasPendingTasksForTesting()
		}, 5*time.Second, 100*time.Millisecond, "Background tasks should settle before removal test")
		appErr = th.App.RemoveUserFromChannel(th.Context, user.Id, th.BasicUser.Id, channel)
		require.Nil(t, appErr)
		require.Eventually(t, func() bool {
			count := atomic.LoadInt32(&syncMessageCount)
			return count > initialCount
		}, 20*time.Second, 200*time.Millisecond, "Should have received sync message for user removal")
		require.Eventually(t, func() bool {
			return !service.HasPendingTasksForTesting()
		}, 15*time.Second, 200*time.Millisecond, "All async removal tasks should be completed")
		require.Eventually(t, func() bool {
			_, err = ss.Channel().GetMember(th.Context, channel.Id, user.Id)
			return err != nil
		}, 30*time.Second, 300*time.Millisecond, "User should not be a member after removal")
	})
	t.Run("Test 2: Batch membership sync with user type filtering", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var batchedUserIDs [][]string
		var mu sync.Mutex
		var selfCluster *model.RemoteCluster
		var syncCompleted atomic.Bool
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if syncHandler != nil {
				syncHandler.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer.Close()
		channel := th.CreateChannel(t, th.BasicTeam)
		selfCluster = &model.RemoteCluster{
			RemoteId:    model.NewId(),
			Name:        "self-cluster-batch",
			SiteURL:     testServer.URL,
			CreateAt:    model.GetMillis(),
			LastPingAt:  model.GetMillis(),
			Token:       model.NewId(),
			CreatorId:   th.BasicUser.Id,
			RemoteToken: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		batchSize := service.GetMemberSyncBatchSize()
		numRegularUsers := (batchSize * 2) + 5
		regularUserIDs := make([]string, numRegularUsers)
		for i := range numRegularUsers {
			user := th.CreateUser(t)
			regularUserIDs[i] = user.Id
			_, _, appErr := th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, user.Id, th.BasicUser.Id)
			require.Nil(t, appErr)
			_, appErr = th.App.AddUserToChannel(th.Context, user, channel, false)
			require.Nil(t, appErr)
		}
		bot := th.CreateBot(t)
		botUser, appErr := th.App.GetUser(bot.UserId)
		require.Nil(t, appErr)
		_, _, appErr = th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, bot.UserId, th.BasicUser.Id)
		require.Nil(t, appErr)
		_, appErr = th.App.AddUserToChannel(th.Context, botUser, channel, false)
		require.Nil(t, appErr)
		systemAdmin := th.CreateUser(t)
		_, _, appErr = th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, systemAdmin.Id, th.BasicUser.Id)
		require.Nil(t, appErr)
		_, appErr = th.App.UpdateUserRoles(th.Context, systemAdmin.Id, model.SystemAdminRoleId+" "+model.SystemUserRoleId, false)
		require.Nil(t, appErr)
		_, appErr = th.App.AddUserToChannel(th.Context, systemAdmin, channel, false)
		require.Nil(t, appErr)
		guest := th.CreateGuest(t)
		_, _, appErr = th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, guest.Id, th.BasicUser.Id)
		require.Nil(t, appErr)
		_, appErr = th.App.AddUserToChannel(th.Context, guest, channel, false)
		require.Nil(t, appErr)
		sc := &model.SharedChannel{
			ChannelId: channel.Id,
			TeamId:    th.BasicTeam.Id,
			Home:      true,
			ShareName: "batch-sync-test",
			CreatorId: th.BasicUser.Id,
			RemoteId:  "",
		}
		_, err = th.App.ShareChannel(th.Context, sc)
		require.NoError(t, err)
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			RemoteId:          selfCluster.RemoteId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			LastMembersSyncAt: 0,
		}
		_, err = ss.SharedChannel().SaveRemote(scr)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		expectedTotal := numRegularUsers + 1 + 1 + 1 + 1
		expectedBatches := (expectedTotal + batchSize - 1) / batchSize
		syncHandler.OnBatchSync = func(userIds []string, messageNumber int32) {
			mu.Lock()
			batchedUserIDs = append(batchedUserIDs, userIds)
			if len(batchedUserIDs) >= expectedBatches {
				syncCompleted.Store(true)
			}
			mu.Unlock()
		}
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			return syncCompleted.Load()
		}, 30*time.Second, 200*time.Millisecond, fmt.Sprintf("Should receive %d batch sync messages", expectedBatches))
		require.Eventually(t, func() bool {
			return !service.HasPendingTasksForTesting()
		}, 15*time.Second, 200*time.Millisecond, "All async tasks should be completed")
		require.Eventually(t, func() bool {
			updatedScr, getErr := ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
			return getErr == nil && updatedScr.LastMembersSyncAt > 0
		}, 20*time.Second, 200*time.Millisecond, "Cursor should be updated after batch sync")
		count := syncHandler.GetSyncMessageCount()
		assert.Greater(t, count, int32(0), "Should have received sync messages")
		mu.Lock()
		totalSynced := 0
		allSyncedUserIDs := make(map[string]bool)
		actualBatches := len(batchedUserIDs)
		for _, batch := range batchedUserIDs {
			totalSynced += len(batch)
			for _, userID := range batch {
				allSyncedUserIDs[userID] = true
			}
		}
		mu.Unlock()
		assert.GreaterOrEqual(t, actualBatches, expectedBatches, fmt.Sprintf("Should have at least %d batches with batch size %d", expectedBatches, batchSize))
		assert.GreaterOrEqual(t, totalSynced, expectedTotal, "All users including bots and system admins should be synced")
		assert.Contains(t, allSyncedUserIDs, bot.UserId, "Bot should be synced")
		assert.Contains(t, allSyncedUserIDs, systemAdmin.Id, "System admin should be synced")
		assert.Contains(t, allSyncedUserIDs, guest.Id, "Guest user should be synced")
		for _, regularUserID := range regularUserIDs {
			assert.Contains(t, allSyncedUserIDs, regularUserID, "Regular user should be synced")
		}
	})
	t.Run("Test 3: Cursor management", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncedInFirstCall []string
		var syncedInSecondCall []string
		var mu sync.Mutex
		var selfCluster *model.RemoteCluster
		var svc *sharedchannel.Service
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if syncHandler != nil {
				syncHandler.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer.Close()
		channel := th.CreateChannel(t, th.BasicTeam)
		sc := &model.SharedChannel{
			ChannelId: channel.Id,
			TeamId:    th.BasicTeam.Id,
			Home:      true,
			ShareName: "cursor-test",
			CreatorId: th.BasicUser.Id,
			RemoteId:  "",
		}
		_, shareErr := th.App.ShareChannel(th.Context, sc)
		require.NoError(t, shareErr)
		selfCluster = &model.RemoteCluster{
			RemoteId:    model.NewId(),
			Name:        "self-cluster-cursor",
			SiteURL:     testServer.URL,
			CreateAt:    model.GetMillis(),
			LastPingAt:  model.GetMillis(),
			Token:       model.NewId(),
			CreatorId:   th.BasicUser.Id,
			RemoteToken: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			RemoteId:          selfCluster.RemoteId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			LastMembersSyncAt: 0,
		}
		scr, err = ss.SharedChannel().SaveRemote(scr)
		require.NoError(t, err)
		channel, appErr := th.App.GetChannel(th.Context, channel.Id)
		require.Nil(t, appErr)
		require.True(t, channel.IsShared(), "Channel should be marked as shared")
		user1 := th.CreateUser(t)
		user2 := th.CreateUser(t)
		_, _, appErr = th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, user1.Id, th.BasicUser.Id)
		require.Nil(t, appErr)
		_, appErr = th.App.AddUserToChannel(th.Context, user1, channel, false)
		require.Nil(t, appErr)
		_, _, appErr = th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, user2.Id, th.BasicUser.Id)
		require.Nil(t, appErr)
		_, appErr = th.App.AddUserToChannel(th.Context, user2, channel, false)
		require.Nil(t, appErr)
		scsInterface := th.App.Srv().GetSharedChannelSyncService()
		var ok bool
		svc, ok = scsInterface.(*sharedchannel.Service)
		require.True(t, ok, "Expected sharedchannel.Service concrete type")
		err = svc.Start()
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, svc, selfCluster)
		syncHandler.OnIndividualSync = func(userId string, messageNumber int32) {
			mu.Lock()
			defer mu.Unlock()
			if messageNumber <= 2 {
				syncedInFirstCall = append(syncedInFirstCall, userId)
			} else {
				syncedInSecondCall = append(syncedInSecondCall, userId)
			}
		}
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			mu.Lock()
			defer mu.Unlock()
			return len(syncedInFirstCall) >= 2
		}, 10*time.Second, 100*time.Millisecond, "First sync should complete with initial users")
		var firstSyncCursor int64
		require.Eventually(t, func() bool {
			scr, err = ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
			if err != nil {
				return false
			}
			firstSyncCursor = scr.LastMembersSyncAt
			return firstSyncCursor > 0
		}, 10*time.Second, 100*time.Millisecond, "Cursor should be updated after first sync")
		user3 := th.CreateUser(t)
		_, _, appErr = th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, user3.Id, th.BasicUser.Id)
		require.Nil(t, appErr)
		_, appErr = th.App.AddUserToChannel(th.Context, user3, channel, false)
		require.Nil(t, appErr)
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			mu.Lock()
			defer mu.Unlock()
			return len(syncedInSecondCall) >= 1
		}, 10*time.Second, 100*time.Millisecond, "Second sync should complete with new user")
		var secondSyncCursor int64
		require.Eventually(t, func() bool {
			scr, err = ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
			if err != nil {
				return false
			}
			secondSyncCursor = scr.LastMembersSyncAt
			return secondSyncCursor > firstSyncCursor
		}, 10*time.Second, 100*time.Millisecond, "Cursor should advance after second sync")
		assert.GreaterOrEqual(t, len(syncedInFirstCall), 2, "First sync should include initial users")
		assert.Contains(t, syncedInSecondCall, user3.Id, "Second sync must include the new user")
	})
	t.Run("Test 4: Sync failure and recovery", func(t *testing.T) {
		t.Skip("MM-64687")
		EnsureCleanState(t, th, ss)
		var syncAttempts int32
		var failureMode atomic.Bool
		failureMode.Store(true)
		var successfulSyncs []string
		var selfCluster *model.RemoteCluster
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				atomic.AddInt32(&syncAttempts, 1)
				if failureMode.Load() {
					w.WriteHeader(http.StatusInternalServerError)
					_, _ = w.Write([]byte(`{"error":"simulated failure"}`))
					return
				}
				if syncHandler != nil {
					syncHandler.HandleRequest(w, r)
				} else {
					writeOKResponse(w)
				}
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer.Close()
		channel := th.CreateChannel(t, th.BasicTeam)
		sc := &model.SharedChannel{
			ChannelId: channel.Id,
			TeamId:    th.BasicTeam.Id,
			Home:      true,
			ShareName: "failure-recovery-test",
			CreatorId: th.BasicUser.Id,
			RemoteId:  "",
		}
		_, shareErr := th.App.ShareChannel(th.Context, sc)
		require.NoError(t, shareErr)
		selfCluster = &model.RemoteCluster{
			RemoteId:    model.NewId(),
			Name:        "self-cluster-failure",
			SiteURL:     testServer.URL,
			CreateAt:    model.GetMillis(),
			LastPingAt:  model.GetMillis(),
			Token:       model.NewId(),
			CreatorId:   th.BasicUser.Id,
			RemoteToken: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			RemoteId:          selfCluster.RemoteId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			LastMembersSyncAt: 0,
		}
		_, err = ss.SharedChannel().SaveRemote(scr)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		syncHandler.OnBatchSync = func(userIds []string, messageNumber int32) {
			successfulSyncs = append(successfulSyncs, userIds...)
		}
		syncHandler.OnIndividualSync = func(userId string, messageNumber int32) {
			successfulSyncs = append(successfulSyncs, userId)
		}
		testUser := th.CreateUser(t)
		_, _, appErr := th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, testUser.Id, th.BasicUser.Id)
		require.Nil(t, appErr)
		_, appErr = th.App.AddUserToChannel(th.Context, testUser, channel, false)
		require.Nil(t, appErr)
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			attempts := atomic.LoadInt32(&syncAttempts)
			return attempts > 0
		}, 15*time.Second, 100*time.Millisecond, "Should have attempted sync during failure mode")
		initialAttempts := atomic.LoadInt32(&syncAttempts)
		assert.Greater(t, initialAttempts, int32(0), "Should have attempted sync")
		assert.Empty(t, successfulSyncs, "No successful syncs during failure mode")
		failureMode.Store(false)
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			return slices.Contains(successfulSyncs, testUser.Id)
		}, 15*time.Second, 100*time.Millisecond, "Should have successful sync after recovery")
		finalAttempts := atomic.LoadInt32(&syncAttempts)
		assert.Greater(t, finalAttempts, initialAttempts, "Should have retried after recovery")
	})
	t.Run("Test 5: Manual sync with cursor management", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var totalSyncMessages int32
		var addOperations int32
		var removeOperations int32
		var selfCluster *model.RemoteCluster
		syncHandler := &SelfReferentialSyncHandler{
			t:                t,
			service:          service,
			selfCluster:      nil,
			syncMessageCount: &totalSyncMessages,
		}
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				bodyBytes, _ := io.ReadAll(r.Body)
				var frame model.RemoteClusterFrame
				if json.Unmarshal(bodyBytes, &frame) == nil {
					var syncMsg model.SyncMsg
					if json.Unmarshal(frame.Msg.Payload, &syncMsg) == nil {
						for _, change := range syncMsg.MembershipChanges {
							if change.IsAdd {
								atomic.AddInt32(&addOperations, 1)
							} else {
								atomic.AddInt32(&removeOperations, 1)
							}
						}
					}
				}
				r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
				if selfCluster != nil {
					syncHandler.selfCluster = selfCluster
					syncHandler.HandleRequest(w, r)
					return
				}
			}
			writeOKResponse(w)
		}))
		defer testServer.Close()
		channel := th.CreateChannel(t, th.BasicTeam)
		sc := &model.SharedChannel{
			ChannelId: channel.Id,
			TeamId:    th.BasicTeam.Id,
			Home:      true,
			ShareName: "full-sync-test",
			CreatorId: th.BasicUser.Id,
			RemoteId:  "",
		}
		_, shareErr := th.App.ShareChannel(th.Context, sc)
		require.NoError(t, shareErr)
		selfCluster = &model.RemoteCluster{
			RemoteId:    model.NewId(),
			Name:        "self-cluster-full",
			SiteURL:     testServer.URL,
			CreateAt:    model.GetMillis(),
			LastPingAt:  model.GetMillis(),
			Token:       model.NewId(),
			CreatorId:   th.BasicUser.Id,
			RemoteToken: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		syncHandler.selfCluster = selfCluster
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			RemoteId:          selfCluster.RemoteId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			LastMembersSyncAt: 0,
		}
		_, err = ss.SharedChannel().SaveRemote(scr)
		require.NoError(t, err)
		channel, appErr := th.App.GetChannel(th.Context, channel.Id)
		require.Nil(t, appErr)
		require.True(t, channel.IsShared(), "Channel should be marked as shared")
		initialUsers := make([]*model.User, 10)
		for i := range 10 {
			initialUsers[i] = th.CreateUser(t)
			_, _, appErr = th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, initialUsers[i].Id, th.BasicUser.Id)
			require.Nil(t, appErr)
			_, appErr = th.App.AddUserToChannel(th.Context, initialUsers[i], channel, false)
			require.Nil(t, appErr)
		}
		initialScr, scrErr := ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
		require.NoError(t, scrErr)
		initialCursor := initialScr.LastMembersSyncAt
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&addOperations) >= 10
		}, 10*time.Second, 100*time.Millisecond, "Should sync all initial users")
		initialAdds := atomic.LoadInt32(&addOperations)
		assert.GreaterOrEqual(t, initialAdds, int32(10), "Should sync all initial users")
		require.Eventually(t, func() bool {
			updatedScr, getErr := ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
			return getErr == nil && updatedScr.LastMembersSyncAt > initialCursor
		}, 10*time.Second, 100*time.Millisecond, "Cursor should be updated after initial sync")
		afterInitialScr, getErr := ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
		require.NoError(t, getErr)
		cursorAfterInitial := afterInitialScr.LastMembersSyncAt
		for i := range 3 {
			appErr := th.App.RemoveUserFromChannel(th.Context, initialUsers[i].Id, th.SystemAdminUser.Id, channel)
			require.Nil(t, appErr)
		}
		newUsers := make([]*model.User, 5)
		for i := range 5 {
			newUsers[i] = th.CreateUser(t)
			_, _, appErr := th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, newUsers[i].Id, th.BasicUser.Id)
			require.Nil(t, appErr)
			_, appErr = th.App.AddUserToChannel(th.Context, newUsers[i], channel, false)
			require.Nil(t, appErr)
		}
		previousMessages := atomic.LoadInt32(&totalSyncMessages)
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			messages := atomic.LoadInt32(&totalSyncMessages)
			removes := atomic.LoadInt32(&removeOperations)
			return messages > previousMessages && removes >= 3
		}, 10*time.Second, 100*time.Millisecond, "Should sync mixed changes")
		require.Eventually(t, func() bool {
			finalScr, finalErr := ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
			return finalErr == nil && finalScr.LastMembersSyncAt > cursorAfterInitial
		}, 10*time.Second, 100*time.Millisecond, "Cursor should be updated after mixed operations sync")
		members, membersErr := ss.Channel().GetMembers(model.ChannelMembersGetOptions{
			ChannelID: channel.Id,
			Limit:     100,
		})
		require.NoError(t, membersErr)
		expectedMembers := 10 - 3 + 5 + 1
		assert.Equal(t, expectedMembers, len(members), "Should have correct final member count")
		finalMessages := atomic.LoadInt32(&totalSyncMessages)
		finalAdds := atomic.LoadInt32(&addOperations)
		finalRemoves := atomic.LoadInt32(&removeOperations)
		assert.Greater(t, finalMessages, int32(0), "Should have sync messages")
		assert.Greater(t, finalAdds, int32(0), "Should have add operations")
		assert.GreaterOrEqual(t, finalRemoves, int32(3), "Should have remove operations")
	})
	t.Run("Test 6: Multiple remote clusters", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var totalSyncMessages int32
		var syncMessagesPerCluster = make(map[string]*int32)
		clusters := make([]*model.RemoteCluster, 3)
		testServers := make([]*httptest.Server, 3)
		syncHandlers := make([]*SelfReferentialSyncHandler, 3)
		for i := range 3 {
			clusterName := fmt.Sprintf("cluster-%d", i+1)
			var count int32
			syncMessagesPerCluster[clusterName] = &count
			syncHandlers[i] = &SelfReferentialSyncHandler{
				t:                t,
				service:          service,
				selfCluster:      nil,
				syncMessageCount: &totalSyncMessages,
			}
			idx := i
			testServers[i] = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/api/v4/remotecluster/msg" {
					clusterName := fmt.Sprintf("cluster-%d", idx+1)
					atomic.AddInt32(syncMessagesPerCluster[clusterName], 1)
					bodyBytes, readErr := io.ReadAll(r.Body)
					if readErr != nil {
						writeOKResponse(w)
						return
					}
					r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
					if clusters[idx] != nil {
						syncHandlers[idx].selfCluster = clusters[idx]
						syncHandlers[idx].HandleRequest(w, r)
						return
					}
				}
				writeOKResponse(w)
			}))
		}
		defer func() {
			for _, server := range testServers {
				server.Close()
			}
		}()
		team := th.CreateTeam(t)
		channel := &model.Channel{
			TeamId:      team.Id,
			Name:        "multi-cluster-test-channel",
			DisplayName: "Multi Cluster Test Channel",
			Type:        model.ChannelTypeOpen,
		}
		var appErr *model.AppError
		channel, appErr = th.App.CreateChannel(th.Context, channel, false)
		require.Nil(t, appErr)
		sc := &model.SharedChannel{
			ChannelId: channel.Id,
			TeamId:    team.Id,
			Home:      true,
			ShareName: "multi-cluster-test",
			CreatorId: th.BasicUser.Id,
			RemoteId:  "",
		}
		_, shareErr := th.App.ShareChannel(th.Context, sc)
		require.NoError(t, shareErr)
		for i := range 3 {
			clusters[i] = &model.RemoteCluster{
				RemoteId:    model.NewId(),
				Name:        fmt.Sprintf("cluster-%d", i+1),
				SiteURL:     testServers[i].URL,
				CreateAt:    model.GetMillis(),
				LastPingAt:  model.GetMillis(),
				Token:       model.NewId(),
				CreatorId:   th.BasicUser.Id,
				RemoteToken: model.NewId(),
			}
			clusters[i], err = ss.RemoteCluster().Save(clusters[i])
			require.NoError(t, err)
			scr := &model.SharedChannelRemote{
				Id:                model.NewId(),
				ChannelId:         channel.Id,
				CreatorId:         th.BasicUser.Id,
				RemoteId:          clusters[i].RemoteId,
				IsInviteAccepted:  true,
				IsInviteConfirmed: true,
				LastMembersSyncAt: 0,
			}
			_, err = ss.SharedChannel().SaveRemote(scr)
			require.NoError(t, err)
		}
		users := make([]*model.User, 5)
		for i := range 5 {
			users[i] = th.CreateUser(t)
			_, _, addErr := th.App.AddUserToTeam(th.Context, team.Id, users[i].Id, th.BasicUser.Id)
			require.Nil(t, addErr)
			_, addErr = th.App.AddUserToChannel(th.Context, users[i], channel, false)
			require.Nil(t, addErr)
		}
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			for _, countPtr := range syncMessagesPerCluster {
				if atomic.LoadInt32(countPtr) < 1 {
					return false
				}
			}
			return true
		}, 10*time.Second, 100*time.Millisecond, "All clusters should receive sync messages")
		for name, countPtr := range syncMessagesPerCluster {
			finalCount := atomic.LoadInt32(countPtr)
			assert.GreaterOrEqual(t, finalCount, int32(1),
				"Cluster %s should receive at least 1 sync message", name)
		}
		atomic.StoreInt32(&totalSyncMessages, 0)
		for _, countPtr := range syncMessagesPerCluster {
			atomic.StoreInt32(countPtr, 0)
		}
		userFromCluster2 := th.CreateUser(t)
		userFromCluster2.RemoteId = &clusters[1].RemoteId
		userFromCluster2, appErr = th.App.UpdateUser(th.Context, userFromCluster2, false)
		require.Nil(t, appErr)
		_, _, appErr = th.App.AddUserToTeam(th.Context, team.Id, userFromCluster2.Id, th.BasicUser.Id)
		require.Nil(t, appErr)
		syncMsg := model.NewSyncMsg(channel.Id)
		syncMsg.MembershipChanges = []*model.MembershipChangeMsg{
			{
				ChannelId:  channel.Id,
				UserId:     userFromCluster2.Id,
				IsAdd:      true,
				RemoteId:   clusters[1].RemoteId,
				ChangeTime: model.GetMillis(),
			},
		}
		payload, payloadErr := syncMsg.ToJSON()
		require.NoError(t, payloadErr)
		rcMsg := model.RemoteClusterMsg{
			Topic:   sharedchannel.TopicSync,
			Payload: payload,
		}
		response := &remotecluster.Response{}
		err = service.OnReceiveSyncMessageForTesting(rcMsg, clusters[1], response)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			count3 := atomic.LoadInt32(syncMessagesPerCluster["cluster-3"])
			return count3 >= 1
		}, 10*time.Second, 100*time.Millisecond, "Change should propagate to other clusters")
		member, memberErr := ss.Channel().GetMember(th.Context, channel.Id, userFromCluster2.Id)
		require.NoError(t, memberErr, "User should be a member after receiving sync from cluster-2")
		require.Equal(t, userFromCluster2.Id, member.UserId)
		finalCount3 := atomic.LoadInt32(syncMessagesPerCluster["cluster-3"])
		assert.GreaterOrEqual(t, finalCount3, int32(1),
			"cluster-3 should receive propagated sync from our server")
		atomic.StoreInt32(&totalSyncMessages, 0)
		for _, countPtr := range syncMessagesPerCluster {
			atomic.StoreInt32(countPtr, 0)
		}
		appErr = th.App.RemoveUserFromChannel(th.Context, users[0].Id, th.SystemAdminUser.Id, channel)
		require.Nil(t, appErr)
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			perCluster := make(map[string]int32)
			for name, countPtr := range syncMessagesPerCluster {
				perCluster[name] = atomic.LoadInt32(countPtr)
			}
			allClustersReceived := true
			for _, count := range perCluster {
				if count < 1 {
					allClustersReceived = false
					break
				}
			}
			return allClustersReceived
		}, 10*time.Second, 100*time.Millisecond, "All clusters should receive removal sync")
	})
	t.Run("Test 7: Feature flag disabled", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncMessageCount int32
		os.Setenv("MM_FEATUREFLAGS_ENABLESHAREDCHANNELMEMBERSYNC", "false")
		rErr := th.App.ReloadConfig()
		require.NoError(t, rErr)
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				atomic.AddInt32(&syncMessageCount, 1)
			}
			writeOKResponse(w)
		}))
		defer testServer.Close()
		channel := th.CreateChannel(t, th.BasicTeam)
		sc := &model.SharedChannel{
			ChannelId: channel.Id,
			TeamId:    th.BasicTeam.Id,
			Home:      true,
			ShareName: "feature-flag-test",
			CreatorId: th.BasicUser.Id,
			RemoteId:  "",
		}
		_, shareErr := th.App.ShareChannel(th.Context, sc)
		require.NoError(t, shareErr)
		selfCluster := &model.RemoteCluster{
			RemoteId:    model.NewId(),
			Name:        "self-cluster-flag-test",
			SiteURL:     testServer.URL,
			CreateAt:    model.GetMillis(),
			LastPingAt:  model.GetMillis(),
			Token:       model.NewId(),
			CreatorId:   th.BasicUser.Id,
			RemoteToken: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			RemoteId:          selfCluster.RemoteId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			LastMembersSyncAt: 0,
		}
		_, err = ss.SharedChannel().SaveRemote(scr)
		require.NoError(t, err)
		th.App.UpdateConfig(func(cfg *model.Config) {
			cfg.FeatureFlags.EnableSharedChannelsMemberSync = false
		})
		for range 3 {
			user := th.CreateUser(t)
			_, _, appErr := th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, user.Id, th.BasicUser.Id)
			require.Nil(t, appErr)
			_, appErr = th.App.AddUserToChannel(th.Context, user, channel, false)
			require.Nil(t, appErr)
		}
		atomic.StoreInt32(&syncMessageCount, 0)
		service.NotifyMembershipChanged(channel.Id, "")
		require.Never(t, func() bool {
			return atomic.LoadInt32(&syncMessageCount) > 0
		}, 2*time.Second, 100*time.Millisecond, "No sync should occur with feature flag disabled")
		th.App.UpdateConfig(func(cfg *model.Config) {
			cfg.FeatureFlags.EnableSharedChannelsMemberSync = true
		})
		atomic.StoreInt32(&syncMessageCount, 0)
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&syncMessageCount) > 0
		}, 5*time.Second, 100*time.Millisecond, "Sync should occur with feature flag enabled")
	})
	t.Run("Test 8: Sync Task After Connection Becomes Available", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncTaskCreated atomic.Bool
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if syncHandler != nil {
				syncHandler.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer.Close()
		channel := th.CreateChannel(t, th.BasicTeam)
		sc := &model.SharedChannel{
			ChannelId: channel.Id,
			TeamId:    th.BasicTeam.Id,
			Home:      true,
			ShareName: "reconnect-test",
			CreatorId: th.BasicUser.Id,
			RemoteId:  "",
		}
		_, shareErr := th.App.ShareChannel(th.Context, sc)
		require.NoError(t, shareErr)
		selfCluster := &model.RemoteCluster{
			RemoteId:    model.NewId(),
			Name:        "self-cluster-reconnect",
			SiteURL:     testServer.URL,
			CreateAt:    model.GetMillis() - 300000,
			LastPingAt:  model.GetMillis() - 120000,
			Token:       model.NewId(),
			CreatorId:   th.BasicUser.Id,
			RemoteToken: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			RemoteId:          selfCluster.RemoteId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			LastMembersSyncAt: 0,
		}
		_, err = ss.SharedChannel().SaveRemote(scr)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		syncHandler.OnBatchSync = func(userIds []string, messageNumber int32) {
			syncTaskCreated.Store(true)
		}
		for range 3 {
			user := th.CreateUser(t)
			_, _, appErr := th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, user.Id, th.BasicUser.Id)
			require.Nil(t, appErr)
			_, appErr = th.App.AddUserToChannel(th.Context, user, channel, false)
			require.Nil(t, appErr)
		}
		selfCluster.LastPingAt = model.GetMillis()
		_, err = ss.RemoteCluster().Update(selfCluster)
		require.NoError(t, err)
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			return syncTaskCreated.Load()
		}, 15*time.Second, 200*time.Millisecond, "Sync should execute when cluster comes back online")
		require.Eventually(t, func() bool {
			return !service.HasPendingTasksForTesting()
		}, 10*time.Second, 200*time.Millisecond, "All async sync tasks should be completed")
		require.Eventually(t, func() bool {
			updatedScr, scrErr := ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
			return scrErr == nil && updatedScr.LastMembersSyncAt > 0
		}, 20*time.Second, 200*time.Millisecond, "Cursor should be updated after sync")
	})
	t.Run("Test 9: Remote Cluster Offline During Sync", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncAttempts int32
		var serverOnline atomic.Bool
		serverOnline.Store(true)
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !serverOnline.Load() {
				w.WriteHeader(http.StatusServiceUnavailable)
				return
			}
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				currentAttempt := atomic.AddInt32(&syncAttempts, 1)
				if currentAttempt > 2 {
					serverOnline.Store(false)
					w.WriteHeader(http.StatusServiceUnavailable)
					return
				}
				if syncHandler != nil {
					syncHandler.HandleRequest(w, r)
					return
				}
			}
			writeOKResponse(w)
		}))
		defer testServer.Close()
		channel := th.CreateChannel(t, th.BasicTeam)
		sc := &model.SharedChannel{
			ChannelId: channel.Id,
			TeamId:    th.BasicTeam.Id,
			Home:      true,
			ShareName: "offline-test",
			CreatorId: th.BasicUser.Id,
			RemoteId:  "",
		}
		_, shareErr := th.App.ShareChannel(th.Context, sc)
		require.NoError(t, shareErr)
		selfCluster := &model.RemoteCluster{
			RemoteId:    model.NewId(),
			Name:        "self-cluster-offline",
			SiteURL:     testServer.URL,
			CreateAt:    model.GetMillis(),
			LastPingAt:  model.GetMillis(),
			Token:       model.NewId(),
			CreatorId:   th.BasicUser.Id,
			RemoteToken: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			RemoteId:          selfCluster.RemoteId,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			LastMembersSyncAt: 0,
		}
		_, err = ss.SharedChannel().SaveRemote(scr)
		require.NoError(t, err)
		for range 25 {
			user := th.CreateUser(t)
			_, _, appErr := th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, user.Id, th.BasicUser.Id)
			require.Nil(t, appErr)
			_, appErr = th.App.AddUserToChannel(th.Context, user, channel, false)
			require.Nil(t, appErr)
		}
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&syncAttempts) >= 1
		}, 15*time.Second, 200*time.Millisecond, "Should complete first sync")
		var firstCursor int64
		require.Eventually(t, func() bool {
			scr1, scrErr := ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
			if scrErr != nil {
				return false
			}
			firstCursor = scr1.LastMembersSyncAt
			return firstCursor > 0
		}, 10*time.Second, 200*time.Millisecond, "Cursor should be set after first sync")
		for range 5 {
			user := th.CreateUser(t)
			_, _, appErr := th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, user.Id, th.BasicUser.Id)
			require.Nil(t, appErr)
			_, appErr = th.App.AddUserToChannel(th.Context, user, channel, false)
			require.Nil(t, appErr)
		}
		service.NotifyMembershipChanged(channel.Id, "")
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&syncAttempts) >= 2
		}, 20*time.Second, 200*time.Millisecond, "Should attempt second sync")
		require.Never(t, func() bool {
			scr2, scrErr := ss.SharedChannel().GetRemoteByIds(channel.Id, selfCluster.RemoteId)
			if scrErr != nil {
				return false
			}
			return scr2.LastMembersSyncAt > firstCursor
		}, 5*time.Second, 200*time.Millisecond, "Cursor should not update when sync fails")
	})
	t.Run("Test 10: Users in Multiple Shared Channels", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncedChannelUsers = make(map[string][]string)
		var mu sync.Mutex
		var syncHandler *SelfReferentialSyncHandler
		var testServer *httptest.Server
		var totalSyncMessages int32
		user1 := th.CreateUser(t)
		user2 := th.CreateUser(t)
		user3 := th.CreateUser(t)
		th.LinkUserToTeam(t, user1, th.BasicTeam)
		th.LinkUserToTeam(t, user2, th.BasicTeam)
		th.LinkUserToTeam(t, user3, th.BasicTeam)
		channel1 := th.CreateChannel(t, th.BasicTeam)
		channel2 := th.CreateChannel(t, th.BasicTeam)
		channel3 := th.CreateChannel(t, th.BasicTeam)
		th.AddUserToChannel(t, user1, channel1)
		th.AddUserToChannel(t, user1, channel2)
		th.AddUserToChannel(t, user1, channel3)
		th.AddUserToChannel(t, user2, channel1)
		th.AddUserToChannel(t, user2, channel2)
		th.AddUserToChannel(t, user3, channel3)
		selfCluster := &model.RemoteCluster{
			RemoteId:    model.NewId(),
			Name:        "self-cluster-multi-channel",
			SiteURL:     "http://placeholder",
			CreateAt:    model.GetMillis(),
			LastPingAt:  model.GetMillis(),
			Token:       model.NewId(),
			CreatorId:   th.BasicUser.Id,
			RemoteToken: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		testServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				bodyBytes, pErr := io.ReadAll(r.Body)
				if pErr == nil {
					r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
					var frame model.RemoteClusterFrame
					if json.Unmarshal(bodyBytes, &frame) == nil {
						var syncMsg model.SyncMsg
						if json.Unmarshal(frame.Msg.Payload, &syncMsg) == nil {
							mu.Lock()
							channelId := syncMsg.ChannelId
							if channelId != "" {
								if _, ok := syncedChannelUsers[channelId]; !ok {
									syncedChannelUsers[channelId] = []string{}
								}
								for _, change := range syncMsg.MembershipChanges {
									if change.IsAdd {
										syncedChannelUsers[channelId] = append(syncedChannelUsers[channelId], change.UserId)
										atomic.AddInt32(&totalSyncMessages, 1)
									}
								}
							}
							mu.Unlock()
						}
					}
				}
			}
			syncHandler.HandleRequest(w, r)
		}))
		defer testServer.Close()
		selfCluster.SiteURL = testServer.URL
		_, err = ss.RemoteCluster().Update(selfCluster)
		require.NoError(t, err)
		for i, channel := range []*model.Channel{channel1, channel2, channel3} {
			sc := &model.SharedChannel{
				ChannelId: channel.Id,
				TeamId:    th.BasicTeam.Id,
				RemoteId:  selfCluster.RemoteId,
				Home:      true,
				ReadOnly:  false,
				ShareName: fmt.Sprintf("channel%d", i+1),
				CreatorId: th.BasicUser.Id,
			}
			_, err = ss.SharedChannel().Save(sc)
			require.NoError(t, err)
			scr := &model.SharedChannelRemote{
				Id:                model.NewId(),
				ChannelId:         channel.Id,
				CreatorId:         th.BasicUser.Id,
				RemoteId:          selfCluster.RemoteId,
				IsInviteAccepted:  true,
				IsInviteConfirmed: true,
				LastMembersSyncAt: 0,
			}
			_, err = ss.SharedChannel().SaveRemote(scr)
			require.NoError(t, err)
		}
		for _, channel := range []*model.Channel{channel1, channel2, channel3} {
			service.NotifyMembershipChanged(channel.Id, "")
		}
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&totalSyncMessages) > 0
		}, 10*time.Second, 50*time.Millisecond, "Expected at least one sync message to be sent")
		expectedSyncMessages := int32(9)
		require.Eventually(t, func() bool {
			currentMessages := atomic.LoadInt32(&totalSyncMessages)
			mu.Lock()
			channelCount := len(syncedChannelUsers)
			var totalUsers int
			for _, users := range syncedChannelUsers {
				totalUsers += len(users)
			}
			mu.Unlock()
			if currentMessages < expectedSyncMessages {
				t.Logf("Waiting for sync messages: %d/%d received, %d channels synced, %d total users",
					currentMessages, expectedSyncMessages, channelCount, totalUsers)
			}
			return currentMessages >= expectedSyncMessages
		}, 30*time.Second, 200*time.Millisecond,
			fmt.Sprintf("Expected %d sync messages, but got %d", expectedSyncMessages, atomic.LoadInt32(&totalSyncMessages)))
		require.Eventually(t, func() bool {
			mu.Lock()
			defer mu.Unlock()
			if len(syncedChannelUsers) != 3 {
				return false
			}
			channel1Users, ok1 := syncedChannelUsers[channel1.Id]
			channel2Users, ok2 := syncedChannelUsers[channel2.Id]
			channel3Users, ok3 := syncedChannelUsers[channel3.Id]
			if !ok1 || !ok2 || !ok3 {
				return false
			}
			channel1Count := len(getUniqueUsers(channel1Users))
			channel2Count := len(getUniqueUsers(channel2Users))
			channel3Count := len(getUniqueUsers(channel3Users))
			expectedCounts := channel1Count == 3 && channel2Count == 3 && channel3Count == 3
			if !expectedCounts {
				t.Logf("Channel user counts - channel1: %d, channel2: %d, channel3: %d",
					channel1Count, channel2Count, channel3Count)
			}
			return expectedCounts
		}, 30*time.Second, 200*time.Millisecond, "Expected all channels to have their users synced")
		mu.Lock()
		defer mu.Unlock()
		channel1Users := syncedChannelUsers[channel1.Id]
		userCount1 := make(map[string]int)
		for _, userId := range channel1Users {
			userCount1[userId]++
		}
		assert.Equal(t, 1, userCount1[user1.Id], "User1 should be synced exactly once for channel1")
		assert.Equal(t, 1, userCount1[user2.Id], "User2 should be synced exactly once for channel1")
		assert.Equal(t, 0, userCount1[user3.Id], "User3 should not be synced for channel1")
		channel2Users := syncedChannelUsers[channel2.Id]
		userCount2 := make(map[string]int)
		for _, userId := range channel2Users {
			userCount2[userId]++
		}
		assert.Equal(t, 1, userCount2[user1.Id], "User1 should be synced exactly once for channel2")
		assert.Equal(t, 1, userCount2[user2.Id], "User2 should be synced exactly once for channel2")
		assert.Equal(t, 0, userCount2[user3.Id], "User3 should not be synced for channel2")
		channel3Users := syncedChannelUsers[channel3.Id]
		userCount3 := make(map[string]int)
		for _, userId := range channel3Users {
			userCount3[userId]++
		}
		assert.Equal(t, 1, userCount3[user1.Id], "User1 should be synced exactly once for channel3")
		assert.Equal(t, 0, userCount3[user2.Id], "User2 should not be synced for channel3")
		assert.Equal(t, 1, userCount3[user3.Id], "User3 should be synced exactly once for channel3")
	})
}
func getUniqueUsers(users []string) map[string]bool {
	unique := make(map[string]bool)
	for _, user := range users {
		unique[user] = true
	}
	return unique
}