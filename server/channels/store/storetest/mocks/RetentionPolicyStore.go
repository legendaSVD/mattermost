package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type RetentionPolicyStore struct {
	mock.Mock
}
func (_m *RetentionPolicyStore) AddChannels(policyID string, channelIds []string) error {
	ret := _m.Called(policyID, channelIds)
	if len(ret) == 0 {
		panic("no return value specified for AddChannels")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, []string) error); ok {
		r0 = rf(policyID, channelIds)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *RetentionPolicyStore) AddTeams(policyID string, teamIds []string) error {
	ret := _m.Called(policyID, teamIds)
	if len(ret) == 0 {
		panic("no return value specified for AddTeams")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, []string) error); ok {
		r0 = rf(policyID, teamIds)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *RetentionPolicyStore) Delete(id string) error {
	ret := _m.Called(id)
	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string) error); ok {
		r0 = rf(id)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *RetentionPolicyStore) DeleteOrphanedRows(limit int) (int64, error) {
	ret := _m.Called(limit)
	if len(ret) == 0 {
		panic("no return value specified for DeleteOrphanedRows")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(int) (int64, error)); ok {
		return rf(limit)
	}
	if rf, ok := ret.Get(0).(func(int) int64); ok {
		r0 = rf(limit)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(int) error); ok {
		r1 = rf(limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) Get(id string) (*model.RetentionPolicyWithTeamAndChannelCounts, error) {
	ret := _m.Called(id)
	if len(ret) == 0 {
		panic("no return value specified for Get")
	}
	var r0 *model.RetentionPolicyWithTeamAndChannelCounts
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (*model.RetentionPolicyWithTeamAndChannelCounts, error)); ok {
		return rf(id)
	}
	if rf, ok := ret.Get(0).(func(string) *model.RetentionPolicyWithTeamAndChannelCounts); ok {
		r0 = rf(id)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.RetentionPolicyWithTeamAndChannelCounts)
		}
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(id)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetAll(offset int, limit int) ([]*model.RetentionPolicyWithTeamAndChannelCounts, error) {
	ret := _m.Called(offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetAll")
	}
	var r0 []*model.RetentionPolicyWithTeamAndChannelCounts
	var r1 error
	if rf, ok := ret.Get(0).(func(int, int) ([]*model.RetentionPolicyWithTeamAndChannelCounts, error)); ok {
		return rf(offset, limit)
	}
	if rf, ok := ret.Get(0).(func(int, int) []*model.RetentionPolicyWithTeamAndChannelCounts); ok {
		r0 = rf(offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.RetentionPolicyWithTeamAndChannelCounts)
		}
	}
	if rf, ok := ret.Get(1).(func(int, int) error); ok {
		r1 = rf(offset, limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetChannelPoliciesCountForUser(userID string) (int64, error) {
	ret := _m.Called(userID)
	if len(ret) == 0 {
		panic("no return value specified for GetChannelPoliciesCountForUser")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (int64, error)); ok {
		return rf(userID)
	}
	if rf, ok := ret.Get(0).(func(string) int64); ok {
		r0 = rf(userID)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(userID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetChannelPoliciesForUser(userID string, offset int, limit int) ([]*model.RetentionPolicyForChannel, error) {
	ret := _m.Called(userID, offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetChannelPoliciesForUser")
	}
	var r0 []*model.RetentionPolicyForChannel
	var r1 error
	if rf, ok := ret.Get(0).(func(string, int, int) ([]*model.RetentionPolicyForChannel, error)); ok {
		return rf(userID, offset, limit)
	}
	if rf, ok := ret.Get(0).(func(string, int, int) []*model.RetentionPolicyForChannel); ok {
		r0 = rf(userID, offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.RetentionPolicyForChannel)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int, int) error); ok {
		r1 = rf(userID, offset, limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetChannels(policyID string, offset int, limit int) (model.ChannelListWithTeamData, error) {
	ret := _m.Called(policyID, offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetChannels")
	}
	var r0 model.ChannelListWithTeamData
	var r1 error
	if rf, ok := ret.Get(0).(func(string, int, int) (model.ChannelListWithTeamData, error)); ok {
		return rf(policyID, offset, limit)
	}
	if rf, ok := ret.Get(0).(func(string, int, int) model.ChannelListWithTeamData); ok {
		r0 = rf(policyID, offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(model.ChannelListWithTeamData)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int, int) error); ok {
		r1 = rf(policyID, offset, limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetChannelsCount(policyID string) (int64, error) {
	ret := _m.Called(policyID)
	if len(ret) == 0 {
		panic("no return value specified for GetChannelsCount")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (int64, error)); ok {
		return rf(policyID)
	}
	if rf, ok := ret.Get(0).(func(string) int64); ok {
		r0 = rf(policyID)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(policyID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetCount() (int64, error) {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for GetCount")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func() (int64, error)); ok {
		return rf()
	}
	if rf, ok := ret.Get(0).(func() int64); ok {
		r0 = rf()
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func() error); ok {
		r1 = rf()
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetIdsForDeletionByTableName(tableName string, limit int) ([]*model.RetentionIdsForDeletion, error) {
	ret := _m.Called(tableName, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetIdsForDeletionByTableName")
	}
	var r0 []*model.RetentionIdsForDeletion
	var r1 error
	if rf, ok := ret.Get(0).(func(string, int) ([]*model.RetentionIdsForDeletion, error)); ok {
		return rf(tableName, limit)
	}
	if rf, ok := ret.Get(0).(func(string, int) []*model.RetentionIdsForDeletion); ok {
		r0 = rf(tableName, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.RetentionIdsForDeletion)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int) error); ok {
		r1 = rf(tableName, limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetTeamPoliciesCountForUser(userID string) (int64, error) {
	ret := _m.Called(userID)
	if len(ret) == 0 {
		panic("no return value specified for GetTeamPoliciesCountForUser")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (int64, error)); ok {
		return rf(userID)
	}
	if rf, ok := ret.Get(0).(func(string) int64); ok {
		r0 = rf(userID)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(userID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetTeamPoliciesForUser(userID string, offset int, limit int) ([]*model.RetentionPolicyForTeam, error) {
	ret := _m.Called(userID, offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetTeamPoliciesForUser")
	}
	var r0 []*model.RetentionPolicyForTeam
	var r1 error
	if rf, ok := ret.Get(0).(func(string, int, int) ([]*model.RetentionPolicyForTeam, error)); ok {
		return rf(userID, offset, limit)
	}
	if rf, ok := ret.Get(0).(func(string, int, int) []*model.RetentionPolicyForTeam); ok {
		r0 = rf(userID, offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.RetentionPolicyForTeam)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int, int) error); ok {
		r1 = rf(userID, offset, limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetTeams(policyID string, offset int, limit int) ([]*model.Team, error) {
	ret := _m.Called(policyID, offset, limit)
	if len(ret) == 0 {
		panic("no return value specified for GetTeams")
	}
	var r0 []*model.Team
	var r1 error
	if rf, ok := ret.Get(0).(func(string, int, int) ([]*model.Team, error)); ok {
		return rf(policyID, offset, limit)
	}
	if rf, ok := ret.Get(0).(func(string, int, int) []*model.Team); ok {
		r0 = rf(policyID, offset, limit)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.Team)
		}
	}
	if rf, ok := ret.Get(1).(func(string, int, int) error); ok {
		r1 = rf(policyID, offset, limit)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) GetTeamsCount(policyID string) (int64, error) {
	ret := _m.Called(policyID)
	if len(ret) == 0 {
		panic("no return value specified for GetTeamsCount")
	}
	var r0 int64
	var r1 error
	if rf, ok := ret.Get(0).(func(string) (int64, error)); ok {
		return rf(policyID)
	}
	if rf, ok := ret.Get(0).(func(string) int64); ok {
		r0 = rf(policyID)
	} else {
		r0 = ret.Get(0).(int64)
	}
	if rf, ok := ret.Get(1).(func(string) error); ok {
		r1 = rf(policyID)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) Patch(patch *model.RetentionPolicyWithTeamAndChannelIDs) (*model.RetentionPolicyWithTeamAndChannelCounts, error) {
	ret := _m.Called(patch)
	if len(ret) == 0 {
		panic("no return value specified for Patch")
	}
	var r0 *model.RetentionPolicyWithTeamAndChannelCounts
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.RetentionPolicyWithTeamAndChannelIDs) (*model.RetentionPolicyWithTeamAndChannelCounts, error)); ok {
		return rf(patch)
	}
	if rf, ok := ret.Get(0).(func(*model.RetentionPolicyWithTeamAndChannelIDs) *model.RetentionPolicyWithTeamAndChannelCounts); ok {
		r0 = rf(patch)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.RetentionPolicyWithTeamAndChannelCounts)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.RetentionPolicyWithTeamAndChannelIDs) error); ok {
		r1 = rf(patch)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *RetentionPolicyStore) RemoveChannels(policyID string, channelIds []string) error {
	ret := _m.Called(policyID, channelIds)
	if len(ret) == 0 {
		panic("no return value specified for RemoveChannels")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, []string) error); ok {
		r0 = rf(policyID, channelIds)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *RetentionPolicyStore) RemoveTeams(policyID string, teamIds []string) error {
	ret := _m.Called(policyID, teamIds)
	if len(ret) == 0 {
		panic("no return value specified for RemoveTeams")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(string, []string) error); ok {
		r0 = rf(policyID, teamIds)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *RetentionPolicyStore) Save(policy *model.RetentionPolicyWithTeamAndChannelIDs) (*model.RetentionPolicyWithTeamAndChannelCounts, error) {
	ret := _m.Called(policy)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 *model.RetentionPolicyWithTeamAndChannelCounts
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.RetentionPolicyWithTeamAndChannelIDs) (*model.RetentionPolicyWithTeamAndChannelCounts, error)); ok {
		return rf(policy)
	}
	if rf, ok := ret.Get(0).(func(*model.RetentionPolicyWithTeamAndChannelIDs) *model.RetentionPolicyWithTeamAndChannelCounts); ok {
		r0 = rf(policy)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.RetentionPolicyWithTeamAndChannelCounts)
		}
	}
	if rf, ok := ret.Get(1).(func(*model.RetentionPolicyWithTeamAndChannelIDs) error); ok {
		r1 = rf(policy)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func NewRetentionPolicyStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *RetentionPolicyStore {
	mock := &RetentionPolicyStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}