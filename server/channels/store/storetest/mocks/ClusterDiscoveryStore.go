package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	mock "github.com/stretchr/testify/mock"
)
type ClusterDiscoveryStore struct {
	mock.Mock
}
func (_m *ClusterDiscoveryStore) Cleanup() error {
	ret := _m.Called()
	if len(ret) == 0 {
		panic("no return value specified for Cleanup")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func() error); ok {
		r0 = rf()
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ClusterDiscoveryStore) Delete(discovery *model.ClusterDiscovery) (bool, error) {
	ret := _m.Called(discovery)
	if len(ret) == 0 {
		panic("no return value specified for Delete")
	}
	var r0 bool
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.ClusterDiscovery) (bool, error)); ok {
		return rf(discovery)
	}
	if rf, ok := ret.Get(0).(func(*model.ClusterDiscovery) bool); ok {
		r0 = rf(discovery)
	} else {
		r0 = ret.Get(0).(bool)
	}
	if rf, ok := ret.Get(1).(func(*model.ClusterDiscovery) error); ok {
		r1 = rf(discovery)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *ClusterDiscoveryStore) Exists(discovery *model.ClusterDiscovery) (bool, error) {
	ret := _m.Called(discovery)
	if len(ret) == 0 {
		panic("no return value specified for Exists")
	}
	var r0 bool
	var r1 error
	if rf, ok := ret.Get(0).(func(*model.ClusterDiscovery) (bool, error)); ok {
		return rf(discovery)
	}
	if rf, ok := ret.Get(0).(func(*model.ClusterDiscovery) bool); ok {
		r0 = rf(discovery)
	} else {
		r0 = ret.Get(0).(bool)
	}
	if rf, ok := ret.Get(1).(func(*model.ClusterDiscovery) error); ok {
		r1 = rf(discovery)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *ClusterDiscoveryStore) GetAll(discoveryType string, clusterName string) ([]*model.ClusterDiscovery, error) {
	ret := _m.Called(discoveryType, clusterName)
	if len(ret) == 0 {
		panic("no return value specified for GetAll")
	}
	var r0 []*model.ClusterDiscovery
	var r1 error
	if rf, ok := ret.Get(0).(func(string, string) ([]*model.ClusterDiscovery, error)); ok {
		return rf(discoveryType, clusterName)
	}
	if rf, ok := ret.Get(0).(func(string, string) []*model.ClusterDiscovery); ok {
		r0 = rf(discoveryType, clusterName)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]*model.ClusterDiscovery)
		}
	}
	if rf, ok := ret.Get(1).(func(string, string) error); ok {
		r1 = rf(discoveryType, clusterName)
	} else {
		r1 = ret.Error(1)
	}
	return r0, r1
}
func (_m *ClusterDiscoveryStore) Save(discovery *model.ClusterDiscovery) error {
	ret := _m.Called(discovery)
	if len(ret) == 0 {
		panic("no return value specified for Save")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(*model.ClusterDiscovery) error); ok {
		r0 = rf(discovery)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func (_m *ClusterDiscoveryStore) SetLastPingAt(discovery *model.ClusterDiscovery) error {
	ret := _m.Called(discovery)
	if len(ret) == 0 {
		panic("no return value specified for SetLastPingAt")
	}
	var r0 error
	if rf, ok := ret.Get(0).(func(*model.ClusterDiscovery) error); ok {
		r0 = rf(discovery)
	} else {
		r0 = ret.Error(0)
	}
	return r0
}
func NewClusterDiscoveryStore(t interface {
	mock.TestingT
	Cleanup(func())
}) *ClusterDiscoveryStore {
	mock := &ClusterDiscoveryStore{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}