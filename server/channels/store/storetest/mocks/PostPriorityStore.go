package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type PostPriorityStore struct {
	mock.Mock
}
func (_m *PostPriorityStore) Delete(postID string) error {
	ret := _m.Called(postID)
	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(postID)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *PostPriorityStore) GetForPost(postID string) (*model.PostPriority, error) {
	ret := _m.Called(postID)
	if len(ret) == 0 {
		panic("no return value specified for GetForPost")
	}
	var r0 *model.PostPriority
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (*model.PostPriority, error)); ok {
		return rf(postID)
	}
	if rf, ok := ret.Get(0).(func(string) *model.PostPriority); ok {
		r0 = rf(postID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.PostPriority)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(postID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PostPriorityStore) GetForPostWithContext(rctx request.CTX, postID string) (*model.PostPriority, error) {
	ret := _m.Called(rctx, postID)
	if len(ret) == 0 {
		panic("no return value specified for GetForPostWithContext")
	}
	var r0 *model.PostPriority
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, string) (*model.PostPriority, error)); ok {
		return rf(rctx, postID)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string) *model.PostPriority); ok {
		r0 = rf(rctx, postID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.PostPriority)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string) error); ok {
		r1 = rf(rctx, postID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PostPriorityStore) GetForPosts(ids []string) ([]*model.PostPriority, error) {
	ret := _m.Called(ids)
	if len(ret) == 0 {
		panic("no return value specified for GetForPosts")
	}
	var r0 []*model.PostPriority
	var r1 error
	if rf, ok := ret.Get(0).(func([]string) ([]*model.PostPriority, error)); ok {
		return rf(ids)
	}
	if rf, ok := ret.Get(0).(func([]string) []*model.PostPriority); ok {
		r0 = rf(ids)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.PostPriority)
		}
	}
	if rf, ok := ret.Get(1).(func([]string) error); ok {
		r1 = rf(ids)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PostPriorityStore) Save(priority *model.PostPriority) (*model.PostPriority, error) {
	ret := _m.Called(priority)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 *model.PostPriority
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.PostPriority) (*model.PostPriority, error)); ok {
		return rf(priority)
	}
	if rf, ok := ret.Get(0).(func(*model.PostPriority) *model.PostPriority); ok {
		r0 = rf(priority)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.PostPriority)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.PostPriority) error); ok {
		r1 = rf(priority)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func NewPostPriorityStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *PostPriorityStore {
	mock := &PostPriorityStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}