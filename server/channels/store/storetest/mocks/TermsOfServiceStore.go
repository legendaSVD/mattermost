package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type TermsOfServiceStore struct {
	mock.Mock
}
func (_m *TermsOfServiceStore) Get(id string, allowFromCache bool) (*model.TermsOfService, error) {
	ret := _m.Called(id, allowFromCache)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 *model.TermsOfService
	var r1 error
	if rf, ok := ret.Get(0).(func(string, bool) (*model.TermsOfService, error)); ok {
		return rf(id, allowFromCache)
	}
	if rf, ok := ret.Get(0).(func(string, bool) *model.TermsOfService); ok {
		r0 = rf(id, allowFromCache)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.TermsOfService)
		}
	}
	if rf, ok := ret.Get(1).(func(string, bool) error); ok {
		r1 = rf(id, allowFromCache)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *TermsOfServiceStore) GetLatest(allowFromCache bool) (*model.TermsOfService, error) {
	ret := _m.Called(allowFromCache)
	if len(ret) == 0 {
		panic("no return value specified for GetLatest")
	}
	var r0 *model.TermsOfService
	var r1 error
	if rf, ok := ret.Get(0).(func(bool) (*model.TermsOfService, error)); ok {
		return rf(allowFromCache)
	}
	if rf, ok := ret.Get(0).(func(bool) *model.TermsOfService); ok {
		r0 = rf(allowFromCache)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.TermsOfService)
		}
	}
	if rf, ok := ret.Get(1).(func(bool) error); ok {
		r1 = rf(allowFromCache)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *TermsOfServiceStore) Save(termsOfService *model.TermsOfService) (*model.TermsOfService, error) {
	ret := _m.Called(termsOfService)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 *model.TermsOfService
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.TermsOfService) (*model.TermsOfService, error)); ok {
		return rf(termsOfService)
	}
	if rf, ok := ret.Get(0).(func(*model.TermsOfService) *model.TermsOfService); ok {
		r0 = rf(termsOfService)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.TermsOfService)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.TermsOfService) error); ok {
		r1 = rf(termsOfService)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func NewTermsOfServiceStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *TermsOfServiceStore {
	mock := &TermsOfServiceStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}