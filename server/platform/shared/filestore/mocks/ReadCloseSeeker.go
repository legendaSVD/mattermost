package mocks
import mock "github.com/stretchr/testify/mock"
type ReadCloseSeeker struct {
	mock.Mock
}
func (_m *ReadCloseSeeker) Close() error {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for Close")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func() error); ok {
		r0 = rf()
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ReadCloseSeeker) Read(p []byte) (int, error) {
	ret := _m.Called(p)
	if len(ret) == 0 {
		panic("no return value specified for Read")
	}
	var r0 int
	var r1 error
	if rf, ok := ret.Get(0).(func([]byte) (int, error)); ok {
		return rf(p)
	}
	if rf, ok := ret.Get(0).(func([]byte) int); ok {
		r0 = rf(p)
	} else {
		r0 = ret.Get(0).(int)
	}
	if rf, ok := ret.Get(1).(func([]byte) error); ok {
		r1 = rf(p)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *ReadCloseSeeker) Seek(offset int64, whence int) (int64, error) {
	ret := _m.Called(offset, whence)
	if len(ret) == 0 {
		panic("no return value specified for Seek")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(int64, int) (int64, error)); ok {
		return rf(offset, whence)
	}
	if rf, ok := ret.Get(0).(func(int64, int) int64); ok {
		r0 = rf(offset, whence)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(int64, int) error); ok {
		r1 = rf(offset, whence)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func NewReadCloseSeeker(t interface {
	mock.TestingT
	Cleanup(func())
}) *ReadCloseSeeker {
	mock := &ReadCloseSeeker{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}