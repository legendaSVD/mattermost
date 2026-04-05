package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type AutoTranslationStore struct {
	mock.Mock
}
func (_m *AutoTranslationStore) ClearCaches() {
	_m.Called()
}
func (_m *AutoTranslationStore) Get(objectType string, objectID string, dstLang string) (*model.Translation, error) {
	ret := _m.Called(objectType, objectID, dstLang)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 *model.Translation
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string, string) (*model.Translation, error)); ok {
		return rf(objectType, objectID, dstLang)
	}
	if rf, ok := ret.Get(0).(func(string, string, string) *model.Translation); ok {
		r0 = rf(objectType, objectID, dstLang)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.Translation)
		}
	}
	if rf, ok := ret.Get(1).(func(string, string, string) error); ok {
		r1 = rf(objectType, objectID, dstLang)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *AutoTranslationStore) GetActiveDestinationLanguages(channelID string, excludeUserID string, filterUserIDs []string) ([]string, error) {
	ret := _m.Called(channelID, excludeUserID, filterUserIDs)
	if len(ret) == 0 {
		panic("no return value specified for GetActiveDestinationLanguages")
	}
	var r0 []string
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string, []string) ([]string, error)); ok {
		return rf(channelID, excludeUserID, filterUserIDs)
	}
	if rf, ok := ret.Get(0).(func(string, string, []string) []string); ok {
		r0 = rf(channelID, excludeUserID, filterUserIDs)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]string)
		}
	}
	if rf, ok := ret.Get(1).(func(string, string, []string) error); ok {
		r1 = rf(channelID, excludeUserID, filterUserIDs)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *AutoTranslationStore) GetAllForObject(objectType string, objectID string) ([]*model.Translation, error) {
	ret := _m.Called(objectType, objectID)
	if len(ret) == 0 {
		panic("no return value specified for GetAllForObject")
	}
	var r0 []*model.Translation
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string) ([]*model.Translation, error)); ok {
		return rf(objectType, objectID)
	}
	if rf, ok := ret.Get(0).(func(string, string) []*model.Translation); ok {
		r0 = rf(objectType, objectID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.Translation)
		}
	}
	if rf, ok := ret.Get(1).(func(string, string) error); ok {
		r1 = rf(objectType, objectID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *AutoTranslationStore) GetBatch(objectType string, objectIDs []string, dstLang string) (map[string]*model.Translation, error) {
	ret := _m.Called(objectType, objectIDs, dstLang)
	if len(ret) == 0 {
		panic("no return value specified for GetBatch")
	}
	var r0 map[string]*model.Translation
	var r1 error
	if rf, ok := ret.Get(0).(func(string, []string, string) (map[string]*model.Translation, error)); ok {
		return rf(objectType, objectIDs, dstLang)
	}
	if rf, ok := ret.Get(0).(func(string, []string, string) map[string]*model.Translation); ok {
		r0 = rf(objectType, objectIDs, dstLang)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(map[string]*model.Translation)
		}
	}
	if rf, ok := ret.Get(1).(func(string, []string, string) error); ok {
		r1 = rf(objectType, objectIDs, dstLang)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *AutoTranslationStore) GetByStateOlderThan(state model.TranslationState, olderThanMillis int64, limit int) ([]*model.Translation, error) {
	ret := _m.Called(state, olderThanMillis, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetByStateOlderThan")
	}
	var r0 []*model.Translation
	var r1 error
	if rf, ok := ret.Get(0).(func(model.TranslationState, int64, int) ([]*model.Translation, error)); ok {
		return rf(state, olderThanMillis, limit)
	}
	if rf, ok := ret.Get(0).(func(model.TranslationState, int64, int) []*model.Translation); ok {
		r0 = rf(state, olderThanMillis, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.Translation)
		}
	}
	if rf, ok := ret.Get(1).(func(model.TranslationState, int64, int) error); ok {
		r1 = rf(state, olderThanMillis, limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *AutoTranslationStore) GetLatestPostUpdateAtForChannel(channelID string) (int64, error) {
	ret := _m.Called(channelID)
	if len(ret) == 0 {
		panic("no return value specified for GetLatestPostUpdateAtForChannel")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (int64, error)); ok {
		return rf(channelID)
	}
	if rf, ok := ret.Get(0).(func(string) int64); ok {
		r0 = rf(channelID)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(channelID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *AutoTranslationStore) GetTranslationsSinceForChannel(channelID string, dstLang string, since int64) (map[string]*model.Translation, error) {
	ret := _m.Called(channelID, dstLang, since)
	if len(ret) == 0 {
		panic("no return value specified for GetTranslationsSinceForChannel")
	}
	var r0 map[string]*model.Translation
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string, int64) (map[string]*model.Translation, error)); ok {
		return rf(channelID, dstLang, since)
	}
	if rf, ok := ret.Get(0).(func(string, string, int64) map[string]*model.Translation); ok {
		r0 = rf(channelID, dstLang, since)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(map[string]*model.Translation)
		}
	}
	if rf, ok := ret.Get(1).(func(string, string, int64) error); ok {
		r1 = rf(channelID, dstLang, since)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *AutoTranslationStore) GetUserLanguage(userID string, channelID string) (string, error) {
	ret := _m.Called(userID, channelID)
	if len(ret) == 0 {
		panic("no return value specified for GetUserLanguage")
	}
	var r0 string
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string) (string, error)); ok {
		return rf(userID, channelID)
	}
	if rf, ok := ret.Get(0).(func(string, string) string); ok {
		r0 = rf(userID, channelID)
	} else {
		r0 = ret.Get(0).(string)
	}
	if rf, ok := ret.Get(1).(func(string, string) error); ok {
		r1 = rf(userID, channelID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *AutoTranslationStore) InvalidatePostTranslationEtag(channelID string) {
	_m.Called(channelID)
}
func (_m *AutoTranslationStore) InvalidateUserAutoTranslation(userID string, channelID string) {
	_m.Called(userID, channelID)
}
func (_m *AutoTranslationStore) InvalidateUserLocaleCache(userID string) {
	_m.Called(userID)
}
func (_m *AutoTranslationStore) IsUserEnabled(userID string, channelID string) (bool, error) {
	ret := _m.Called(userID, channelID)
	if len(ret) == 0 {
		panic("no return value specified for IsUserEnabled")
	}
	var r0 bool
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string) (bool, error)); ok {
		return rf(userID, channelID)
	}
	if rf, ok := ret.Get(0).(func(string, string) bool); ok {
		r0 = rf(userID, channelID)
	} else {
		r0 = ret.Get(0).(bool)
	}
	if rf, ok := ret.Get(1).(func(string, string) error); ok {
		r1 = rf(userID, channelID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *AutoTranslationStore) Save(translation *model.Translation) error {
	ret := _m.Called(translation)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(*model.Translation) error); ok {
		r0 = rf(translation)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewAutoTranslationStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *AutoTranslationStore {
	mock := &AutoTranslationStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}