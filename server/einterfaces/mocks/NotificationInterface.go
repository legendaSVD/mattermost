package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type NotificationInterface struct {
	mock.Mock
}
func (_m *NotificationInterface) CheckLicense() *model.AppError {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for CheckLicense")
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
func (_m *NotificationInterface) GetNotificationMessage(rctx request.CTX, ack *model.PushNotificationAck, userID string) (*model.PushNotification, *model.AppError) {
	ret := _m.Called(rctx, ack, userID)
	if len(ret) == 0 {
		panic("no return value specified for GetNotificationMessage")
	}
	var r0 *model.PushNotification
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, *model.PushNotificationAck, string) (*model.PushNotification, *model.AppError)); ok {
		return rf(rctx, ack, userID)
	}
	if rf, ok := ret.Get(0).(func(request.CTX, *model.PushNotificationAck, string) *model.PushNotification); ok {
		r0 = rf(rctx, ack, userID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.PushNotification)
		}
	}
	if rf, ok := ret.Get(1).(func(request.CTX, *model.PushNotificationAck, string) *model.AppError); ok {
		r1 = rf(rctx, ack, userID)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func NewNotificationInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *NotificationInterface {
	mock := &NotificationInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}