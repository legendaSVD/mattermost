package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type ElasticsearchFixChannelIndexInterface struct {
	mock.Mock
}
func (_m *ElasticsearchFixChannelIndexInterface) MakeWorker() model.Worker {
	ret := _m.Called()
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
type mockConstructorTestingTNewElasticsearchFixChannelIndexInterface interface {
	mock.TestingT
	Cleanup(func())
}
func NewElasticsearchFixChannelIndexInterface(t mockConstructorTestingTNewElasticsearchFixChannelIndexInterface) *ElasticsearchFixChannelIndexInterface {
	mock := &ElasticsearchFixChannelIndexInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}