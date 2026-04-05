package remotecluster
import (
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest/mocks"
)
func TestReceiveInviteConfirmation_TokenInvalidation(t *testing.T) {
	t.Run("Protocol v2+ with RefreshedToken - token is rotated", func(t *testing.T) {
		originalToken := model.NewId()
		refreshedToken := model.NewId()
		remoteId := model.NewId()
		originalRC := &model.RemoteCluster{
			RemoteId: remoteId,
			Token:    originalToken,
			SiteURL:  model.SiteURLPending + model.NewId(),
			CreateAt: model.GetMillis(),
		}
		remoteClusterStoreMock := &mocks.RemoteClusterStore{}
		remoteClusterStoreMock.On("Get", remoteId, false).Return(originalRC, nil)
		var capturedRC *model.RemoteCluster
		remoteClusterStoreMock.On("Update", mock.AnythingOfType("*model.RemoteCluster")).Run(func(args mock.Arguments) {
			capturedRC = args.Get(0).(*model.RemoteCluster)
		}).Return(func(rc *model.RemoteCluster) *model.RemoteCluster {
			return rc
		}, nil)
		storeMock := &mocks.Store{}
		storeMock.On("RemoteCluster").Return(remoteClusterStoreMock)
		mockServer := newMockServerWithStore(t, storeMock)
		mockApp := newMockApp(t, nil)
		service, err := NewRemoteClusterService(mockServer, mockApp)
		require.NoError(t, err)
		confirm := model.RemoteClusterInvite{
			RemoteId:       remoteId,
			SiteURL:        "http://example.com",
			Token:          model.NewId(),
			RefreshedToken: refreshedToken,
			Version:        3,
		}
		rcUpdated, err := service.ReceiveInviteConfirmation(confirm)
		require.NoError(t, err)
		require.NotNil(t, rcUpdated)
		require.NotNil(t, capturedRC, "Update should have been called")
		assert.Equal(t, refreshedToken, capturedRC.Token, "Token should be rotated to RefreshedToken")
		assert.NotEqual(t, originalToken, capturedRC.Token, "Original invite token should be invalidated")
		assert.Equal(t, remoteId, capturedRC.RemoteId, "RemoteId should be preserved")
		remoteClusterStoreMock.AssertExpectations(t)
	})
	t.Run("Protocol v1 or no RefreshedToken - token is regenerated", func(t *testing.T) {
		originalToken := model.NewId()
		remoteId := model.NewId()
		originalRC := &model.RemoteCluster{
			RemoteId: remoteId,
			Token:    originalToken,
			SiteURL:  model.SiteURLPending + model.NewId(),
			CreateAt: model.GetMillis(),
		}
		remoteClusterStoreMock := &mocks.RemoteClusterStore{}
		remoteClusterStoreMock.On("Get", remoteId, false).Return(originalRC, nil)
		var capturedRC *model.RemoteCluster
		remoteClusterStoreMock.On("Update", mock.AnythingOfType("*model.RemoteCluster")).Run(func(args mock.Arguments) {
			capturedRC = args.Get(0).(*model.RemoteCluster)
		}).Return(func(rc *model.RemoteCluster) *model.RemoteCluster {
			return rc
		}, nil)
		storeMock := &mocks.Store{}
		storeMock.On("RemoteCluster").Return(remoteClusterStoreMock)
		mockServer := newMockServerWithStore(t, storeMock)
		mockApp := newMockApp(t, nil)
		service, err := NewRemoteClusterService(mockServer, mockApp)
		require.NoError(t, err)
		confirm := model.RemoteClusterInvite{
			RemoteId:       remoteId,
			SiteURL:        "http://example.com",
			Token:          model.NewId(),
			RefreshedToken: "",
			Version:        1,
		}
		rcUpdated, err := service.ReceiveInviteConfirmation(confirm)
		require.NoError(t, err)
		require.NotNil(t, rcUpdated)
		require.NotNil(t, capturedRC, "Update should have been called")
		assert.NotEmpty(t, capturedRC.Token, "Token should be set")
		assert.NotEqual(t, originalToken, capturedRC.Token, "Original invite token must be invalidated")
		assert.Len(t, capturedRC.Token, 26, "New token should be a valid ID (26 chars)")
		assert.Equal(t, remoteId, capturedRC.RemoteId, "RemoteId should be preserved")
		remoteClusterStoreMock.AssertExpectations(t)
	})
	t.Run("Already confirmed cluster - returns error", func(t *testing.T) {
		remoteId := model.NewId()
		confirmedRC := &model.RemoteCluster{
			RemoteId: remoteId,
			Token:    model.NewId(),
			SiteURL:  "http://already-confirmed.com", // NOT a pending URL
			CreateAt: model.GetMillis(),
		}
		remoteClusterStoreMock := &mocks.RemoteClusterStore{}
		remoteClusterStoreMock.On("Get", remoteId, false).Return(confirmedRC, nil)
		storeMock := &mocks.Store{}
		storeMock.On("RemoteCluster").Return(remoteClusterStoreMock)
		mockServer := newMockServerWithStore(t, storeMock)
		mockApp := newMockApp(t, nil)
		service, err := NewRemoteClusterService(mockServer, mockApp)
		require.NoError(t, err)
		confirm := model.RemoteClusterInvite{
			RemoteId:       remoteId,
			SiteURL:        "http://attacker.com",
			Token:          model.NewId(),
			RefreshedToken: model.NewId(),
			Version:        3,
		}
		rcUpdated, err := service.ReceiveInviteConfirmation(confirm)
		require.Error(t, err, "Should return error for already confirmed cluster")
		assert.Nil(t, rcUpdated)
		assert.Contains(t, err.Error(), "already been confirmed",
			"Error should indicate cluster is already confirmed")
		remoteClusterStoreMock.AssertNotCalled(t, "Update", mock.Anything)
	})
	t.Run("Token reuse scenario - second confirmation with old token fails", func(t *testing.T) {
		originalToken := model.NewId()
		newToken := model.NewId()
		remoteId := model.NewId()
		originalRC := &model.RemoteCluster{
			RemoteId: remoteId,
			Token:    originalToken,
			SiteURL:  model.SiteURLPending + model.NewId(),
			CreateAt: model.GetMillis(),
		}
		confirmedRC := &model.RemoteCluster{
			RemoteId:    remoteId,
			Token:       newToken,
			RemoteToken: model.NewId(),
			SiteURL:     "http://legitimate.com",
			CreateAt:    model.GetMillis(),
		}
		remoteClusterStoreMock := &mocks.RemoteClusterStore{}
		remoteClusterStoreMock.On("Get", remoteId, false).Return(originalRC, nil).Once()
		remoteClusterStoreMock.On("Update", mock.MatchedBy(func(rc *model.RemoteCluster) bool {
			return rc.RemoteId == remoteId
		})).Return(confirmedRC, nil).Once()
		remoteClusterStoreMock.On("Get", remoteId, false).Return(confirmedRC, nil).Once()
		storeMock := &mocks.Store{}
		storeMock.On("RemoteCluster").Return(remoteClusterStoreMock)
		mockServer := newMockServerWithStore(t, storeMock)
		mockApp := newMockApp(t, nil)
		service, err := NewRemoteClusterService(mockServer, mockApp)
		require.NoError(t, err)
		confirm1 := model.RemoteClusterInvite{
			RemoteId:       remoteId,
			SiteURL:        "http://legitimate.com",
			Token:          model.NewId(),
			RefreshedToken: newToken,
			Version:        3,
		}
		rcUpdated, err := service.ReceiveInviteConfirmation(confirm1)
		require.NoError(t, err)
		require.NotNil(t, rcUpdated)
		assert.Equal(t, newToken, rcUpdated.Token, "Token should be rotated after first confirmation")
		confirm2 := model.RemoteClusterInvite{
			RemoteId:       remoteId,
			SiteURL:        "http://attacker.com", // Attacker's malicious URL
			Token:          originalToken,
			RefreshedToken: model.NewId(),
			Version:        3,
		}
		rcUpdated2, err := service.ReceiveInviteConfirmation(confirm2)
		require.Error(t, err, "Second confirmation should fail - cluster already confirmed")
		assert.Nil(t, rcUpdated2, "No cluster should be returned on failed reuse attempt")
		assert.Contains(t, err.Error(), "already been confirmed",
			"Should indicate cluster already confirmed, preventing token reuse")
		remoteClusterStoreMock.AssertExpectations(t)
	})
	t.Run("Protocol v2+ with RefreshedToken equal to original token - rejected (MM-67098)", func(t *testing.T) {
		originalToken := model.NewId()
		remoteId := model.NewId()
		originalRC := &model.RemoteCluster{
			RemoteId: remoteId,
			Token:    originalToken,
			SiteURL:  model.SiteURLPending + model.NewId(),
			CreateAt: model.GetMillis(),
		}
		remoteClusterStoreMock := &mocks.RemoteClusterStore{}
		remoteClusterStoreMock.On("Get", remoteId, false).Return(originalRC, nil)
		storeMock := &mocks.Store{}
		storeMock.On("RemoteCluster").Return(remoteClusterStoreMock)
		mockServer := newMockServerWithStore(t, storeMock)
		mockApp := newMockApp(t, nil)
		service, err := NewRemoteClusterService(mockServer, mockApp)
		require.NoError(t, err)
		confirm := model.RemoteClusterInvite{
			RemoteId:       remoteId,
			SiteURL:        "http://example.com",
			Token:          model.NewId(),
			RefreshedToken: originalToken,
			Version:        3,
		}
		rcUpdated, err := service.ReceiveInviteConfirmation(confirm)
		require.Error(t, err)
		assert.Nil(t, rcUpdated)
		assert.Contains(t, err.Error(), "RefreshedToken must be different from the original invite token")
		remoteClusterStoreMock.AssertNotCalled(t, "Update", mock.Anything)
	})
}
func TestReceiveInviteConfirmation_EdgeCases(t *testing.T) {
	t.Run("Non-existent remote ID", func(t *testing.T) {
		remoteId := model.NewId()
		remoteClusterStoreMock := &mocks.RemoteClusterStore{}
		remoteClusterStoreMock.On("Get", remoteId, false).Return(nil, &model.AppError{
			Message: "not found",
		})
		storeMock := &mocks.Store{}
		storeMock.On("RemoteCluster").Return(remoteClusterStoreMock)
		mockServer := newMockServerWithStore(t, storeMock)
		mockApp := newMockApp(t, nil)
		service, err := NewRemoteClusterService(mockServer, mockApp)
		require.NoError(t, err)
		confirm := model.RemoteClusterInvite{
			RemoteId: remoteId,
			SiteURL:  "http://example.com",
			Token:    model.NewId(),
			Version:  3,
		}
		rcUpdated, err := service.ReceiveInviteConfirmation(confirm)
		require.Error(t, err)
		assert.Nil(t, rcUpdated)
		assert.Contains(t, err.Error(), "cannot accept invite confirmation")
	})
	t.Run("Protocol v2+ with empty RefreshedToken - falls back to NewId", func(t *testing.T) {
		originalToken := model.NewId()
		remoteId := model.NewId()
		originalRC := &model.RemoteCluster{
			RemoteId: remoteId,
			Token:    originalToken,
			SiteURL:  model.SiteURLPending + model.NewId(),
			CreateAt: model.GetMillis(),
		}
		remoteClusterStoreMock := &mocks.RemoteClusterStore{}
		remoteClusterStoreMock.On("Get", remoteId, false).Return(originalRC, nil)
		var capturedRC *model.RemoteCluster
		remoteClusterStoreMock.On("Update", mock.AnythingOfType("*model.RemoteCluster")).Run(func(args mock.Arguments) {
			capturedRC = args.Get(0).(*model.RemoteCluster)
		}).Return(func(rc *model.RemoteCluster) *model.RemoteCluster {
			return rc
		}, nil)
		storeMock := &mocks.Store{}
		storeMock.On("RemoteCluster").Return(remoteClusterStoreMock)
		mockServer := newMockServerWithStore(t, storeMock)
		mockApp := newMockApp(t, nil)
		service, err := NewRemoteClusterService(mockServer, mockApp)
		require.NoError(t, err)
		confirm := model.RemoteClusterInvite{
			RemoteId:       remoteId,
			SiteURL:        "http://example.com",
			Token:          model.NewId(),
			RefreshedToken: "",
			Version:        3,
		}
		rcUpdated, err := service.ReceiveInviteConfirmation(confirm)
		require.NoError(t, err)
		require.NotNil(t, rcUpdated)
		require.NotNil(t, capturedRC, "Update should have been called")
		assert.NotEqual(t, originalToken, capturedRC.Token, "Original token should be invalidated")
		assert.Len(t, capturedRC.Token, 26, "Should generate new token via fallback (26 chars)")
		assert.Equal(t, remoteId, capturedRC.RemoteId, "RemoteId should be preserved")
		remoteClusterStoreMock.AssertExpectations(t)
	})
}