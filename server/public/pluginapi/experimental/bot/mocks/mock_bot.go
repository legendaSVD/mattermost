package mock_bot
import (
	reflect "reflect"
	gomock "github.com/golang/mock/gomock"
	model "github.com/mattermost/mattermost/server/public/model"
)
type MockBot struct {
	ctrl     *gomock.Controller
	recorder *MockBotMockRecorder
}
type MockBotMockRecorder struct {
	mock *MockBot
}
func NewMockBot(ctrl *gomock.Controller) *MockBot {
	mock := &MockBot{ctrl: ctrl}
	mock.recorder = &MockBotMockRecorder{mock}
	return mock
}
func (m *MockBot) EXPECT() *MockBotMockRecorder {
	return m.recorder
}
func (m *MockBot) Ensure(arg0 *model.Bot, arg1 string) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Ensure", arg0, arg1)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockBotMockRecorder) Ensure(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Ensure", reflect.TypeOf((*MockBot)(nil).Ensure), arg0, arg1)
}
func (m *MockBot) MattermostUserID() string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "MattermostUserID")
	ret0, _ := ret[0].(string)
	return ret0
}
func (mr *MockBotMockRecorder) MattermostUserID() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "MattermostUserID", reflect.TypeOf((*MockBot)(nil).MattermostUserID))
}
func (m *MockBot) String() string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "String")
	ret0, _ := ret[0].(string)
	return ret0
}
func (mr *MockBotMockRecorder) String() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "String", reflect.TypeOf((*MockBot)(nil).String))
}