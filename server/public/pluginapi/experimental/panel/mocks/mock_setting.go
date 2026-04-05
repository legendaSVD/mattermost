package mock_panel
import (
	reflect "reflect"
	gomock "github.com/golang/mock/gomock"
	model "github.com/mattermost/mattermost/server/public/model"
)
type MockSetting struct {
	ctrl     *gomock.Controller
	recorder *MockSettingMockRecorder
}
type MockSettingMockRecorder struct {
	mock *MockSetting
}
func NewMockSetting(ctrl *gomock.Controller) *MockSetting {
	mock := &MockSetting{ctrl: ctrl}
	mock.recorder = &MockSettingMockRecorder{mock}
	return mock
}
func (m *MockSetting) EXPECT() *MockSettingMockRecorder {
	return m.recorder
}
func (m *MockSetting) Get(arg0 string) (interface{}, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Get", arg0)
	ret0, _ := ret[0].(interface{})
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockSettingMockRecorder) Get(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Get", reflect.TypeOf((*MockSetting)(nil).Get), arg0)
}
func (m *MockSetting) GetDependency() string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetDependency")
	ret0, _ := ret[0].(string)
	return ret0
}
func (mr *MockSettingMockRecorder) GetDependency() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetDependency", reflect.TypeOf((*MockSetting)(nil).GetDependency))
}
func (m *MockSetting) GetDescription() string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetDescription")
	ret0, _ := ret[0].(string)
	return ret0
}
func (mr *MockSettingMockRecorder) GetDescription() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetDescription", reflect.TypeOf((*MockSetting)(nil).GetDescription))
}
func (m *MockSetting) GetID() string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetID")
	ret0, _ := ret[0].(string)
	return ret0
}
func (mr *MockSettingMockRecorder) GetID() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetID", reflect.TypeOf((*MockSetting)(nil).GetID))
}
func (m *MockSetting) GetMessageAttachments(arg0, arg1 string, arg2 bool) (*model.MessageAttachment, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetMessageAttachments", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.MessageAttachment)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockSettingMockRecorder) GetMessageAttachments(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetMessageAttachments", reflect.TypeOf((*MockSetting)(nil).GetMessageAttachments), arg0, arg1, arg2)
}
func (m *MockSetting) GetTitle() string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetTitle")
	ret0, _ := ret[0].(string)
	return ret0
}
func (mr *MockSettingMockRecorder) GetTitle() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetTitle", reflect.TypeOf((*MockSetting)(nil).GetTitle))
}
func (m *MockSetting) IsDisabled(arg0 interface{}) bool {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "IsDisabled", arg0)
	ret0, _ := ret[0].(bool)
	return ret0
}
func (mr *MockSettingMockRecorder) IsDisabled(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "IsDisabled", reflect.TypeOf((*MockSetting)(nil).IsDisabled), arg0)
}
func (m *MockSetting) Set(arg0 string, arg1 interface{}) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Set", arg0, arg1)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockSettingMockRecorder) Set(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Set", reflect.TypeOf((*MockSetting)(nil).Set), arg0, arg1)
}