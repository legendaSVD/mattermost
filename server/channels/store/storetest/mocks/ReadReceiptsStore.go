package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type ReadReceiptsStore struct {
	mock.Mock
}
func (_m *ReadReceiptsStore) Delete(rctx request.CTX, postID string, userID string) error {
	ret := _m.Called(rctx, postID, userID)
	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(request.CTX, string, string) error); ok {
		r0 = rf(rctx, postID, userID)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ReadReceiptsStore) Get(rctx request.CTX, postID string, userID string) (*model.ReadReceipt, error) {
	ret := _m.Called(rctx, postID, userID)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 *model.ReadReceipt
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, string, string) (*model.ReadReceipt, error)); ok {
		return rf(rctx, postID, userID)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string, string) *model.ReadReceipt); ok {
		r0 = rf(rctx, postID, userID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.ReadReceipt)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string, string) error); ok {
		r1 = rf(rctx, postID, userID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *ReadReceiptsStore) Save(rctx request.CTX, receipt *model.ReadReceipt) (*model.ReadReceipt, error) {
	ret := _m.Called(rctx, receipt)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 *model.ReadReceipt
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, *model.ReadReceipt) (*model.ReadReceipt, error)); ok {
		return rf(rctx, receipt)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, *model.ReadReceipt) *model.ReadReceipt); ok {
		r0 = rf(rctx, receipt)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.ReadReceipt)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, *model.ReadReceipt) error); ok {
		r1 = rf(rctx, receipt)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func NewReadReceiptsStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *ReadReceiptsStore {
	mock := &ReadReceiptsStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}