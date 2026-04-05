package mock_oauther
import (
	reflect "reflect"
	gomock "github.com/golang/mock/gomock"
	oauth2 "golang.org/x/oauth2"
)
type MockOAuther struct {
	ctrl     *gomock.Controller
	recorder *MockOAutherMockRecorder
}
type MockOAutherMockRecorder struct {
	mock *MockOAuther
}
func NewMockOAuther(ctrl *gomock.Controller) *MockOAuther {
	mock := &MockOAuther{ctrl: ctrl}
	mock.recorder = &MockOAutherMockRecorder{mock}
	return mock
}
func (m *MockOAuther) EXPECT() *MockOAutherMockRecorder {
	return m.recorder
}
func (m *MockOAuther) Deauth(arg0 string) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Deauth", arg0)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockOAutherMockRecorder) Deauth(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Deauth", reflect.TypeOf((*MockOAuther)(nil).Deauth), arg0)
}
func (m *MockOAuther) GetToken(arg0 string) (*oauth2.Token, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetToken", arg0)
	ret0, _ := ret[0].(*oauth2.Token)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockOAutherMockRecorder) GetToken(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetToken", reflect.TypeOf((*MockOAuther)(nil).GetToken), arg0)
}
func (m *MockOAuther) GetURL() string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetURL")
	ret0, _ := ret[0].(string)
	return ret0
}
func (mr *MockOAutherMockRecorder) GetURL() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetURL", reflect.TypeOf((*MockOAuther)(nil).GetURL))
}