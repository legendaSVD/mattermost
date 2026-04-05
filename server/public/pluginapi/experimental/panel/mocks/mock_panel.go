package mock_panel
import (
	reflect "reflect"
	gomock "github.com/golang/mock/gomock"
	model "github.com/mattermost/mattermost/server/public/model"
)
type MockPanel struct {
	ctrl     *gomock.Controller
	recorder *MockPanelMockRecorder
}
type MockPanelMockRecorder struct {
	mock *MockPanel
}
func NewMockPanel(ctrl *gomock.Controller) *MockPanel {
	mock := &MockPanel{ctrl: ctrl}
	mock.recorder = &MockPanelMockRecorder{mock}
	return mock
}
func (m *MockPanel) EXPECT() *MockPanelMockRecorder {
	return m.recorder
}
func (m *MockPanel) Clear(arg0 string) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Clear", arg0)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockPanelMockRecorder) Clear(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Clear", reflect.TypeOf((*MockPanel)(nil).Clear), arg0)
}
func (m *MockPanel) GetSettingIDs() []string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetSettingIDs")
	ret0, _ := ret[0].([]string)
	return ret0
}
func (mr *MockPanelMockRecorder) GetSettingIDs() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetSettingIDs", reflect.TypeOf((*MockPanel)(nil).GetSettingIDs))
}
func (m *MockPanel) Print(arg0 string) {
	m.ctrl.T.Helper()
	m.ctrl.Call(m, "Print", arg0)
}
func (mr *MockPanelMockRecorder) Print(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Print", reflect.TypeOf((*MockPanel)(nil).Print), arg0)
}
func (m *MockPanel) Set(arg0, arg1 string, arg2 interface{}) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Set", arg0, arg1, arg2)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockPanelMockRecorder) Set(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Set", reflect.TypeOf((*MockPanel)(nil).Set), arg0, arg1, arg2)
}
func (m *MockPanel) ToPost(arg0 string) (*model.Post, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ToPost", arg0)
	ret0, _ := ret[0].(*model.Post)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockPanelMockRecorder) ToPost(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ToPost", reflect.TypeOf((*MockPanel)(nil).ToPost), arg0)
}
func (m *MockPanel) URL() string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "URL")
	ret0, _ := ret[0].(string)
	return ret0
}
func (mr *MockPanelMockRecorder) URL() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "URL", reflect.TypeOf((*MockPanel)(nil).URL))
}