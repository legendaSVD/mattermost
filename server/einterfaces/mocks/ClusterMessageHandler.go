package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type ClusterMessageHandler struct {
	mock.Mock
}
func (_m *ClusterMessageHandler) Execute(msg *model.ClusterMessage) {
	_m.Called(msg)
}
func NewClusterMessageHandler(t interface {
	mock.TestingT
	Cleanup(func())
}) *ClusterMessageHandler {
	mock := &ClusterMessageHandler{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}