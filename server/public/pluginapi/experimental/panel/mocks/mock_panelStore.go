package mock_panel
import (
	reflect "reflect"
	gomock "github.com/golang/mock/gomock"
)
type MockStore struct {
	ctrl     *gomock.Controller
	recorder *MockStoreMockRecorder
}
type MockStoreMockRecorder struct {
	mock *MockStore
}
func NewMockStore(ctrl *gomock.Controller) *MockStore {
	mock := &MockStore{ctrl: ctrl}
	mock.recorder = &MockStoreMockRecorder{mock}
	return mock
}
func (m *MockStore) EXPECT() *MockStoreMockRecorder {
	return m.recorder
}
func (m *MockStore) DeletePanelPostID(arg0 string) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeletePanelPostID", arg0)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockStoreMockRecorder) DeletePanelPostID(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeletePanelPostID", reflect.TypeOf((*MockStore)(nil).DeletePanelPostID), arg0)
}
func (m *MockStore) GetPanelPostID(arg0 string) (string, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPanelPostID", arg0)
	ret0, _ := ret[0].(string)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockStoreMockRecorder) GetPanelPostID(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPanelPostID", reflect.TypeOf((*MockStore)(nil).GetPanelPostID), arg0)
}
func (m *MockStore) SetPanelPostID(arg0, arg1 string) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "SetPanelPostID", arg0, arg1)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockStoreMockRecorder) SetPanelPostID(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "SetPanelPostID", reflect.TypeOf((*MockStore)(nil).SetPanelPostID), arg0, arg1)
}