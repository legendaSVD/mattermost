package mocks
import (
	time "time"
	mock "github.com/stretchr/testify/mock"
)
type FileBackendWithLinkGenerator struct {
	mock.Mock
}
func (_m *FileBackendWithLinkGenerator) GeneratePublicLink(path string) (string, time.Duration, error) {
	ret := _m.Called(path)
	if len(ret) == 0 {
		panic("no return value specified for GeneratePublicLink")
	}
	var r0 string
	var r1 time.Duration
	var r2 error
	if rf, ok := ret.Get(0).(func(string) (string, time.Duration, error)); ok {
		return rf(path)
	}
	if rf, ok := ret.Get(0).(func(string) string); ok {
		r0 = rf(path)
	} else {
		r0 = ret.Get(0).(string)
	}
	if rf, ok := ret.Get(1).(func(string) time.Duration); ok {
		r1 = rf(path)
	} else {
		r1 = ret.Get(1).(time.Duration)
	}
	if rf, ok := ret.Get(2).(func(string) error); ok {
		r2 = rf(path)
	} else {
		r2 = ret.Error(2)
	}
	return r0, r1, r2
}
func NewFileBackendWithLinkGenerator(t interface {
	mock.TestingT
	Cleanup(func())
}) *FileBackendWithLinkGenerator {
	mock := &FileBackendWithLinkGenerator{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}