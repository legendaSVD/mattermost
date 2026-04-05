package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type TemporaryPostStore struct {
	mock.Mock
}
func (_m *TemporaryPostStore) Delete(rctx request.CTX, id string) error {
	ret := _m.Called(rctx, id)
	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(request.CTX, string) error); ok {
		r0 = rf(rctx, id)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *TemporaryPostStore) Get(rctx request.CTX, id string, allowFromCache bool) (*model.TemporaryPost, error) {
	ret := _m.Called(rctx, id, allowFromCache)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 *model.TemporaryPost
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, string, bool) (*model.TemporaryPost, error)); ok {
		return rf(rctx, id, allowFromCache)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string, bool) *model.TemporaryPost); ok {
		r0 = rf(rctx, id, allowFromCache)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.TemporaryPost)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string, bool) error); ok {
		r1 = rf(rctx, id, allowFromCache)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *TemporaryPostStore) GetExpiredPosts(rctx request.CTX, lastPostId string, limit uint64) ([]string, error) {
	ret := _m.Called(rctx, lastPostId, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetExpiredPosts")
	}
	var r0 []string
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, string, uint64) ([]string, error)); ok {
		return rf(rctx, lastPostId, limit)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string, uint64) []string); ok {
		r0 = rf(rctx, lastPostId, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]string)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string, uint64) error); ok {
		r1 = rf(rctx, lastPostId, limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *TemporaryPostStore) InvalidateTemporaryPost(id string) {
	_m.Called(id)
}
func (_m *TemporaryPostStore) Save(rctx request.CTX, post *model.TemporaryPost) (*model.TemporaryPost, error) {
	ret := _m.Called(rctx, post)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 *model.TemporaryPost
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, *model.TemporaryPost) (*model.TemporaryPost, error)); ok {
		return rf(rctx, post)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, *model.TemporaryPost) *model.TemporaryPost); ok {
		r0 = rf(rctx, post)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.TemporaryPost)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, *model.TemporaryPost) error); ok {
		r1 = rf(rctx, post)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func NewTemporaryPostStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *TemporaryPostStore {
	mock := &TemporaryPostStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}