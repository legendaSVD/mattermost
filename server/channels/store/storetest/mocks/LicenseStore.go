package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type LicenseStore struct {
	mock.Mock
}
func (_m *LicenseStore) Get(rctx request.CTX, id string) (*model.LicenseRecord, error) {
	ret := _m.Called(rctx, id)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 *model.LicenseRecord
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, string) (*model.LicenseRecord, error)); ok {
		return rf(rctx, id)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string) *model.LicenseRecord); ok {
		r0 = rf(rctx, id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.LicenseRecord)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string) error); ok {
		r1 = rf(rctx, id)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *LicenseStore) GetAll() ([]*model.LicenseRecord, error) {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GetAll")
	}
	var r0 []*model.LicenseRecord
	var r1 error
	if rf, ok := ret.Get(0).(func() ([]*model.LicenseRecord, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() []*model.LicenseRecord); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.LicenseRecord)
		}
	}
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *LicenseStore) Save(license *model.LicenseRecord) error {
	ret := _m.Called(license)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(*model.LicenseRecord) error); ok {
		r0 = rf(license)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewLicenseStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *LicenseStore {
	mock := &LicenseStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}