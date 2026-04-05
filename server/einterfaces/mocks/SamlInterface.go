package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
	saml2 "github.com/mattermost/gosaml2"
)
type SamlInterface struct {
	mock.Mock
}
func (_m *SamlInterface) BuildRequest(rctx request.CTX, relayState string) (*model.SamlAuthRequest, *model.AppError) {
	ret := _m.Called(rctx, relayState)
	if len(ret) == 0 {
		panic("no return value specified for BuildRequest")
	}
	var r0 *model.SamlAuthRequest
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, string) (*model.SamlAuthRequest, *model.AppError)); ok {
		return rf(rctx, relayState)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string) *model.SamlAuthRequest); ok {
		r0 = rf(rctx, relayState)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.SamlAuthRequest)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string) *model.AppError); ok {
		r1 = rf(rctx, relayState)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *SamlInterface) CheckProviderAttributes(rctx request.CTX, SS *model.SamlSettings, ouser *model.User, patch *model.UserPatch) string {
	ret := _m.Called(rctx, SS, ouser, patch)
	if len(ret) == 0 {
		panic("no return value specified for CheckProviderAttributes")
	}
	var r0 string
	if rf, ok := ret.Get(0).(func(request.CTX, *model.SamlSettings, *model.User, *model.UserPatch) string); ok {
		r0 = rf(rctx, SS, ouser, patch)
	} else {
		r0 = ret.Get(0).(string)
	}
	return r0
}
func (_m *SamlInterface) ConfigureSP(rctx request.CTX) error {
	ret := _m.Called(rctx)
	if len(ret) == 0 {
		panic("no return value specified for ConfigureSP")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(request.CTX) error); ok {
		r0 = rf(rctx)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *SamlInterface) DoLogin(rctx request.CTX, encodedXML string, relayState map[string]string) (*model.User, *saml2.AssertionInfo, *model.AppError) {
	ret := _m.Called(rctx, encodedXML, relayState)
	if len(ret) == 0 {
		panic("no return value specified for DoLogin")
	}
	var r0 *model.User
	var r1 *saml2.AssertionInfo
	var r2 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, string, map[string]string) (*model.User, *saml2.AssertionInfo, *model.AppError)); ok {
		return rf(rctx, encodedXML, relayState)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string, map[string]string) *model.User); ok {
		r0 = rf(rctx, encodedXML, relayState)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.User)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string, map[string]string) *saml2.AssertionInfo); ok {
		r1 = rf(rctx, encodedXML, relayState)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*saml2.AssertionInfo)
		}
	}
	if rf, ok := ret.Get(2).(func(request.CTX, string, map[string]string) *model.AppError); ok {
		r2 = rf(rctx, encodedXML, relayState)
	} else {
		if ret.Get(2) != nil {
			r2 = ret.Get(2).(*model.AppError)
		}
	}
	return r0, r1, r2
}
func (_m *SamlInterface) GetMetadata(rctx request.CTX) (string, *model.AppError) {
	ret := _m.Called(rctx)
	if len(ret) == 0 {
		panic("no return value specified for GetMetadata")
	}
	var r0 string
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX) (string, *model.AppError)); ok {
		return rf(rctx)
	}
	if rf, ok := ret.Get(0).(func(request.CTX) string); ok {
		r0 = rf(rctx)
	} else {
		r0 = ret.Get(0).(string)
	}
	if rf, ok := ret.Get(1).(func(request.CTX) *model.AppError); ok {
		r1 = rf(rctx)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func NewSamlInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *SamlInterface {
	mock := &SamlInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}