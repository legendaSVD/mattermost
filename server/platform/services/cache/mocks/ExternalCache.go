package mocks
import (
	time "time"
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type ExternalCache struct {
	mock.Mock
}
func (_m *ExternalCache) Decrement(key string, val int) error {
	ret := _m.Called(key, val)
	if len(ret) == 0 {
		panic("no return value specified for Decrement")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, int) error); ok {
		r0 = rf(key, val)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ExternalCache) Get(key string, value interface{}) error {
	ret := _m.Called(key, value)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, interface{}) error); ok {
		r0 = rf(key, value)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ExternalCache) GetInvalidateClusterEvent() model.ClusterEvent {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GetInvalidateClusterEvent")
	}
	var r0 model.ClusterEvent
	if rf, ok := ret.Get(0).(func() model.ClusterEvent); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(model.ClusterEvent)
	}
	return r0
}
func (_m *ExternalCache) GetMulti(keys []string, values []interface{}) []error {
	ret := _m.Called(keys, values)
	if len(ret) == 0 {
		panic("no return value specified for GetMulti")
	}
	var r0 []error
	if rf, ok := ret.Get(0).(func([]string, []interface{}) []error); ok {
		r0 = rf(keys, values)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]error)
		}
	}
	return r0
}
func (_m *ExternalCache) Increment(key string, val int) error {
	ret := _m.Called(key, val)
	if len(ret) == 0 {
		panic("no return value specified for Increment")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, int) error); ok {
		r0 = rf(key, val)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ExternalCache) Name() string {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for Name")
	}
	var r0 string
	if rf, ok := ret.Get(0).(func() string); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(string)
	}
	return r0
}
func (_m *ExternalCache) Purge() error {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for Purge")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func() error); ok {
		r0 = rf()
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ExternalCache) Remove(key string) error {
	ret := _m.Called(key)
	if len(ret) == 0 {
		panic("no return value specified for Remove")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(key)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ExternalCache) RemoveMulti(keys []string) error {
	ret := _m.Called(keys)
	if len(ret) == 0 {
		panic("no return value specified for RemoveMulti")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func([]string) error); ok {
		r0 = rf(keys)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ExternalCache) Scan(f func([]string) error) error {
	ret := _m.Called(f)
	if len(ret) == 0 {
		panic("no return value specified for Scan")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(func([]string) error) error); ok {
		r0 = rf(f)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ExternalCache) SetWithDefaultExpiry(key string, value interface{}) error {
	ret := _m.Called(key, value)
	if len(ret) == 0 {
		panic("no return value specified for SetWithDefaultExpiry")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, interface{}) error); ok {
		r0 = rf(key, value)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ExternalCache) SetWithExpiry(key string, value interface{}, ttl time.Duration) error {
	ret := _m.Called(key, value, ttl)
	if len(ret) == 0 {
		panic("no return value specified for SetWithExpiry")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, interface{}, time.Duration) error); ok {
		r0 = rf(key, value, ttl)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewExternalCache(t interface {
	mock.TestingT
	Cleanup(func())
}) *ExternalCache {
	mock := &ExternalCache{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}