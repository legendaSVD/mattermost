package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
	time "time"
)
type Scheduler struct {
	mock.Mock
}
func (_m *Scheduler) Enabled(cfg *model.Config) bool {
	ret := _m.Called(cfg)
	if len(ret) == 0 {
		panic("no return value specified for Enabled")
	}
	var r0 bool
	if rf, ok := ret.Get(0).(func(*model.Config) bool); ok {
		r0 = rf(cfg)
	} else {
		r0 = ret.Get(0).(bool)
	}
	return r0
}
func (_m *Scheduler) NextScheduleTime(cfg *model.Config, now time.Time, pendingJobs bool, lastSuccessfulJob *model.Job) *time.Time {
	ret := _m.Called(cfg, now, pendingJobs, lastSuccessfulJob)
	if len(ret) == 0 {
		panic("no return value specified for NextScheduleTime")
	}
	var r0 *time.Time
	if rf, ok := ret.Get(0).(func(*model.Config, time.Time, bool, *model.Job) *time.Time); ok {
		r0 = rf(cfg, now, pendingJobs, lastSuccessfulJob)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*time.Time)
		}
	}
	return r0
}
func (_m *Scheduler) ScheduleJob(rctx request.CTX, cfg *model.Config, pendingJobs bool, lastSuccessfulJob *model.Job) (*model.Job, *model.AppError) {
	ret := _m.Called(rctx, cfg, pendingJobs, lastSuccessfulJob)
	if len(ret) == 0 {
		panic("no return value specified for ScheduleJob")
	}
	var r0 *model.Job
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, *model.Config, bool, *model.Job) (*model.Job, *model.AppError)); ok {
		return rf(rctx, cfg, pendingJobs, lastSuccessfulJob)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, *model.Config, bool, *model.Job) *model.Job); ok {
		r0 = rf(rctx, cfg, pendingJobs, lastSuccessfulJob)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.Job)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, *model.Config, bool, *model.Job) *model.AppError); ok {
		r1 = rf(rctx, cfg, pendingJobs, lastSuccessfulJob)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func NewScheduler(t interface {
	mock.TestingT
	Cleanup(func())
}) *Scheduler {
	mock := &Scheduler{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}