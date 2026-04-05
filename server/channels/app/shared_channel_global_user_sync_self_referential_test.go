package app
import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"sync"
	"sync/atomic"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
	"github.com/mattermost/mattermost/server/v8/platform/services/sharedchannel"
)
func TestSharedChannelGlobalUserSyncSelfReferential(t *testing.T) {
	th := SetupConfig(t, func(cfg *model.Config) {
		*cfg.ConnectedWorkspacesSettings.EnableRemoteClusterService = true
		*cfg.ConnectedWorkspacesSettings.EnableSharedChannels = true
		*cfg.ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen = true
		defaultBatchSize := 20
		cfg.ConnectedWorkspacesSettings.GlobalUserSyncBatchSize = &defaultBatchSize
		cfg.FeatureFlags.EnableSyncAllUsersForRemoteCluster = true
	}).InitBasic(t)
	ss := th.App.Srv().Store()
	scsInterface := th.App.Srv().GetSharedChannelSyncService()
	service, ok := scsInterface.(*sharedchannel.Service)
	require.True(t, ok, "Expected sharedchannel.Service concrete type")
	require.True(t, service.Active(), "SharedChannel service should be active")
	err := service.Start()
	require.NoError(t, err)
	rcService := th.App.Srv().GetRemoteClusterService()
	if rcService != nil {
		_ = rcService.Start()
		if rc, ok := rcService.(*remotecluster.Service); ok {
			rc.SetActive(true)
		}
		if !rcService.Active() {
			t.Fatalf("RemoteClusterService is not active after Start")
		}
	}
	t.Run("Test 1: Individual User Sync", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncedUsers []string
		var mu sync.Mutex
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if syncHandler != nil {
				syncHandler.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer.Close()
		now := model.GetMillis()
		selfCluster := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster",
			SiteURL:              testServer.URL,
			CreateAt:             now,
			LastPingAt:           now,
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		syncHandler.OnGlobalUserSync = func(userIds []string, messageNumber int32) {
			mu.Lock()
			syncedUsers = append(syncedUsers, userIds...)
			mu.Unlock()
		}
		user := th.CreateUser(t)
		user.UpdateAt = model.GetMillis()
		_, err = ss.User().Update(th.Context, user, true)
		require.NoError(t, err)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			count := syncHandler.GetSyncMessageCount()
			mu.Lock()
			defer mu.Unlock()
			return count > 0
		}, 5*time.Second, 100*time.Millisecond, "Should have received at least one sync message")
		mu.Lock()
		assert.Contains(t, syncedUsers, user.Id, "New user should be synced")
		mu.Unlock()
		updatedCluster, clusterErr := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, clusterErr)
		assert.Greater(t, updatedCluster.LastGlobalUserSyncAt, int64(0), "Cursor should be updated after sync")
	})
	t.Run("Test 2: Batch User Sync with Type Filtering", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		batchSize := 4
		th.App.UpdateConfig(func(cfg *model.Config) {
			cfg.ConnectedWorkspacesSettings.GlobalUserSyncBatchSize = &batchSize
		})
		var mu sync.Mutex
		var batchedUserIDs [][]string
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if syncHandler != nil {
				syncHandler.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer.Close()
		selfCluster := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster-batch",
			SiteURL:              testServer.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		baseTime := model.GetMillis()
		userWithOldTimestamp := th.CreateUser(t)
		userWithOldTimestamp.UpdateAt = 1
		_, err = ss.User().Update(th.Context, userWithOldTimestamp, false)
		require.NoError(t, err)
		verifiedUser, pErr := ss.User().Get(context.Background(), userWithOldTimestamp.Id)
		require.NoError(t, pErr)
		userWithOldTimestamp = verifiedUser
		regularUsers := make([]*model.User, 3)
		for i := range 3 {
			regularUsers[i] = th.CreateUser(t)
			regularUsers[i].UpdateAt = baseTime + int64(i*100)
			_, err = ss.User().Update(th.Context, regularUsers[i], true)
			require.NoError(t, err)
		}
		bot := th.CreateBot(t)
		botUser, appErr := th.App.GetUser(bot.UserId)
		require.Nil(t, appErr)
		botUser.UpdateAt = baseTime + 300
		_, err = ss.User().Update(th.Context, botUser, true)
		require.NoError(t, err)
		systemAdmin := th.CreateUser(t)
		_, appErr = th.App.UpdateUserRoles(th.Context, systemAdmin.Id, model.SystemAdminRoleId+" "+model.SystemUserRoleId, false)
		require.Nil(t, appErr)
		systemAdmin.UpdateAt = baseTime + 400
		_, err = ss.User().Update(th.Context, systemAdmin, true)
		require.NoError(t, err)
		guest := th.CreateGuest(t)
		guest.UpdateAt = baseTime + 500
		_, err = ss.User().Update(th.Context, guest, true)
		require.NoError(t, err)
		remoteUser := th.CreateUser(t)
		remoteUser.RemoteId = &selfCluster.RemoteId
		remoteUser.UpdateAt = baseTime + 600
		_, err = ss.User().Update(th.Context, remoteUser, true)
		require.NoError(t, err)
		inactiveUser := th.CreateUser(t)
		inactiveUser.UpdateAt = baseTime + 700
		inactiveUser.DeleteAt = model.GetMillis()
		_, err = ss.User().Update(th.Context, inactiveUser, true)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		syncHandler.OnGlobalUserSync = func(userIds []string, messageNumber int32) {
			mu.Lock()
			batchedUserIDs = append(batchedUserIDs, userIds)
			mu.Unlock()
		}
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			mu.Lock()
			defer mu.Unlock()
			allSyncedUserIDs := make(map[string]bool)
			for _, batch := range batchedUserIDs {
				for _, userID := range batch {
					allSyncedUserIDs[userID] = true
				}
			}
			guestSynced := allSyncedUserIDs[guest.Id]
			botSynced := allSyncedUserIDs[bot.UserId]
			systemAdminSynced := allSyncedUserIDs[systemAdmin.Id]
			userWithOldTimestampSynced := allSyncedUserIDs[userWithOldTimestamp.Id]
			remoteUserNotSynced := !allSyncedUserIDs[remoteUser.Id]
			inactiveUserNotSynced := !allSyncedUserIDs[inactiveUser.Id]
			return guestSynced && botSynced && systemAdminSynced && userWithOldTimestampSynced &&
				remoteUserNotSynced && inactiveUserNotSynced
		}, 10*time.Second, 500*time.Millisecond, "Should sync expected users")
		mu.Lock()
		defer mu.Unlock()
		allSyncedUserIDs := make(map[string]bool)
		for _, batch := range batchedUserIDs {
			assert.LessOrEqual(t, len(batch), batchSize, "Batch size should not exceed configured limit")
			for _, userID := range batch {
				allSyncedUserIDs[userID] = true
			}
		}
		assert.Contains(t, allSyncedUserIDs, bot.UserId, "Bot should be synced")
		assert.Contains(t, allSyncedUserIDs, systemAdmin.Id, "System admin should be synced")
		assert.Contains(t, allSyncedUserIDs, guest.Id, "Guest user should be synced")
		assert.Contains(t, allSyncedUserIDs, userWithOldTimestamp.Id, "User with old timestamp should be synced")
		assert.NotContains(t, allSyncedUserIDs, remoteUser.Id, "Remote user should NOT be synced")
		assert.NotContains(t, allSyncedUserIDs, inactiveUser.Id, "Inactive user should NOT be synced")
		for i, user := range regularUsers {
			assert.Contains(t, allSyncedUserIDs, user.Id, "Regular user %d should be synced", i+1)
		}
		updatedCluster, clusterErr := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, clusterErr)
		assert.Greater(t, updatedCluster.LastGlobalUserSyncAt, int64(0), "Cursor should be updated after batch sync")
	})
	t.Run("Test 3: Multiple Remote Clusters", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncMessagesPerCluster = make(map[string]*int32)
		var syncedUsersPerCluster = make(map[string][]string)
		var mu sync.Mutex
		clusters := make([]*model.RemoteCluster, 3)
		testServers := make([]*httptest.Server, 3)
		for i := range 3 {
			clusterName := fmt.Sprintf("cluster-%d", i+1)
			var count int32
			syncMessagesPerCluster[clusterName] = &count
			syncedUsersPerCluster[clusterName] = []string{}
			idx := i
			testServers[i] = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/api/v4/remotecluster/msg" {
					clusterName := fmt.Sprintf("cluster-%d", idx+1)
					atomic.AddInt32(syncMessagesPerCluster[clusterName], 1)
					bodyBytes, _ := io.ReadAll(r.Body)
					var frame model.RemoteClusterFrame
					if unmarshalErr := json.Unmarshal(bodyBytes, &frame); unmarshalErr == nil {
						var syncMsg model.SyncMsg
						if unmarshalErr := json.Unmarshal(frame.Msg.Payload, &syncMsg); unmarshalErr == nil {
							mu.Lock()
							for userID := range syncMsg.Users {
								syncedUsersPerCluster[clusterName] = append(syncedUsersPerCluster[clusterName], userID)
							}
							mu.Unlock()
							syncResp := &model.SyncResponse{
								UsersSyncd: make([]string, 0, len(syncMsg.Users)),
							}
							for userID := range syncMsg.Users {
								syncResp.UsersSyncd = append(syncResp.UsersSyncd, userID)
							}
							response := &remotecluster.Response{
								Status: remotecluster.ResponseStatusOK,
							}
							_ = response.SetPayload(syncResp)
							w.Header().Set("Content-Type", "application/json")
							w.WriteHeader(http.StatusOK)
							respBytes, _ := json.Marshal(response)
							_, _ = w.Write(respBytes)
							return
						}
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
		for i := range 3 {
			clusters[i] = &model.RemoteCluster{
				RemoteId:             model.NewId(),
				Name:                 fmt.Sprintf("cluster-%d", i+1),
				SiteURL:              testServers[i].URL,
				CreateAt:             model.GetMillis(),
				LastPingAt:           model.GetMillis(),
				LastGlobalUserSyncAt: 0,
				Token:                model.NewId(),
				CreatorId:            th.BasicUser.Id,
				RemoteToken:          model.NewId(),
			}
			clusters[i], err = ss.RemoteCluster().Save(clusters[i])
			require.NoError(t, err)
		}
		users := make([]*model.User, 5)
		for i := range 5 {
			users[i] = th.CreateUser(t)
			users[i].UpdateAt = model.GetMillis() + int64(i)
			_, err = ss.User().Update(th.Context, users[i], true)
			require.NoError(t, err)
		}
		for _, cluster := range clusters {
			err = service.HandleSyncAllUsersForTesting(cluster)
			require.NoError(t, err)
		}
		require.Eventually(t, func() bool {
			for _, countPtr := range syncMessagesPerCluster {
				if atomic.LoadInt32(countPtr) == 0 {
					return false
				}
			}
			return true
		}, 10*time.Second, 100*time.Millisecond, "All clusters should receive sync messages")
		mu.Lock()
		for clusterName, syncedUsers := range syncedUsersPerCluster {
			for _, user := range users {
				assert.Contains(t, syncedUsers, user.Id,
					"Cluster %s should have received user %s", clusterName, user.Id)
			}
		}
		mu.Unlock()
		for _, cluster := range clusters {
			updatedCluster, err2 := ss.RemoteCluster().Get(cluster.RemoteId, true)
			require.NoError(t, err2)
			assert.Greater(t, updatedCluster.LastGlobalUserSyncAt, int64(0),
				"Cursor should be updated for cluster %s", cluster.Name)
		}
	})
	t.Run("Test 4: Cursor Management", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncAttempts int32
		var failureMode atomic.Bool
		failureMode.Store(false)
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.URL.Path {
			case "/api/v4/remotecluster/msg":
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
			case "/api/v4/remotecluster/ping":
				writeOKResponse(w)
			default:
				w.WriteHeader(http.StatusNotFound)
			}
		}))
		defer testServer.Close()
		selfCluster := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster-cursor",
			SiteURL:              testServer.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		user1 := th.CreateUser(t)
		user2 := th.CreateUser(t)
		user1.UpdateAt = model.GetMillis()
		user2.UpdateAt = model.GetMillis() + 1000
		_, err = ss.User().Update(th.Context, user1, true)
		require.NoError(t, err)
		_, err = ss.User().Update(th.Context, user2, true)
		require.NoError(t, err)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&syncAttempts) > 0
		}, 5*time.Second, 100*time.Millisecond, "Should have attempted sync")
		cluster1, err2 := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err2)
		firstCursor := cluster1.LastGlobalUserSyncAt
		assert.Greater(t, firstCursor, int64(0), "Cursor should be updated after first sync")
		failureMode.Store(true)
		user3 := th.CreateUser(t)
		user3.UpdateAt = model.GetMillis()
		_, err = ss.User().Update(th.Context, user3, true)
		require.NoError(t, err)
		initialAttempts := atomic.LoadInt32(&syncAttempts)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&syncAttempts) > initialAttempts
		}, 5*time.Second, 100*time.Millisecond, "Should have attempted sync")
		cluster2, err2 := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err2)
		assert.Equal(t, firstCursor, cluster2.LastGlobalUserSyncAt, "Cursor should not update on failed sync")
		failureMode.Store(false)
		preSuccessAttempts := atomic.LoadInt32(&syncAttempts)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&syncAttempts) > preSuccessAttempts
		}, 5*time.Second, 100*time.Millisecond, "Should have attempted sync")
		cluster3, err3 := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err3)
		assert.Greater(t, cluster3.LastGlobalUserSyncAt, firstCursor, "Cursor should advance after successful sync")
	})
	t.Run("Test 5: Feature Flag Testing", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncMessageCount int32
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				atomic.AddInt32(&syncMessageCount, 1)
			}
			writeOKResponse(w)
		}))
		defer testServer.Close()
		selfCluster := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster-feature-flag",
			SiteURL:              testServer.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		for i := range 3 {
			user := th.CreateUser(t)
			user.UpdateAt = model.GetMillis() + int64(i)
			_, err = ss.User().Update(th.Context, user, true)
			require.NoError(t, err)
		}
		th.App.UpdateConfig(func(cfg *model.Config) {
			cfg.FeatureFlags.EnableSyncAllUsersForRemoteCluster = false
			*cfg.ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen = false
		})
		err = th.App.ReloadConfig()
		require.NoError(t, err)
		atomic.StoreInt32(&syncMessageCount, 0)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Never(t, func() bool {
			return atomic.LoadInt32(&syncMessageCount) > 0
		}, 2*time.Second, 100*time.Millisecond, "No sync should occur with feature flag disabled")
		cluster1, err2 := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err2)
		assert.Equal(t, int64(0), cluster1.LastGlobalUserSyncAt, "Cursor should not update when flag is disabled")
		th.App.UpdateConfig(func(cfg *model.Config) {
			cfg.FeatureFlags.EnableSyncAllUsersForRemoteCluster = true
			*cfg.ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen = true
		})
		err = th.App.ReloadConfig()
		require.NoError(t, err)
		atomic.StoreInt32(&syncMessageCount, 0)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&syncMessageCount) > 0
		}, 5*time.Second, 100*time.Millisecond, "Sync should occur with feature flag enabled")
		cluster2, err2 := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err2)
		assert.Greater(t, cluster2.LastGlobalUserSyncAt, int64(0), "Cursor should update when flag is enabled")
	})
	t.Run("Test 6: Config Option Testing", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncMessageCount int32
		var connectionOpenSyncOccurred atomic.Bool
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				atomic.AddInt32(&syncMessageCount, 1)
				bodyBytes, _ := io.ReadAll(r.Body)
				var frame model.RemoteClusterFrame
				if unmarshalErr := json.Unmarshal(bodyBytes, &frame); unmarshalErr == nil {
					var syncMsg model.SyncMsg
					if unmarshalErr := json.Unmarshal(frame.Msg.Payload, &syncMsg); unmarshalErr == nil && len(syncMsg.Users) > 0 {
						connectionOpenSyncOccurred.Store(true)
					}
				}
			}
			writeOKResponse(w)
		}))
		defer testServer.Close()
		for i := range 3 {
			user := th.CreateUser(t)
			user.UpdateAt = model.GetMillis() + int64(i)
			_, err = ss.User().Update(th.Context, user, true)
			require.NoError(t, err)
		}
		th.App.UpdateConfig(func(cfg *model.Config) {
			if cfg.ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen == nil {
				cfg.ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen = model.NewPointer(false)
			} else {
				*cfg.ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen = false
			}
		})
		selfCluster1 := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster-config-disabled",
			SiteURL:              testServer.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		_, err = ss.RemoteCluster().Save(selfCluster1)
		require.NoError(t, err)
		require.Never(t, func() bool {
			return connectionOpenSyncOccurred.Load() || atomic.LoadInt32(&syncMessageCount) > 0
		}, 2*time.Second, 100*time.Millisecond, "No automatic sync should occur when config is disabled")
		atomic.StoreInt32(&syncMessageCount, 0)
		connectionOpenSyncOccurred.Store(false)
		th.App.UpdateConfig(func(cfg *model.Config) {
			*cfg.ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen = true
		})
		selfCluster2 := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster-config-enabled",
			SiteURL:              testServer.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		selfCluster2, err = ss.RemoteCluster().Save(selfCluster2)
		require.NoError(t, err)
		if th.App.Config().ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen != nil &&
			*th.App.Config().ConnectedWorkspacesSettings.SyncUsersOnConnectionOpen {
			err = service.HandleSyncAllUsersForTesting(selfCluster2)
			require.NoError(t, err)
		}
		require.Eventually(t, func() bool {
			return connectionOpenSyncOccurred.Load()
		}, 5*time.Second, 100*time.Millisecond, "Automatic sync should occur when config is enabled")
		assert.Greater(t, atomic.LoadInt32(&syncMessageCount), int32(0), "Should have sync messages when config enabled")
		updatedCluster, err2 := ss.RemoteCluster().Get(selfCluster2.RemoteId, true)
		require.NoError(t, err2)
		assert.Greater(t, updatedCluster.LastGlobalUserSyncAt, int64(0), "Cursor should be updated after automatic sync")
	})
	t.Run("Test 7: Sync Task After Connection Becomes Available", func(t *testing.T) {
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
		selfCluster := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster-reconnect",
			SiteURL:              testServer.URL,
			CreateAt:             model.GetMillis() - 300000,
			LastPingAt:           model.GetMillis() - 120000,
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		syncHandler.OnGlobalUserSync = func(userIds []string, messageNumber int32) {
			syncTaskCreated.Store(true)
		}
		for i := range 3 {
			user := th.CreateUser(t)
			user.UpdateAt = model.GetMillis() + int64(i)
			_, err = ss.User().Update(th.Context, user, true)
			require.NoError(t, err)
		}
		selfCluster.LastPingAt = model.GetMillis()
		_, err = ss.RemoteCluster().Update(selfCluster)
		require.NoError(t, err)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			return syncTaskCreated.Load()
		}, 5*time.Second, 100*time.Millisecond, "Sync should execute when cluster comes back online")
		updatedCluster, err2 := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err2)
		assert.Greater(t, updatedCluster.LastGlobalUserSyncAt, int64(0), "Cursor should be updated after sync")
	})
	t.Run("Test 8: Remote Cluster Offline During Sync", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncAttempts int32
		var serverOnline atomic.Bool
		serverOnline.Store(true)
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !serverOnline.Load() {
				w.WriteHeader(http.StatusServiceUnavailable)
				return
			}
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				atomic.AddInt32(&syncAttempts, 1)
				if atomic.LoadInt32(&syncAttempts) >= 2 {
					serverOnline.Store(false)
					w.WriteHeader(http.StatusServiceUnavailable)
					return
				}
			}
			writeOKResponse(w)
		}))
		defer testServer.Close()
		selfCluster := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster-offline",
			SiteURL:              testServer.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		for i := range 5 {
			user := th.CreateUser(t)
			user.UpdateAt = model.GetMillis() + int64(i)
			_, err = ss.User().Update(th.Context, user, true)
			require.NoError(t, err)
		}
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&syncAttempts) >= 1
		}, 5*time.Second, 100*time.Millisecond)
		cluster1, err2 := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err2)
		firstCursor := cluster1.LastGlobalUserSyncAt
		assert.Greater(t, firstCursor, int64(0), "Cursor should be set after first sync")
		for i := range 3 {
			user := th.CreateUser(t)
			user.UpdateAt = model.GetMillis() + int64(100+i)
			_, err = ss.User().Update(th.Context, user, true)
			require.NoError(t, err)
		}
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			return atomic.LoadInt32(&syncAttempts) >= 2
		}, 5*time.Second, 100*time.Millisecond)
		cluster2, err2 := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err2)
		assert.Equal(t, firstCursor, cluster2.LastGlobalUserSyncAt, "Cursor should not update when sync fails")
	})
	t.Run("Test 9: Users in Multiple Shared Channels", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncedUserIds []string
		var mu sync.Mutex
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if syncHandler != nil {
				syncHandler.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer.Close()
		selfCluster := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster-multi-channel",
			SiteURL:              testServer.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		syncHandler.OnGlobalUserSync = func(userIds []string, messageNumber int32) {
			mu.Lock()
			syncedUserIds = append(syncedUserIds, userIds...)
			mu.Unlock()
		}
		user1 := th.CreateUser(t)
		user2 := th.CreateUser(t)
		user3 := th.CreateUser(t)
		th.LinkUserToTeam(t, user1, th.BasicTeam)
		th.LinkUserToTeam(t, user2, th.BasicTeam)
		th.LinkUserToTeam(t, user3, th.BasicTeam)
		user1.UpdateAt = model.GetMillis()
		user2.UpdateAt = model.GetMillis() + 1
		user3.UpdateAt = model.GetMillis() + 2
		_, err = ss.User().Update(th.Context, user1, true)
		require.NoError(t, err)
		_, err = ss.User().Update(th.Context, user2, true)
		require.NoError(t, err)
		_, err = ss.User().Update(th.Context, user3, true)
		require.NoError(t, err)
		channel1 := th.CreateChannel(t, th.BasicTeam)
		channel2 := th.CreateChannel(t, th.BasicTeam)
		channel3 := th.CreateChannel(t, th.BasicTeam)
		sc1 := &model.SharedChannel{
			ChannelId:        channel1.Id,
			TeamId:           channel1.TeamId,
			RemoteId:         selfCluster.RemoteId,
			Home:             true,
			ReadOnly:         false,
			ShareName:        channel1.Name,
			ShareDisplayName: channel1.DisplayName,
			CreatorId:        th.BasicUser.Id,
		}
		_, err = ss.SharedChannel().Save(sc1)
		require.NoError(t, err)
		sc2 := &model.SharedChannel{
			ChannelId:        channel2.Id,
			TeamId:           channel2.TeamId,
			RemoteId:         selfCluster.RemoteId,
			Home:             true,
			ReadOnly:         false,
			ShareName:        channel2.Name,
			ShareDisplayName: channel2.DisplayName,
			CreatorId:        th.BasicUser.Id,
		}
		_, err = ss.SharedChannel().Save(sc2)
		require.NoError(t, err)
		sc3 := &model.SharedChannel{
			ChannelId:        channel3.Id,
			TeamId:           channel3.TeamId,
			RemoteId:         selfCluster.RemoteId,
			Home:             true,
			ReadOnly:         false,
			ShareName:        channel3.Name,
			ShareDisplayName: channel3.DisplayName,
			CreatorId:        th.BasicUser.Id,
		}
		_, err = ss.SharedChannel().Save(sc3)
		require.NoError(t, err)
		th.AddUserToChannel(t, user1, channel1)
		th.AddUserToChannel(t, user1, channel2)
		th.AddUserToChannel(t, user1, channel3)
		th.AddUserToChannel(t, user2, channel1)
		th.AddUserToChannel(t, user2, channel2)
		th.AddUserToChannel(t, user3, channel3)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			mu.Lock()
			defer mu.Unlock()
			syncedMap := make(map[string]bool)
			for _, userId := range syncedUserIds {
				syncedMap[userId] = true
			}
			return syncedMap[user1.Id] && syncedMap[user2.Id] && syncedMap[user3.Id]
		}, 10*time.Second, 100*time.Millisecond, "Expected all test users to be synced")
		mu.Lock()
		userCount := make(map[string]int)
		for _, userId := range syncedUserIds {
			userCount[userId]++
		}
		mu.Unlock()
		assert.Equal(t, 1, userCount[user1.Id], "User1 should be synced exactly once")
		assert.Equal(t, 1, userCount[user2.Id], "User2 should be synced exactly once")
		assert.Equal(t, 1, userCount[user3.Id], "User3 should be synced exactly once")
	})
	t.Run("Test 10: Circular Sync Prevention After Connection Reset", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncedToB []string
		var syncedBackToA []string
		var mu sync.Mutex
		serverAHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				bodyBytes, _ := io.ReadAll(r.Body)
				var frame model.RemoteClusterFrame
				if unmarshalErr := json.Unmarshal(bodyBytes, &frame); unmarshalErr == nil {
					var syncMsg model.SyncMsg
					if unmarshalErr := json.Unmarshal(frame.Msg.Payload, &syncMsg); unmarshalErr == nil {
						mu.Lock()
						for userID := range syncMsg.Users {
							syncedBackToA = append(syncedBackToA, userID)
						}
						mu.Unlock()
					}
				}
			}
			writeOKResponse(w)
		})
		serverBHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/api/v4/remotecluster/msg" {
				bodyBytes, _ := io.ReadAll(r.Body)
				var frame model.RemoteClusterFrame
				if unmarshalErr := json.Unmarshal(bodyBytes, &frame); unmarshalErr == nil {
					var syncMsg model.SyncMsg
					if unmarshalErr := json.Unmarshal(frame.Msg.Payload, &syncMsg); unmarshalErr == nil {
						mu.Lock()
						for userID := range syncMsg.Users {
							syncedToB = append(syncedToB, userID)
						}
						mu.Unlock()
					}
				}
			}
			writeOKResponse(w)
		})
		serverA := httptest.NewServer(serverAHandler)
		serverB := httptest.NewServer(serverBHandler)
		defer serverA.Close()
		defer serverB.Close()
		originalUser := th.CreateUser(t)
		originalUser.UpdateAt = model.GetMillis()
		_, err = ss.User().Update(th.Context, originalUser, true)
		require.NoError(t, err)
		clusterB := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "server-b",
			SiteURL:              serverB.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		clusterB, err = ss.RemoteCluster().Save(clusterB)
		require.NoError(t, err)
		err = service.HandleSyncAllUsersForTesting(clusterB)
		require.NoError(t, err)
		require.Eventually(t, func() bool {
			mu.Lock()
			defer mu.Unlock()
			return slices.Contains(syncedToB, originalUser.Id)
		}, 5*time.Second, 100*time.Millisecond, "Original user should sync from A to B")
		syncedUserOnB := &model.User{
			Email:    model.NewId() + "@example.com",
			Username: originalUser.Username + "_" + clusterB.Name,
			Password: "password",
			RemoteId: &clusterB.RemoteId,
			UpdateAt: model.GetMillis(),
		}
		syncedUserOnB, appErr := th.App.CreateUser(th.Context, syncedUserOnB)
		require.Nil(t, appErr)
		clusterA := &model.RemoteCluster{
			RemoteId:             clusterB.RemoteId,
			Name:                 "server-a",
			SiteURL:              serverA.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		clusterA, err = ss.RemoteCluster().Save(clusterA)
		require.NoError(t, err)
		err = service.HandleSyncAllUsersForTesting(clusterA)
		require.NoError(t, err)
		require.Never(t, func() bool {
			mu.Lock()
			defer mu.Unlock()
			return slices.Contains(syncedBackToA, syncedUserOnB.Id)
		}, 2*time.Second, 100*time.Millisecond, "Synced user should NEVER be synced back to its originating cluster")
		user, appErr := th.App.GetUser(syncedUserOnB.Id)
		require.Nil(t, appErr)
		assert.NotNil(t, user.RemoteId, "Synced user should still have RemoteId")
		assert.Equal(t, clusterB.RemoteId, *user.RemoteId, "RemoteId should point to origin cluster")
	})
	t.Run("Test 12: Database Error Handling", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			writeOKResponse(w)
		}))
		defer testServer.Close()
		selfCluster := &model.RemoteCluster{
			RemoteId:             model.NewId(),
			Name:                 "self-cluster-db-error",
			SiteURL:              testServer.URL,
			CreateAt:             model.GetMillis(),
			LastPingAt:           model.GetMillis(),
			LastGlobalUserSyncAt: 0,
			Token:                model.NewId(),
			CreatorId:            th.BasicUser.Id,
			RemoteToken:          model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		user := th.CreateUser(t)
		user.UpdateAt = model.GetMillis()
		_, err = ss.User().Update(th.Context, user, true)
		require.NoError(t, err)
		selfCluster.LastGlobalUserSyncAt = 9223372036854775807
		_, err = ss.RemoteCluster().Update(selfCluster)
		require.NoError(t, err)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		updatedCluster, err := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err)
		assert.Equal(t, int64(9223372036854775807), updatedCluster.LastGlobalUserSyncAt, "Cursor should remain unchanged on error")
		selfCluster.LastGlobalUserSyncAt = 0
		_, err = ss.RemoteCluster().Update(selfCluster)
		require.NoError(t, err)
		err = service.HandleSyncAllUsersForTesting(selfCluster)
		require.NoError(t, err)
		finalCluster, err := ss.RemoteCluster().Get(selfCluster.RemoteId, true)
		require.NoError(t, err)
		assert.Greater(t, finalCluster.LastGlobalUserSyncAt, int64(0), "Cursor should update after successful sync")
	})
}