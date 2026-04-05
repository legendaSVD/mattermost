package platform
import (
	"testing"
	"github.com/stretchr/testify/mock"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest/mocks"
	searchenginemocks "github.com/mattermost/mattermost/server/v8/platform/services/searchengine/mocks"
)
func TestBackfillPostsChannelType(t *testing.T) {
	t.Run("already completed", func(t *testing.T) {
		th := SetupWithStoreMock(t)
		mockStore := th.Service.Store.(*mocks.Store)
		systemMock := &mocks.SystemStore{}
		systemMock.On("GetByName", model.SystemPostChannelTypeBackfillComplete).
			Return(&model.System{Name: model.SystemPostChannelTypeBackfillComplete, Value: "true"}, nil)
		mockStore.On("System").Return(systemMock)
		engineMock := &searchenginemocks.SearchEngineInterface{}
		th.Service.backfillPostsChannelType(engineMock)
		systemMock.AssertExpectations(t)
		engineMock.AssertNotCalled(t, "BackfillPostsChannelType", mock.Anything, mock.Anything, mock.Anything)
	})
	t.Run("successful backfill", func(t *testing.T) {
		th := SetupWithStoreMock(t)
		mockStore := th.Service.Store.(*mocks.Store)
		systemMock := &mocks.SystemStore{}
		systemMock.On("GetByName", model.SystemPostChannelTypeBackfillComplete).
			Return(nil, model.NewAppError("test", "not_found", nil, "", 404))
		systemMock.On("SaveOrUpdate", &model.System{
			Name:  model.SystemPostChannelTypeBackfillComplete,
			Value: "true",
		}).Return(nil)
		mockStore.On("System").Return(systemMock)
		channelMock := &mocks.ChannelStore{}
		channelMock.On("GetAllChannels", 0, 10000, mock.Anything).
			Return(model.ChannelListWithTeamData{
				{Channel: model.Channel{Id: "ch1", Type: model.ChannelTypeOpen}},
				{Channel: model.Channel{Id: "ch2", Type: model.ChannelTypeOpen}},
				{Channel: model.Channel{Id: "ch3", Type: model.ChannelTypePrivate}},
			}, nil)
		mockStore.On("Channel").Return(channelMock)
		engineMock := &searchenginemocks.SearchEngineInterface{}
		engineMock.On("BackfillPostsChannelType", mock.Anything, []string{"ch1", "ch2"}, "O").Return(nil)
		engineMock.On("BackfillPostsChannelType", mock.Anything, []string{"ch3"}, "P").Return(nil)
		th.Service.backfillPostsChannelType(engineMock)
		engineMock.AssertExpectations(t)
		systemMock.AssertExpectations(t)
	})
	t.Run("GetAllChannels error stops backfill", func(t *testing.T) {
		th := SetupWithStoreMock(t)
		mockStore := th.Service.Store.(*mocks.Store)
		systemMock := &mocks.SystemStore{}
		systemMock.On("GetByName", model.SystemPostChannelTypeBackfillComplete).
			Return(nil, model.NewAppError("test", "not_found", nil, "", 404))
		mockStore.On("System").Return(systemMock)
		channelMock := &mocks.ChannelStore{}
		channelMock.On("GetAllChannels", 0, 10000, mock.Anything).
			Return(nil, model.NewAppError("test", "store_error", nil, "", 500))
		mockStore.On("Channel").Return(channelMock)
		engineMock := &searchenginemocks.SearchEngineInterface{}
		th.Service.backfillPostsChannelType(engineMock)
		engineMock.AssertNotCalled(t, "BackfillPostsChannelType", mock.Anything, mock.Anything, mock.Anything)
		systemMock.AssertNotCalled(t, "SaveOrUpdate", mock.Anything)
	})
	t.Run("should separate public and private channels from GetAllChannels", func(t *testing.T) {
		th := SetupWithStoreMock(t)
		mockStore := th.Service.Store.(*mocks.Store)
		systemMock := &mocks.SystemStore{}
		systemMock.On("GetByName", model.SystemPostChannelTypeBackfillComplete).
			Return(nil, model.NewAppError("test", "not_found", nil, "", 404))
		systemMock.On("SaveOrUpdate", &model.System{
			Name:  model.SystemPostChannelTypeBackfillComplete,
			Value: "true",
		}).Return(nil)
		mockStore.On("System").Return(systemMock)
		mixedChannels := model.ChannelListWithTeamData{
			{Channel: model.Channel{Id: "pub1", Type: model.ChannelTypeOpen}},
			{Channel: model.Channel{Id: "pub2", Type: model.ChannelTypeOpen}},
			{Channel: model.Channel{Id: "priv1", Type: model.ChannelTypePrivate}},
		}
		channelMock := &mocks.ChannelStore{}
		channelMock.On("GetAllChannels", 0, 10000, mock.Anything).
			Return(mixedChannels, nil)
		mockStore.On("Channel").Return(channelMock)
		engineMock := &searchenginemocks.SearchEngineInterface{}
		engineMock.On("BackfillPostsChannelType", mock.Anything, []string{"pub1", "pub2"}, "O").Return(nil)
		engineMock.On("BackfillPostsChannelType", mock.Anything, []string{"priv1"}, "P").Return(nil)
		th.Service.backfillPostsChannelType(engineMock)
		engineMock.AssertExpectations(t)
		systemMock.AssertExpectations(t)
	})
	t.Run("BackfillPostsChannelType error stops backfill", func(t *testing.T) {
		th := SetupWithStoreMock(t)
		mockStore := th.Service.Store.(*mocks.Store)
		systemMock := &mocks.SystemStore{}
		systemMock.On("GetByName", model.SystemPostChannelTypeBackfillComplete).
			Return(nil, model.NewAppError("test", "not_found", nil, "", 404))
		mockStore.On("System").Return(systemMock)
		channelMock := &mocks.ChannelStore{}
		channelMock.On("GetAllChannels", 0, 10000, mock.Anything).
			Return(model.ChannelListWithTeamData{
				{Channel: model.Channel{Id: "ch1", Type: model.ChannelTypeOpen}},
			}, nil).Once()
		mockStore.On("Channel").Return(channelMock)
		engineMock := &searchenginemocks.SearchEngineInterface{}
		engineMock.On("BackfillPostsChannelType", mock.Anything, []string{"ch1"}, "O").
			Return(model.NewAppError("test", "es_error", nil, "", 500))
		th.Service.backfillPostsChannelType(engineMock)
		systemMock.AssertNotCalled(t, "SaveOrUpdate", mock.Anything)
	})
}