package mocks
import (
	context "context"
	jobs "github.com/mattermost/mattermost/server/v8/einterfaces/jobs"
	mock "github.com/stretchr/testify/mock"
	model "github.com/mattermost/mattermost/server/public/model"
)
type AutoTranslationInterface struct {
	mock.Mock
}
func (_m *AutoTranslationInterface) Close() error {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for Close")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func() error); ok {
		r0 = rf()
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *AutoTranslationInterface) DetectRemote(ctx context.Context, text string) (string, *float64, *model.AppError) {
	ret := _m.Called(ctx, text)
	if len(ret) == 0 {
		panic("no return value specified for DetectRemote")
	}
	var r0 string
	var r1 *float64
	var r2 *model.AppError
	if rf, ok := ret.Get(0).(func(context.Context, string) (string, *float64, *model.AppError)); ok {
		return rf(ctx, text)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string) string); ok {
		r0 = rf(ctx, text)
	} else {
		r0 = ret.Get(0).(string)
	}
	if rf, ok := ret.Get(1).(func(context.Context, string) *float64); ok {
		r1 = rf(ctx, text)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*float64)
		}
	}
	if rf, ok := ret.Get(2).(func(context.Context, string) *model.AppError); ok {
		r2 = rf(ctx, text)
	} else {
		if ret.Get(2) != nil {
			r2 = ret.Get(2).(*model.AppError)
		}
	}
	return r0, r1, r2
}
func (_m *AutoTranslationInterface) GetBatch(objectType string, objectIDs []string, dstLang string) (map[string]*model.Translation, *model.AppError) {
	ret := _m.Called(objectType, objectIDs, dstLang)
	if len(ret) == 0 {
		panic("no return value specified for GetBatch")
	}
	var r0 map[string]*model.Translation
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(string, []string, string) (map[string]*model.Translation, *model.AppError)); ok {
		return rf(objectType, objectIDs, dstLang)
	}
	if rf, ok := ret.Get(0).(func(string, []string, string) map[string]*model.Translation); ok {
		r0 = rf(objectType, objectIDs, dstLang)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(map[string]*model.Translation)
		}
	}
	if rf, ok := ret.Get(1).(func(string, []string, string) *model.AppError); ok {
		r1 = rf(objectType, objectIDs, dstLang)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *AutoTranslationInterface) GetUserLanguage(userID string, channelID string) (string, *model.AppError) {
	ret := _m.Called(userID, channelID)
	if len(ret) == 0 {
		panic("no return value specified for GetUserLanguage")
	}
	var r0 string
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(string, string) (string, *model.AppError)); ok {
		return rf(userID, channelID)
	}
	if rf, ok := ret.Get(0).(func(string, string) string); ok {
		r0 = rf(userID, channelID)
	} else {
		r0 = ret.Get(0).(string)
	}
	if rf, ok := ret.Get(1).(func(string, string) *model.AppError); ok {
		r1 = rf(userID, channelID)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *AutoTranslationInterface) IsChannelEnabled(channelID string) (bool, *model.AppError) {
	ret := _m.Called(channelID)
	if len(ret) == 0 {
		panic("no return value specified for IsChannelEnabled")
	}
	var r0 bool
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(string) (bool, *model.AppError)); ok {
		return rf(channelID)
	}
	if rf, ok := ret.Get(0).(func(string) bool); ok {
		r0 = rf(channelID)
	} else {
		r0 = ret.Get(0).(bool)
	}
	if rf, ok := ret.Get(1).(func(string) *model.AppError); ok {
		r1 = rf(channelID)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *AutoTranslationInterface) IsFeatureAvailable() bool {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for IsFeatureAvailable")
	}
	var r0 bool
	if rf, ok := ret.Get(0).(func() bool); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(bool)
	}
	return r0
}
func (_m *AutoTranslationInterface) IsUserEnabled(channelID string, userID string) (bool, *model.AppError) {
	ret := _m.Called(channelID, userID)
	if len(ret) == 0 {
		panic("no return value specified for IsUserEnabled")
	}
	var r0 bool
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(string, string) (bool, *model.AppError)); ok {
		return rf(channelID, userID)
	}
	if rf, ok := ret.Get(0).(func(string, string) bool); ok {
		r0 = rf(channelID, userID)
	} else {
		r0 = ret.Get(0).(bool)
	}
	if rf, ok := ret.Get(1).(func(string, string) *model.AppError); ok {
		r1 = rf(channelID, userID)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *AutoTranslationInterface) MakeScheduler() jobs.Scheduler {
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
func (_m *AutoTranslationInterface) MakeWorker() model.Worker {
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
func (_m *AutoTranslationInterface) Shutdown() error {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for Shutdown")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func() error); ok {
		r0 = rf()
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *AutoTranslationInterface) Start() error {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for Start")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func() error); ok {
		r0 = rf()
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *AutoTranslationInterface) Translate(ctx context.Context, objectType string, objectID string, channelID string, userID string, content interface{}) (*model.Translation, *model.AppError) {
	ret := _m.Called(ctx, objectType, objectID, channelID, userID, content)
	if len(ret) == 0 {
		panic("no return value specified for Translate")
	}
	var r0 *model.Translation
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, string, interface{}) (*model.Translation, *model.AppError)); ok {
		return rf(ctx, objectType, objectID, channelID, userID, content)
	}
	if rf, ok := ret.Get(0).(func(context.Context, string, string, string, string, interface{}) *model.Translation); ok {
		r0 = rf(ctx, objectType, objectID, channelID, userID, content)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.Translation)
		}
	}
	if rf, ok := ret.Get(1).(func(context.Context, string, string, string, string, interface{}) *model.AppError); ok {
		r1 = rf(ctx, objectType, objectID, channelID, userID, content)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func NewAutoTranslationInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *AutoTranslationInterface {
	mock := &AutoTranslationInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}