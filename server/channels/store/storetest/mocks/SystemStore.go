package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type SystemStore struct {
	mock.Mock
}
func (_m *SystemStore) Get() (model.StringMap, error) {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 model.StringMap
	var r1 error
	if rf, ok := ret.Get(0).(func() (model.StringMap, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() model.StringMap); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(model.StringMap)
		}
	}
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *SystemStore) GetByName(name string) (*model.System, error) {
	ret := _m.Called(name)
	if len(ret) == 0 {
		panic("no return value specified for GetByName")
	}
	var r0 *model.System
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (*model.System, error)); ok {
		return rf(name)
	}
	if rf, ok := ret.Get(0).(func(string) *model.System); ok {
		r0 = rf(name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.System)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(name)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *SystemStore) GetByNameWithContext(rctx request.CTX, name string) (*model.System, error) {
	ret := _m.Called(rctx, name)
	if len(ret) == 0 {
		panic("no return value specified for GetByNameWithContext")
	}
	var r0 *model.System
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX, string) (*model.System, error)); ok {
		return rf(rctx, name)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, string) *model.System); ok {
		r0 = rf(rctx, name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.System)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, string) error); ok {
		r1 = rf(rctx, name)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *SystemStore) GetWithContext(rctx request.CTX) (model.StringMap, error) {
	ret := _m.Called(rctx)
	if len(ret) == 0 {
		panic("no return value specified for GetWithContext")
	}
	var r0 model.StringMap
	var r1 error
	if rf, ok := ret.Get(0).(func(request.CTX) (model.StringMap, error)); ok {
		return rf(rctx)
	}
	if rf, ok := ret.Get(0).(func(request.CTX) model.StringMap); ok {
		r0 = rf(rctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(model.StringMap)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX) error); ok {
		r1 = rf(rctx)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *SystemStore) InsertIfExists(system *model.System) (*model.System, error) {
	ret := _m.Called(system)
	if len(ret) == 0 {
		panic("no return value specified for InsertIfExists")
	}
	var r0 *model.System
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.System) (*model.System, error)); ok {
		return rf(system)
	}
	if rf, ok := ret.Get(0).(func(*model.System) *model.System); ok {
		r0 = rf(system)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.System)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.System) error); ok {
		r1 = rf(system)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *SystemStore) PermanentDeleteByName(name string) (*model.System, error) {
	ret := _m.Called(name)
	if len(ret) == 0 {
		panic("no return value specified for PermanentDeleteByName")
	}
	var r0 *model.System
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (*model.System, error)); ok {
		return rf(name)
	}
	if rf, ok := ret.Get(0).(func(string) *model.System); ok {
		r0 = rf(name)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.System)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(name)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *SystemStore) Save(system *model.System) error {
	ret := _m.Called(system)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(*model.System) error); ok {
		r0 = rf(system)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *SystemStore) SaveOrUpdate(system *model.System) error {
	ret := _m.Called(system)
	if len(ret) == 0 {
		panic("no return value specified for SaveOrUpdate")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(*model.System) error); ok {
		r0 = rf(system)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *SystemStore) Update(system *model.System) error {
	ret := _m.Called(system)
	if len(ret) == 0 {
		panic("no return value specified for Update")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(*model.System) error); ok {
		r0 = rf(system)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewSystemStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *SystemStore {
	mock := &SystemStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}