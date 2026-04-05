package mock_import
import (
	reflect "reflect"
	gomock "github.com/golang/mock/gomock"
	model "github.com/mattermost/mattermost/server/public/model"
)
type MockPostAPI struct {
	ctrl     *gomock.Controller
	recorder *MockPostAPIMockRecorder
}
type MockPostAPIMockRecorder struct {
	mock *MockPostAPI
}
func NewMockPostAPI(ctrl *gomock.Controller) *MockPostAPI {
	mock := &MockPostAPI{ctrl: ctrl}
	mock.recorder = &MockPostAPIMockRecorder{mock}
	return mock
}
func (m *MockPostAPI) EXPECT() *MockPostAPIMockRecorder {
	return m.recorder
}
func (m *MockPostAPI) DM(arg0, arg1 string, arg2 *model.Post) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DM", arg0, arg1, arg2)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockPostAPIMockRecorder) DM(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DM", reflect.TypeOf((*MockPostAPI)(nil).DM), arg0, arg1, arg2)
}
func (m *MockPostAPI) DeletePost(arg0 string) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeletePost", arg0)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockPostAPIMockRecorder) DeletePost(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeletePost", reflect.TypeOf((*MockPostAPI)(nil).DeletePost), arg0)
}
func (m *MockPostAPI) GetPost(arg0 string) (*model.Post, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPost", arg0)
	ret0, _ := ret[0].(*model.Post)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockPostAPIMockRecorder) GetPost(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPost", reflect.TypeOf((*MockPostAPI)(nil).GetPost), arg0)
}
func (m *MockPostAPI) SendEphemeralPost(arg0 string, arg1 *model.Post) {
	m.ctrl.T.Helper()
	m.ctrl.Call(m, "SendEphemeralPost", arg0, arg1)
}
func (mr *MockPostAPIMockRecorder) SendEphemeralPost(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "SendEphemeralPost", reflect.TypeOf((*MockPostAPI)(nil).SendEphemeralPost), arg0, arg1)
}
func (m *MockPostAPI) UpdatePost(arg0 *model.Post) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdatePost", arg0)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockPostAPIMockRecorder) UpdatePost(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdatePost", reflect.TypeOf((*MockPostAPI)(nil).UpdatePost), arg0)
}