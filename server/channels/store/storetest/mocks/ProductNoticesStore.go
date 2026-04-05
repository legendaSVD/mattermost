package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type ProductNoticesStore struct {
	mock.Mock
}
func (_m *ProductNoticesStore) Clear(notices []string) error {
	ret := _m.Called(notices)
	if len(ret) == 0 {
		panic("no return value specified for Clear")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func([]string) error); ok {
		r0 = rf(notices)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ProductNoticesStore) ClearOldNotices(currentNotices model.ProductNotices) error {
	ret := _m.Called(currentNotices)
	if len(ret) == 0 {
		panic("no return value specified for ClearOldNotices")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(model.ProductNotices) error); ok {
		r0 = rf(currentNotices)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ProductNoticesStore) GetViews(userID string) ([]model.ProductNoticeViewState, error) {
	ret := _m.Called(userID)
	if len(ret) == 0 {
		panic("no return value specified for GetViews")
	}
	var r0 []model.ProductNoticeViewState
	var r1 error
	if rf, ok := ret.Get(0).(func(string) ([]model.ProductNoticeViewState, error)); ok {
		return rf(userID)
	}
	if rf, ok := ret.Get(0).(func(string) []model.ProductNoticeViewState); ok {
		r0 = rf(userID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]model.ProductNoticeViewState)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(userID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *ProductNoticesStore) View(userID string, notices []string) error {
	ret := _m.Called(userID, notices)
	if len(ret) == 0 {
		panic("no return value specified for View")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, []string) error); ok {
		r0 = rf(userID, notices)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewProductNoticesStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *ProductNoticesStore {
	mock := &ProductNoticesStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}