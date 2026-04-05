package mocks
import (
	jobs "github.com/mattermost/mattermost/server/v8/einterfaces/jobs"
	mock "github.com/stretchr/testify/mock"
	model "github.com/mattermost/mattermost/server/public/model"
)
type CloudJobInterface struct {
	mock.Mock
}
func (_m *CloudJobInterface) MakeScheduler() jobs.Scheduler {
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
func (_m *CloudJobInterface) MakeWorker() model.Worker {
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
func NewCloudJobInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *CloudJobInterface {
	mock := &CloudJobInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}