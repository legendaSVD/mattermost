package mocks
import (
	io "io"
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
	request "github.com/mattermost/mattermost/server/public/shared/request"
)
type OAuthProvider struct {
	mock.Mock
}
func (_m *OAuthProvider) GetSSOSettings(rctx request.CTX, config *model.Config, service string) (*model.SSOSettings, error) {
	ret := _m.Called(rctx, config, service)
	if len(ret) == 0 {
		panic("no return value specified for GetSSOSettings")
	}
	var r0 *model.SSOSettings
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, *model.Config, string) (*model.SSOSettings, error)); ok {
		return rf(rctx, config, service)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, *model.Config, string) *model.SSOSettings); ok {
		r0 = rf(rctx, config, service)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.SSOSettings)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, *model.Config, string) error); ok {
		r1 = rf(rctx, config, service)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *OAuthProvider) GetUserFromIdToken(rctx request.CTX, idToken string) (*model.User, error) {
	ret := _m.Called(rctx, idToken)
	if len(ret) == 0 {
		panic("no return value specified for GetUserFromIdToken")
	}
	var r0 *model.User
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, string) (*model.User, error)); ok {
		return rf(rctx, idToken)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string) *model.User); ok {
		r0 = rf(rctx, idToken)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.User)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string) error); ok {
		r1 = rf(rctx, idToken)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *OAuthProvider) GetUserFromJSON(rctx request.CTX, data io.Reader, tokenUser *model.User, settings *model.SSOSettings) (*model.User, error) {
	ret := _m.Called(rctx, data, tokenUser, settings)
	if len(ret) == 0 {
		panic("no return value specified for GetUserFromJSON")
	}
	var r0 *model.User
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, io.Reader, *model.User, *model.SSOSettings) (*model.User, error)); ok {
		return rf(rctx, data, tokenUser, settings)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, io.Reader, *model.User, *model.SSOSettings) *model.User); ok {
		r0 = rf(rctx, data, tokenUser, settings)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.User)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, io.Reader, *model.User, *model.SSOSettings) error); ok {
		r1 = rf(rctx, data, tokenUser, settings)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *OAuthProvider) IsSameUser(rctx request.CTX, dbUser *model.User, oAuthUser *model.User) bool {
	ret := _m.Called(rctx, dbUser, oAuthUser)
	if len(ret) == 0 {
		panic("no return value specified for IsSameUser")
	}
	var r0 bool
	if rf, ok := ret.Get(0).(func(request.CTX, *model.User, *model.User) bool); ok {
		r0 = rf(rctx, dbUser, oAuthUser)
	} else {
		r0 = ret.Get(0).(bool)
	}
	return r0
}
func NewOAuthProvider(t interface {
	mock.TestingT
	Cleanup(func())
}) *OAuthProvider {
	mock := &OAuthProvider{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}