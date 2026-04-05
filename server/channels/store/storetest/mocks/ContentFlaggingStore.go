package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type ContentFlaggingStore struct {
	mock.Mock
}
func (_m *ContentFlaggingStore) ClearCaches() {
	_m.Called()
}
func (_m *ContentFlaggingStore) GetReviewerSettings() (*model.ReviewerIDsSettings, error) {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GetReviewerSettings")
	}
	var r0 *model.ReviewerIDsSettings
	var r1 error
	if rf, ok := ret.Get(0).(func() (*model.ReviewerIDsSettings, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() *model.ReviewerIDsSettings); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.ReviewerIDsSettings)
		}
	}
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *ContentFlaggingStore) SaveReviewerSettings(reviewerSettings model.ReviewerIDsSettings) error {
	ret := _m.Called(reviewerSettings)
	if len(ret) == 0 {
		panic("no return value specified for SaveReviewerSettings")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(model.ReviewerIDsSettings) error); ok {
		r0 = rf(reviewerSettings)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewContentFlaggingStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *ContentFlaggingStore {
	mock := &ContentFlaggingStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}