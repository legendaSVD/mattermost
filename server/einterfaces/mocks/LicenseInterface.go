package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type LicenseInterface struct {
	mock.Mock
}
func (_m *LicenseInterface) CanStartTrial() (bool, error) {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for CanStartTrial")
	}
	var r0 bool
	var r1 error
	if rf, ok := ret.Get(0).(func() (bool, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() bool); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(bool)
	}
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *LicenseInterface) GetPrevTrial() (*model.License, error) {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GetPrevTrial")
	}
	var r0 *model.License
	var r1 error
	if rf, ok := ret.Get(0).(func() (*model.License, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() *model.License); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.License)
		}
	}
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *LicenseInterface) NewMattermostEntryLicense(serverId string) *model.License {
	ret := _m.Called(serverId)
	if len(ret) == 0 {
		panic("no return value specified for NewMattermostEntryLicense")
	}
	var r0 *model.License
	if rf, ok := ret.Get(0).(func(string) *model.License); ok {
		r0 = rf(serverId)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.License)
		}
	}
	return r0
}
func NewLicenseInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *LicenseInterface {
	mock := &LicenseInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}