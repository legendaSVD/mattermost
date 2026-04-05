package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type DataRetentionInterface struct {
	mock.Mock
}
func (_m *DataRetentionInterface) AddChannelsToPolicy(policyID string, channelIDs []string) *model.AppError {
	ret := _m.Called(policyID, channelIDs)
	if len(ret) == 0 {
		panic("no return value specified for AddChannelsToPolicy")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func(string, []string) *model.AppError); ok {
		r0 = rf(policyID, channelIDs)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func (_m *DataRetentionInterface) AddTeamsToPolicy(policyID string, teamIDs []string) *model.AppError {
	ret := _m.Called(policyID, teamIDs)
	if len(ret) == 0 {
		panic("no return value specified for AddTeamsToPolicy")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func(string, []string) *model.AppError); ok {
		r0 = rf(policyID, teamIDs)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func (_m *DataRetentionInterface) CreatePolicy(policy *model.RetentionPolicyWithTeamAndChannelIDs) (*model.RetentionPolicyWithTeamAndChannelCounts, *model.AppError) {
	ret := _m.Called(policy)
	if len(ret) == 0 {
		panic("no return value specified for CreatePolicy")
	}
	var r0 *model.RetentionPolicyWithTeamAndChannelCounts
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(*model.RetentionPolicyWithTeamAndChannelIDs) (*model.RetentionPolicyWithTeamAndChannelCounts, *model.AppError)); ok {
		return rf(policy)
	}
	if rf, ok := ret.Get(0).(func(*model.RetentionPolicyWithTeamAndChannelIDs) *model.RetentionPolicyWithTeamAndChannelCounts); ok {
		r0 = rf(policy)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.RetentionPolicyWithTeamAndChannelCounts)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.RetentionPolicyWithTeamAndChannelIDs) *model.AppError); ok {
		r1 = rf(policy)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) DeletePolicy(policyID string) *model.AppError {
	ret := _m.Called(policyID)
	if len(ret) == 0 {
		panic("no return value specified for DeletePolicy")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func(string) *model.AppError); ok {
		r0 = rf(policyID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func (_m *DataRetentionInterface) GetChannelPoliciesForUser(userID string, offset int, limit int) (*model.RetentionPolicyForChannelList, *model.AppError) {
	ret := _m.Called(userID, offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetChannelPoliciesForUser")
	}
	var r0 *model.RetentionPolicyForChannelList
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(string, int, int) (*model.RetentionPolicyForChannelList, *model.AppError)); ok {
		return rf(userID, offset, limit)
	}
	if rf, ok := ret.Get(0).(func(string, int, int) *model.RetentionPolicyForChannelList); ok {
		r0 = rf(userID, offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.RetentionPolicyForChannelList)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int, int) *model.AppError); ok {
		r1 = rf(userID, offset, limit)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) GetChannelsForPolicy(policyID string, offset int, limit int) (*model.ChannelsWithCount, *model.AppError) {
	ret := _m.Called(policyID, offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetChannelsForPolicy")
	}
	var r0 *model.ChannelsWithCount
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(string, int, int) (*model.ChannelsWithCount, *model.AppError)); ok {
		return rf(policyID, offset, limit)
	}
	if rf, ok := ret.Get(0).(func(string, int, int) *model.ChannelsWithCount); ok {
		r0 = rf(policyID, offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.ChannelsWithCount)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int, int) *model.AppError); ok {
		r1 = rf(policyID, offset, limit)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) GetGlobalPolicy() (*model.GlobalRetentionPolicy, *model.AppError) {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GetGlobalPolicy")
	}
	var r0 *model.GlobalRetentionPolicy
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func() (*model.GlobalRetentionPolicy, *model.AppError)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() *model.GlobalRetentionPolicy); ok {
		r0 = rf()
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.GlobalRetentionPolicy)
		}
	}
	if rf, ok := ret.Get(1).(func() *model.AppError); ok {
		r1 = rf()
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) GetPolicies(offset int, limit int) (*model.RetentionPolicyWithTeamAndChannelCountsList, *model.AppError) {
	ret := _m.Called(offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetPolicies")
	}
	var r0 *model.RetentionPolicyWithTeamAndChannelCountsList
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(int, int) (*model.RetentionPolicyWithTeamAndChannelCountsList, *model.AppError)); ok {
		return rf(offset, limit)
	}
	if rf, ok := ret.Get(0).(func(int, int) *model.RetentionPolicyWithTeamAndChannelCountsList); ok {
		r0 = rf(offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.RetentionPolicyWithTeamAndChannelCountsList)
		}
	}
	if rf, ok := ret.Get(1).(func(int, int) *model.AppError); ok {
		r1 = rf(offset, limit)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) GetPoliciesCount() (int64, *model.AppError) {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GetPoliciesCount")
	}
	var r0 int64
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func() (int64, *model.AppError)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() int64); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func() *model.AppError); ok {
		r1 = rf()
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) GetPolicy(policyID string) (*model.RetentionPolicyWithTeamAndChannelCounts, *model.AppError) {
	ret := _m.Called(policyID)
	if len(ret) == 0 {
		panic("no return value specified for GetPolicy")
	}
	var r0 *model.RetentionPolicyWithTeamAndChannelCounts
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(string) (*model.RetentionPolicyWithTeamAndChannelCounts, *model.AppError)); ok {
		return rf(policyID)
	}
	if rf, ok := ret.Get(0).(func(string) *model.RetentionPolicyWithTeamAndChannelCounts); ok {
		r0 = rf(policyID)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.RetentionPolicyWithTeamAndChannelCounts)
		}
	}
	if rf, ok := ret.Get(1).(func(string) *model.AppError); ok {
		r1 = rf(policyID)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) GetTeamPoliciesForUser(userID string, offset int, limit int) (*model.RetentionPolicyForTeamList, *model.AppError) {
	ret := _m.Called(userID, offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetTeamPoliciesForUser")
	}
	var r0 *model.RetentionPolicyForTeamList
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(string, int, int) (*model.RetentionPolicyForTeamList, *model.AppError)); ok {
		return rf(userID, offset, limit)
	}
	if rf, ok := ret.Get(0).(func(string, int, int) *model.RetentionPolicyForTeamList); ok {
		r0 = rf(userID, offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.RetentionPolicyForTeamList)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int, int) *model.AppError); ok {
		r1 = rf(userID, offset, limit)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) GetTeamsForPolicy(policyID string, offset int, limit int) (*model.TeamsWithCount, *model.AppError) {
	ret := _m.Called(policyID, offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetTeamsForPolicy")
	}
	var r0 *model.TeamsWithCount
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(string, int, int) (*model.TeamsWithCount, *model.AppError)); ok {
		return rf(policyID, offset, limit)
	}
	if rf, ok := ret.Get(0).(func(string, int, int) *model.TeamsWithCount); ok {
		r0 = rf(policyID, offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.TeamsWithCount)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int, int) *model.AppError); ok {
		r1 = rf(policyID, offset, limit)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) PatchPolicy(patch *model.RetentionPolicyWithTeamAndChannelIDs) (*model.RetentionPolicyWithTeamAndChannelCounts, *model.AppError) {
	ret := _m.Called(patch)
	if len(ret) == 0 {
		panic("no return value specified for PatchPolicy")
	}
	var r0 *model.RetentionPolicyWithTeamAndChannelCounts
	var r1 *model.AppError
	if rf, ok := ret.Get(0).(func(*model.RetentionPolicyWithTeamAndChannelIDs) (*model.RetentionPolicyWithTeamAndChannelCounts, *model.AppError)); ok {
		return rf(patch)
	}
	if rf, ok := ret.Get(0).(func(*model.RetentionPolicyWithTeamAndChannelIDs) *model.RetentionPolicyWithTeamAndChannelCounts); ok {
		r0 = rf(patch)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.RetentionPolicyWithTeamAndChannelCounts)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.RetentionPolicyWithTeamAndChannelIDs) *model.AppError); ok {
		r1 = rf(patch)
	} else {
		if ret.Get(1) != nil {
			r1 = ret.Get(1).(*model.AppError)
		}
	}
	return r0, r1
}
func (_m *DataRetentionInterface) RemoveChannelsFromPolicy(policyID string, channelIDs []string) *model.AppError {
	ret := _m.Called(policyID, channelIDs)
	if len(ret) == 0 {
		panic("no return value specified for RemoveChannelsFromPolicy")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func(string, []string) *model.AppError); ok {
		r0 = rf(policyID, channelIDs)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func (_m *DataRetentionInterface) RemoveTeamsFromPolicy(policyID string, teamIDs []string) *model.AppError {
	ret := _m.Called(policyID, teamIDs)
	if len(ret) == 0 {
		panic("no return value specified for RemoveTeamsFromPolicy")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func(string, []string) *model.AppError); ok {
		r0 = rf(policyID, teamIDs)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func NewDataRetentionInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *DataRetentionInterface {
	mock := &DataRetentionInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}