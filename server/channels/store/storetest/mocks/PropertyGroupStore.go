package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type PropertyGroupStore struct {
	mock.Mock
}
func (_m *PropertyGroupStore) Get(name string) (*model.PropertyGroup, error) {
	ret := _m.Called(name)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 *model.PropertyGroup
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (*model.PropertyGroup, error)); ok {
		return rf(name)
	}
	if rf, ok := ret.Get(0).(func(string) *model.PropertyGroup); ok {
		r0 = rf(name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.PropertyGroup)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(name)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *PropertyGroupStore) Register(name string) (*model.PropertyGroup, error) {
	ret := _m.Called(name)
	if len(ret) == 0 {
		panic("no return value specified for Register")
	}
	var r0 *model.PropertyGroup
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (*model.PropertyGroup, error)); ok {
		return rf(name)
	}
	if rf, ok := ret.Get(0).(func(string) *model.PropertyGroup); ok {
		r0 = rf(name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.PropertyGroup)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(name)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func NewPropertyGroupStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *PropertyGroupStore {
	mock := &PropertyGroupStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}