package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type NotifyAdminStore struct {
	mock.Mock
}
func (_m *NotifyAdminStore) DeleteBefore(trial bool, now int64) error {
	ret := _m.Called(trial, now)
	if len(ret) == 0 {
		panic("no return value specified for DeleteBefore")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(bool, int64) error); ok {
		r0 = rf(trial, now)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *NotifyAdminStore) Get(trial bool) ([]*model.NotifyAdminData, error) {
	ret := _m.Called(trial)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 []*model.NotifyAdminData
	var r1 error
	if rf, ok := ret.Get(0).(func(bool) ([]*model.NotifyAdminData, error)); ok {
		return rf(trial)
	}
	if rf, ok := ret.Get(0).(func(bool) []*model.NotifyAdminData); ok {
		r0 = rf(trial)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.NotifyAdminData)
		}
	}
	if rf, ok := ret.Get(1).(func(bool) error); ok {
		r1 = rf(trial)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *NotifyAdminStore) GetDataByUserIdAndFeature(userID string, feature model.MattermostFeature) ([]*model.NotifyAdminData, error) {
	ret := _m.Called(userID, feature)
	if len(ret) == 0 {
		panic("no return value specified for GetDataByUserIdAndFeature")
	}
	var r0 []*model.NotifyAdminData
	var r1 error
	if rf, ok := ret.Get(0).(func(string, model.MattermostFeature) ([]*model.NotifyAdminData, error)); ok {
		return rf(userID, feature)
	}
	if rf, ok := ret.Get(0).(func(string, model.MattermostFeature) []*model.NotifyAdminData); ok {
		r0 = rf(userID, feature)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.NotifyAdminData)
		}
	}
	if rf, ok := ret.Get(1).(func(string, model.MattermostFeature) error); ok {
		r1 = rf(userID, feature)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *NotifyAdminStore) Save(data *model.NotifyAdminData) (*model.NotifyAdminData, error) {
	ret := _m.Called(data)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 *model.NotifyAdminData
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.NotifyAdminData) (*model.NotifyAdminData, error)); ok {
		return rf(data)
	}
	if rf, ok := ret.Get(0).(func(*model.NotifyAdminData) *model.NotifyAdminData); ok {
		r0 = rf(data)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.NotifyAdminData)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.NotifyAdminData) error); ok {
		r1 = rf(data)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *NotifyAdminStore) Update(userID string, requiredPlan string, requiredFeature model.MattermostFeature, now int64) error {
	ret := _m.Called(userID, requiredPlan, requiredFeature, now)
	if len(ret) == 0 {
		panic("no return value specified for Update")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, string, model.MattermostFeature, int64) error); ok {
		r0 = rf(userID, requiredPlan, requiredFeature, now)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewNotifyAdminStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *NotifyAdminStore {
	mock := &NotifyAdminStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}