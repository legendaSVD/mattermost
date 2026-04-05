package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type IndexerJobInterface struct {
	mock.Mock
}
func (_m *IndexerJobInterface) MakeWorker() model.Worker {
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
func NewIndexerJobInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *IndexerJobInterface {
	mock := &IndexerJobInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}