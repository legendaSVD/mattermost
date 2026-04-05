package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type CommandStore struct {
	mock.Mock
}
func (_m *CommandStore) AnalyticsCommandCount(teamID string) (int64, error) {
	ret := _m.Called(teamID)
	if len(ret) == 0 {
		panic("no return value specified for AnalyticsCommandCount")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (int64, error)); ok {
		return rf(teamID)
	}
	if rf, ok := ret.Get(0).(func(string) int64); ok {
		r0 = rf(teamID)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(teamID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *CommandStore) Delete(commandID string, timestamp int64) error {
	ret := _m.Called(commandID, timestamp)
	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, int64) error); ok {
		r0 = rf(commandID, timestamp)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *CommandStore) Get(id string) (*model.Command, error) {
	ret := _m.Called(id)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 *model.Command
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (*model.Command, error)); ok {
		return rf(id)
	}
	if rf, ok := ret.Get(0).(func(string) *model.Command); ok {
		r0 = rf(id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.Command)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(id)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *CommandStore) GetByTeam(teamID string) ([]*model.Command, error) {
	ret := _m.Called(teamID)
	if len(ret) == 0 {
		panic("no return value specified for GetByTeam")
	}
	var r0 []*model.Command
	var r1 error
	if rf, ok := ret.Get(0).(func(string) ([]*model.Command, error)); ok {
		return rf(teamID)
	}
	if rf, ok := ret.Get(0).(func(string) []*model.Command); ok {
		r0 = rf(teamID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.Command)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(teamID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *CommandStore) GetByTrigger(teamID string, trigger string) (*model.Command, error) {
	ret := _m.Called(teamID, trigger)
	if len(ret) == 0 {
		panic("no return value specified for GetByTrigger")
	}
	var r0 *model.Command
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string) (*model.Command, error)); ok {
		return rf(teamID, trigger)
	}
	if rf, ok := ret.Get(0).(func(string, string) *model.Command); ok {
		r0 = rf(teamID, trigger)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.Command)
		}
	}
	if rf, ok := ret.Get(1).(func(string, string) error); ok {
		r1 = rf(teamID, trigger)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *CommandStore) PermanentDeleteByTeam(teamID string) error {
	ret := _m.Called(teamID)
	if len(ret) == 0 {
		panic("no return value specified for PermanentDeleteByTeam")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(teamID)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *CommandStore) PermanentDeleteByUser(userID string) error {
	ret := _m.Called(userID)
	if len(ret) == 0 {
		panic("no return value specified for PermanentDeleteByUser")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(userID)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *CommandStore) Save(webhook *model.Command) (*model.Command, error) {
	ret := _m.Called(webhook)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 *model.Command
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.Command) (*model.Command, error)); ok {
		return rf(webhook)
	}
	if rf, ok := ret.Get(0).(func(*model.Command) *model.Command); ok {
		r0 = rf(webhook)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.Command)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.Command) error); ok {
		r1 = rf(webhook)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *CommandStore) Update(hook *model.Command) (*model.Command, error) {
	ret := _m.Called(hook)
	if len(ret) == 0 {
		panic("no return value specified for Update")
	}
	var r0 *model.Command
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.Command) (*model.Command, error)); ok {
		return rf(hook)
	}
	if rf, ok := ret.Get(0).(func(*model.Command) *model.Command); ok {
		r0 = rf(hook)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.Command)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.Command) error); ok {
		r1 = rf(hook)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func NewCommandStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *CommandStore {
	mock := &CommandStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}