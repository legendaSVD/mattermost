package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type OutgoingOAuthConnectionStore struct {
	mock.Mock
}
func (_m *OutgoingOAuthConnectionStore) DeleteConnection(rctx request.CTX, id string) error {
	ret := _m.Called(rctx, id)
	if len(ret) == 0 {
		panic("no return value specified for DeleteConnection")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(request.CTX, string) error); ok {
		r0 = rf(rctx, id)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *OutgoingOAuthConnectionStore) GetConnection(rctx request.CTX, id string) (*model.OutgoingOAuthConnection, error) {
	ret := _m.Called(rctx, id)
	if len(ret) == 0 {
		panic("no return value specified for GetConnection")
	}
	var r0 *model.OutgoingOAuthConnection
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, string) (*model.OutgoingOAuthConnection, error)); ok {
		return rf(rctx, id)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string) *model.OutgoingOAuthConnection); ok {
		r0 = rf(rctx, id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.OutgoingOAuthConnection)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string) error); ok {
		r1 = rf(rctx, id)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *OutgoingOAuthConnectionStore) GetConnections(rctx request.CTX, filters model.OutgoingOAuthConnectionGetConnectionsFilter) ([]*model.OutgoingOAuthConnection, error) {
	ret := _m.Called(rctx, filters)
	if len(ret) == 0 {
		panic("no return value specified for GetConnections")
	}
	var r0 []*model.OutgoingOAuthConnection
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, model.OutgoingOAuthConnectionGetConnectionsFilter) ([]*model.OutgoingOAuthConnection, error)); ok {
		return rf(rctx, filters)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, model.OutgoingOAuthConnectionGetConnectionsFilter) []*model.OutgoingOAuthConnection); ok {
		r0 = rf(rctx, filters)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.OutgoingOAuthConnection)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, model.OutgoingOAuthConnectionGetConnectionsFilter) error); ok {
		r1 = rf(rctx, filters)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *OutgoingOAuthConnectionStore) SaveConnection(rctx request.CTX, conn *model.OutgoingOAuthConnection) (*model.OutgoingOAuthConnection, error) {
	ret := _m.Called(rctx, conn)
	if len(ret) == 0 {
		panic("no return value specified for SaveConnection")
	}
	var r0 *model.OutgoingOAuthConnection
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, *model.OutgoingOAuthConnection) (*model.OutgoingOAuthConnection, error)); ok {
		return rf(rctx, conn)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, *model.OutgoingOAuthConnection) *model.OutgoingOAuthConnection); ok {
		r0 = rf(rctx, conn)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.OutgoingOAuthConnection)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, *model.OutgoingOAuthConnection) error); ok {
		r1 = rf(rctx, conn)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *OutgoingOAuthConnectionStore) UpdateConnection(rctx request.CTX, conn *model.OutgoingOAuthConnection) (*model.OutgoingOAuthConnection, error) {
	ret := _m.Called(rctx, conn)
	if len(ret) == 0 {
		panic("no return value specified for UpdateConnection")
	}
	var r0 *model.OutgoingOAuthConnection
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, *model.OutgoingOAuthConnection) (*model.OutgoingOAuthConnection, error)); ok {
		return rf(rctx, conn)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, *model.OutgoingOAuthConnection) *model.OutgoingOAuthConnection); ok {
		r0 = rf(rctx, conn)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.OutgoingOAuthConnection)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, *model.OutgoingOAuthConnection) error); ok {
		r1 = rf(rctx, conn)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func NewOutgoingOAuthConnectionStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *OutgoingOAuthConnectionStore {
	mock := &OutgoingOAuthConnectionStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}