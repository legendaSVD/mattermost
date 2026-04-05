package mock_oauther
import (
	http "net/http"
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
func (m *MockOAuther) AddPayload(arg0 string, arg1 []byte) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "AddPayload", arg0, arg1)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockOAutherMockRecorder) AddPayload(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "AddPayload", reflect.TypeOf((*MockOAuther)(nil).AddPayload), arg0, arg1)
}
func (m *MockOAuther) Deauthorize(arg0 string) error {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "Deauthorize", arg0)
	ret0, _ := ret[0].(error)
	return ret0
}
func (mr *MockOAutherMockRecorder) Deauthorize(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "Deauthorize", reflect.TypeOf((*MockOAuther)(nil).Deauthorize), arg0)
}
func (m *MockOAuther) GetConnectURL() string {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetConnectURL")
	ret0, _ := ret[0].(string)
	return ret0
}
func (mr *MockOAutherMockRecorder) GetConnectURL() *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetConnectURL", reflect.TypeOf((*MockOAuther)(nil).GetConnectURL))
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
func (m *MockOAuther) ServeHTTP(arg0 http.ResponseWriter, arg1 *http.Request) {
	m.ctrl.T.Helper()
	m.ctrl.Call(m, "ServeHTTP", arg0, arg1)
}
func (mr *MockOAutherMockRecorder) ServeHTTP(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ServeHTTP", reflect.TypeOf((*MockOAuther)(nil).ServeHTTP), arg0, arg1)
}