package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type IntuneInterface struct {
	mock.Mock
}
func (_m *IntuneInterface) IsConfigured() bool {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for IsConfigured")
	}
	var r0 bool
	if rf, ok := ret.Get(0).(func() bool); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(bool)
	}
	return r0
}
func (_m *IntuneInterface) Login(rctx request.CTX, accessToken string) (*model.User, *model.AppError) {
	ret := _m.Called(rctx, accessToken)
	if len(ret) == 0 {
		panic("no return value specified for Login")
	}
	var r0 *model.User
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, string) (*model.User, *model.AppError)); ok {
		return rf(rctx, accessToken)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string) *model.User); ok {
		r0 = rf(rctx, accessToken)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.User)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string) *model.AppError); ok {
		r1 = rf(rctx, accessToken)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func NewIntuneInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *IntuneInterface {
	mock := &IntuneInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}