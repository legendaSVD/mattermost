package mocks
import (
	jobs "github.com/mattermost/mattermost/server/v8/einterfaces/jobs"
	mock "github.com/stretchr/testify/mock"
	model "github.com/mattermost/mattermost/server/public/model"
)
type PushProxyInterface struct {
	mock.Mock
}
func (_m *PushProxyInterface) DeleteAuthToken() *model.AppError {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for DeleteAuthToken")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func() *model.AppError); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func (_m *PushProxyInterface) GenerateAuthToken() *model.AppError {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GenerateAuthToken")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func() *model.AppError); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func (_m *PushProxyInterface) GetAuthToken() string {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GetAuthToken")
	}
	var r0 string
	if rf, ok := ret.Get(0).(func() string); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(string)
	}
	return r0
}
func (_m *PushProxyInterface) MakeScheduler() jobs.Scheduler {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for MakeScheduler")
	}
	var r0 jobs.Scheduler
	if rf, ok := ret.Get(0).(func() jobs.Scheduler); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(jobs.Scheduler)
		}
	}
	return r0
}
func (_m *PushProxyInterface) MakeWorker() model.Worker {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for MakeWorker")
	}
	var r0 model.Worker
	if rf, ok := ret.Get(0).(func() model.Worker); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(model.Worker)
		}
	}
	return r0
}
func NewPushProxyInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *PushProxyInterface {
	mock := &PushProxyInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}