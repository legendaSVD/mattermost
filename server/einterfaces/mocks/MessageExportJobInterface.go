package mocks
import (
	jobs "github.com/mattermost/mattermost/server/v8/einterfaces/jobs"
	mock "github.com/stretchr/testify/mock"
	model "github.com/mattermost/mattermost/server/public/model"
)
type MessageExportJobInterface struct {
	mock.Mock
}
func (_m *MessageExportJobInterface) MakeScheduler() jobs.Scheduler {
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
func (_m *MessageExportJobInterface) MakeWorker() model.Worker {
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
func NewMessageExportJobInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *MessageExportJobInterface {
	mock := &MessageExportJobInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}