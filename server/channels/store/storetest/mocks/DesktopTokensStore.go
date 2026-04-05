package mocks
import mock "github.com/stretchr/testify/mock"
type DesktopTokensStore struct {
	mock.Mock
}
func (_m *DesktopTokensStore) Delete(token string) error {
	ret := _m.Called(token)
	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(token)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *DesktopTokensStore) DeleteByUserId(userID string) error {
	ret := _m.Called(userID)
	if len(ret) == 0 {
		panic("no return value specified for DeleteByUserId")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(userID)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *DesktopTokensStore) DeleteOlderThan(minCreatedAt int64) error {
	ret := _m.Called(minCreatedAt)
	if len(ret) == 0 {
		panic("no return value specified for DeleteOlderThan")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(int64) error); ok {
		r0 = rf(minCreatedAt)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *DesktopTokensStore) GetUserId(token string, minCreatedAt int64) (*string, error) {
	ret := _m.Called(token, minCreatedAt)
	if len(ret) == 0 {
		panic("no return value specified for GetUserId")
	}
	var r0 *string
	var r1 error
	if rf, ok := ret.Get(0).(func(string, int64) (*string, error)); ok {
		return rf(token, minCreatedAt)
	}
	if rf, ok := ret.Get(0).(func(string, int64) *string); ok {
		r0 = rf(token, minCreatedAt)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*string)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int64) error); ok {
		r1 = rf(token, minCreatedAt)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *DesktopTokensStore) Insert(token string, createAt int64, userID string) error {
	ret := _m.Called(token, createAt, userID)
	if len(ret) == 0 {
		panic("no return value specified for Insert")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, int64, string) error); ok {
		r0 = rf(token, createAt, userID)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewDesktopTokensStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *DesktopTokensStore {
	mock := &DesktopTokensStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}