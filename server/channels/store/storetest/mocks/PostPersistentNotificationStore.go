package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type PostPersistentNotificationStore struct {
	mock.Mock
}
func (_m *PostPersistentNotificationStore) Delete(postIds []string) error {
	ret := _m.Called(postIds)
	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func([]string) error); ok {
		r0 = rf(postIds)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *PostPersistentNotificationStore) DeleteByChannel(channelIds []string) error {
	ret := _m.Called(channelIds)
	if len(ret) == 0 {
		panic("no return value specified for DeleteByChannel")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func([]string) error); ok {
		r0 = rf(channelIds)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *PostPersistentNotificationStore) DeleteByTeam(teamIds []string) error {
	ret := _m.Called(teamIds)
	if len(ret) == 0 {
		panic("no return value specified for DeleteByTeam")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func([]string) error); ok {
		r0 = rf(teamIds)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *PostPersistentNotificationStore) DeleteExpired(maxSentCount int16) error {
	ret := _m.Called(maxSentCount)
	if len(ret) == 0 {
		panic("no return value specified for DeleteExpired")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(int16) error); ok {
		r0 = rf(maxSentCount)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *PostPersistentNotificationStore) Get(params model.GetPersistentNotificationsPostsParams) ([]*model.PostPersistentNotifications, error) {
	ret := _m.Called(params)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 []*model.PostPersistentNotifications
	var r1 error
	if rf, ok := ret.Get(0).(func(model.GetPersistentNotificationsPostsParams) ([]*model.PostPersistentNotifications, error)); ok {
		return rf(params)
	}
	if rf, ok := ret.Get(0).(func(model.GetPersistentNotificationsPostsParams) []*model.PostPersistentNotifications); ok {
		r0 = rf(params)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.PostPersistentNotifications)
		}
	}
	if rf, ok := ret.Get(1).(func(model.GetPersistentNotificationsPostsParams) error); ok {
		r1 = rf(params)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PostPersistentNotificationStore) GetSingle(postID string) (*model.PostPersistentNotifications, error) {
	ret := _m.Called(postID)
	if len(ret) == 0 {
		panic("no return value specified for GetSingle")
	}
	var r0 *model.PostPersistentNotifications
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (*model.PostPersistentNotifications, error)); ok {
		return rf(postID)
	}
	if rf, ok := ret.Get(0).(func(string) *model.PostPersistentNotifications); ok {
		r0 = rf(postID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.PostPersistentNotifications)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(postID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PostPersistentNotificationStore) UpdateLastActivity(postIds []string) error {
	ret := _m.Called(postIds)
	if len(ret) == 0 {
		panic("no return value specified for UpdateLastActivity")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func([]string) error); ok {
		r0 = rf(postIds)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewPostPersistentNotificationStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *PostPersistentNotificationStore {
	mock := &PostPersistentNotificationStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}