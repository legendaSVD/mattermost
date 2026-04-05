package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type OAuthOutgoingConnectionInterface struct {
	mock.Mock
}
func (_m *OAuthOutgoingConnectionInterface) DeleteConnection(rctx request.CTX, id string) *model.AppError {
	ret := _m.Called(rctx, id)
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, string) *model.AppError); ok {
		r0 = rf(rctx, id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func (_m *OAuthOutgoingConnectionInterface) GetConnection(rctx request.CTX, id string) (*model.OutgoingOAuthConnectionGrantType, *model.AppError) {
	ret := _m.Called(rctx, id)
	var r0 *model.OutgoingOAuthConnectionGrantType
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, string) (*model.OutgoingOAuthConnectionGrantType, *model.AppError)); ok {
		return rf(rctx, id)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string) *model.OutgoingOAuthConnectionGrantType); ok {
		r0 = rf(rctx, id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.OutgoingOAuthConnectionGrantType)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string) *model.AppError); ok {
		r1 = rf(rctx, id)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *OAuthOutgoingConnectionInterface) GetConnections(rctx request.CTX, filters model.OutgoingOAuthConnectionGetConnectionsFilter) ([]*model.OutgoingOAuthConnectionGrantType, *model.AppError) {
	ret := _m.Called(rctx, filters)
	var r0 []*model.OutgoingOAuthConnectionGrantType
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, model.OutgoingOAuthConnectionGetConnectionsFilter) ([]*model.OutgoingOAuthConnectionGrantType, *model.AppError)); ok {
		return rf(rctx, filters)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, model.OutgoingOAuthConnectionGetConnectionsFilter) []*model.OutgoingOAuthConnectionGrantType); ok {
		r0 = rf(rctx, filters)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.OutgoingOAuthConnectionGrantType)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, model.OutgoingOAuthConnectionGetConnectionsFilter) *model.AppError); ok {
		r1 = rf(rctx, filters)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *OAuthOutgoingConnectionInterface) SaveConnection(rctx request.CTX, conn *model.OutgoingOAuthConnectionGrantType) (*model.OutgoingOAuthConnectionGrantType, *model.AppError) {
	ret := _m.Called(rctx, conn)
	var r0 *model.OutgoingOAuthConnectionGrantType
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, *model.OutgoingOAuthConnectionGrantType) (*model.OutgoingOAuthConnectionGrantType, *model.AppError)); ok {
		return rf(rctx, conn)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, *model.OutgoingOAuthConnectionGrantType) *model.OutgoingOAuthConnectionGrantType); ok {
		r0 = rf(rctx, conn)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.OutgoingOAuthConnectionGrantType)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, *model.OutgoingOAuthConnectionGrantType) *model.AppError); ok {
		r1 = rf(rctx, conn)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *OAuthOutgoingConnectionInterface) UpdateConnection(rctx request.CTX, conn *model.OutgoingOAuthConnectionGrantType) (*model.OutgoingOAuthConnectionGrantType, *model.AppError) {
	ret := _m.Called(rctx, conn)
	var r0 *model.OutgoingOAuthConnectionGrantType
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, *model.OutgoingOAuthConnectionGrantType) (*model.OutgoingOAuthConnectionGrantType, *model.AppError)); ok {
		return rf(rctx, conn)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, *model.OutgoingOAuthConnectionGrantType) *model.OutgoingOAuthConnectionGrantType); ok {
		r0 = rf(rctx, conn)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.OutgoingOAuthConnectionGrantType)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, *model.OutgoingOAuthConnectionGrantType) *model.AppError); ok {
		r1 = rf(rctx, conn)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
type mockConstructorTestingTNewOAuthOutgoingConnectionInterface interface {
	mock.TestingT
	Cleanup(func())
}
func NewOAuthOutgoingConnectionInterface(t mockConstructorTestingTNewOAuthOutgoingConnectionInterface) *OAuthOutgoingConnectionInterface {
	mock := &OAuthOutgoingConnectionInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}