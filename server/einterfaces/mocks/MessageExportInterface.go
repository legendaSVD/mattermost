package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type MessageExportInterface struct {
	mock.Mock
}
func (_m *MessageExportInterface) StartSynchronizeJob(rctx request.CTX, exportFromTimestamp int64) (*model.Job, *model.AppError) {
	ret := _m.Called(rctx, exportFromTimestamp)
	if len(ret) == 0 {
		panic("no return value specified for StartSynchronizeJob")
	}
	var r0 *model.Job
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, int64) (*model.Job, *model.AppError)); ok {
		return rf(rctx, exportFromTimestamp)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, int64) *model.Job); ok {
		r0 = rf(rctx, exportFromTimestamp)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.Job)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, int64) *model.AppError); ok {
		r1 = rf(rctx, exportFromTimestamp)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func NewMessageExportInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *MessageExportInterface {
	mock := &MessageExportInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}