package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type PreferenceStore struct {
	mock.Mock
}
func (_m *PreferenceStore) CleanupFlagsBatch(limit int64) (int64, error) {
	ret := _m.Called(limit)
	if len(ret) == 0 {
		panic("no return value specified for CleanupFlagsBatch")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(int64) (int64, error)); ok {
		return rf(limit)
	}
	if rf, ok := ret.Get(0).(func(int64) int64); ok {
		r0 = rf(limit)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(int64) error); ok {
		r1 = rf(limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PreferenceStore) Delete(userID string, category string, name string) error {
	ret := _m.Called(userID, category, name)
	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, string, string) error); ok {
		r0 = rf(userID, category, name)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *PreferenceStore) DeleteCategory(userID string, category string) error {
	ret := _m.Called(userID, category)
	if len(ret) == 0 {
		panic("no return value specified for DeleteCategory")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, string) error); ok {
		r0 = rf(userID, category)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *PreferenceStore) DeleteCategoryAndName(category string, name string) error {
	ret := _m.Called(category, name)
	if len(ret) == 0 {
		panic("no return value specified for DeleteCategoryAndName")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, string) error); ok {
		r0 = rf(category, name)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *PreferenceStore) DeleteInvalidVisibleDmsGms() (int64, error) {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for DeleteInvalidVisibleDmsGms")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func() (int64, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() int64); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PreferenceStore) DeleteOrphanedRows(limit int) (int64, error) {
	ret := _m.Called(limit)
	if len(ret) == 0 {
		panic("no return value specified for DeleteOrphanedRows")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(int) (int64, error)); ok {
		return rf(limit)
	}
	if rf, ok := ret.Get(0).(func(int) int64); ok {
		r0 = rf(limit)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PreferenceStore) Get(userID string, category string, name string) (*model.Preference, error) {
	ret := _m.Called(userID, category, name)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 *model.Preference
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string, string) (*model.Preference, error)); ok {
		return rf(userID, category, name)
	}
	if rf, ok := ret.Get(0).(func(string, string, string) *model.Preference); ok {
		r0 = rf(userID, category, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.Preference)
		}
	}
	if rf, ok := ret.Get(1).(func(string, string, string) error); ok {
		r1 = rf(userID, category, name)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PreferenceStore) GetAll(userID string) (model.Preferences, error) {
	ret := _m.Called(userID)
	if len(ret) == 0 {
		panic("no return value specified for GetAll")
	}
	var r0 model.Preferences
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (model.Preferences, error)); ok {
		return rf(userID)
	}
	if rf, ok := ret.Get(0).(func(string) model.Preferences); ok {
		r0 = rf(userID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(model.Preferences)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(userID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PreferenceStore) GetCategory(userID string, category string) (model.Preferences, error) {
	ret := _m.Called(userID, category)
	if len(ret) == 0 {
		panic("no return value specified for GetCategory")
	}
	var r0 model.Preferences
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string) (model.Preferences, error)); ok {
		return rf(userID, category)
	}
	if rf, ok := ret.Get(0).(func(string, string) model.Preferences); ok {
		r0 = rf(userID, category)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(model.Preferences)
		}
	}
	if rf, ok := ret.Get(1).(func(string, string) error); ok {
		r1 = rf(userID, category)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PreferenceStore) GetCategoryAndName(category string, name string) (model.Preferences, error) {
	ret := _m.Called(category, name)
	if len(ret) == 0 {
		panic("no return value specified for GetCategoryAndName")
	}
	var r0 model.Preferences
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string) (model.Preferences, error)); ok {
		return rf(category, name)
	}
	if rf, ok := ret.Get(0).(func(string, string) model.Preferences); ok {
		r0 = rf(category, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(model.Preferences)
		}
	}
	if rf, ok := ret.Get(1).(func(string, string) error); ok {
		r1 = rf(category, name)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PreferenceStore) PermanentDeleteByUser(userID string) error {
	ret := _m.Called(userID)
	if len(ret) == 0 {
		panic("no return value specified for PermanentDeleteByUser")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(userID)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *PreferenceStore) Save(preferences model.Preferences) error {
	ret := _m.Called(preferences)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(model.Preferences) error); ok {
		r0 = rf(preferences)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewPreferenceStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *PreferenceStore {
	mock := &PreferenceStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}