package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type ComplianceInterface struct {
	mock.Mock
}
func (_m *ComplianceInterface) RunComplianceJob(rctx request.CTX, job *model.Compliance) *model.AppError {
	ret := _m.Called(rctx, job)
	if len(ret) == 0 {
		panic("no return value specified for RunComplianceJob")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, *model.Compliance) *model.AppError); ok {
		r0 = rf(rctx, job)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func (_m *ComplianceInterface) StartComplianceDailyJob() {
	_m.Called()
}
func NewComplianceInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *ComplianceInterface {
	mock := &ComplianceInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}