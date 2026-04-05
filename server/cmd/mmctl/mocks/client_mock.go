package mocks
import (
	context "context"
	json "encoding/json"
	io "io"
	http "net/http"
	reflect "reflect"
	gomock "github.com/golang/mock/gomock"
	model "github.com/mattermost/mattermost/server/public/model"
)
type MockClient struct {
	ctrl     *gomock.Controller
	recorder *MockClientMockRecorder
}
type MockClientMockRecorder struct {
	mock *MockClient
}
func NewMockClient(ctrl *gomock.Controller) *MockClient {
	mock := &MockClient{ctrl: ctrl}
	mock.recorder = &MockClientMockRecorder{mock}
	return mock
}
func (m *MockClient) EXPECT() *MockClientMockRecorder {
	return m.recorder
}
func (m *MockClient) AddChannelMember(arg0 context.Context, arg1, arg2 string) (*model.ChannelMember, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "AddChannelMember", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.ChannelMember)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) AddChannelMember(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "AddChannelMember", reflect.TypeOf((*MockClient)(nil).AddChannelMember), arg0, arg1, arg2)
}
func (m *MockClient) AddTeamMember(arg0 context.Context, arg1, arg2 string) (*model.TeamMember, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "AddTeamMember", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.TeamMember)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) AddTeamMember(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "AddTeamMember", reflect.TypeOf((*MockClient)(nil).AddTeamMember), arg0, arg1, arg2)
}
func (m *MockClient) AssignBot(arg0 context.Context, arg1, arg2 string) (*model.Bot, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "AssignBot", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Bot)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) AssignBot(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "AssignBot", reflect.TypeOf((*MockClient)(nil).AssignBot), arg0, arg1, arg2)
}
func (m *MockClient) CancelJob(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CancelJob", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) CancelJob(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CancelJob", reflect.TypeOf((*MockClient)(nil).CancelJob), arg0, arg1)
}
func (m *MockClient) CheckIntegrity(arg0 context.Context) ([]model.IntegrityCheckResult, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CheckIntegrity", arg0)
	ret0, _ := ret[0].([]model.IntegrityCheckResult)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CheckIntegrity(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CheckIntegrity", reflect.TypeOf((*MockClient)(nil).CheckIntegrity), arg0)
}
func (m *MockClient) ClearServerBusy(arg0 context.Context) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ClearServerBusy", arg0)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) ClearServerBusy(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ClearServerBusy", reflect.TypeOf((*MockClient)(nil).ClearServerBusy), arg0)
}
func (m *MockClient) ConvertBotToUser(arg0 context.Context, arg1 string, arg2 *model.UserPatch, arg3 bool) (*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ConvertBotToUser", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) ConvertBotToUser(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ConvertBotToUser", reflect.TypeOf((*MockClient)(nil).ConvertBotToUser), arg0, arg1, arg2, arg3)
}
func (m *MockClient) ConvertUserToBot(arg0 context.Context, arg1 string) (*model.Bot, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ConvertUserToBot", arg0, arg1)
	ret0, _ := ret[0].(*model.Bot)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) ConvertUserToBot(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ConvertUserToBot", reflect.TypeOf((*MockClient)(nil).ConvertUserToBot), arg0, arg1)
}
func (m *MockClient) CreateBot(arg0 context.Context, arg1 *model.Bot) (*model.Bot, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateBot", arg0, arg1)
	ret0, _ := ret[0].(*model.Bot)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateBot(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateBot", reflect.TypeOf((*MockClient)(nil).CreateBot), arg0, arg1)
}
func (m *MockClient) CreateCPAField(arg0 context.Context, arg1 *model.PropertyField) (*model.PropertyField, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateCPAField", arg0, arg1)
	ret0, _ := ret[0].(*model.PropertyField)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateCPAField(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateCPAField", reflect.TypeOf((*MockClient)(nil).CreateCPAField), arg0, arg1)
}
func (m *MockClient) CreateChannel(arg0 context.Context, arg1 *model.Channel) (*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateChannel", arg0, arg1)
	ret0, _ := ret[0].(*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateChannel(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateChannel", reflect.TypeOf((*MockClient)(nil).CreateChannel), arg0, arg1)
}
func (m *MockClient) CreateCommand(arg0 context.Context, arg1 *model.Command) (*model.Command, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateCommand", arg0, arg1)
	ret0, _ := ret[0].(*model.Command)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateCommand(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateCommand", reflect.TypeOf((*MockClient)(nil).CreateCommand), arg0, arg1)
}
func (m *MockClient) CreateIncomingWebhook(arg0 context.Context, arg1 *model.IncomingWebhook) (*model.IncomingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateIncomingWebhook", arg0, arg1)
	ret0, _ := ret[0].(*model.IncomingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateIncomingWebhook(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateIncomingWebhook", reflect.TypeOf((*MockClient)(nil).CreateIncomingWebhook), arg0, arg1)
}
func (m *MockClient) CreateJob(arg0 context.Context, arg1 *model.Job) (*model.Job, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateJob", arg0, arg1)
	ret0, _ := ret[0].(*model.Job)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateJob(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateJob", reflect.TypeOf((*MockClient)(nil).CreateJob), arg0, arg1)
}
func (m *MockClient) CreateOutgoingWebhook(arg0 context.Context, arg1 *model.OutgoingWebhook) (*model.OutgoingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateOutgoingWebhook", arg0, arg1)
	ret0, _ := ret[0].(*model.OutgoingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateOutgoingWebhook(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateOutgoingWebhook", reflect.TypeOf((*MockClient)(nil).CreateOutgoingWebhook), arg0, arg1)
}
func (m *MockClient) CreatePost(arg0 context.Context, arg1 *model.Post) (*model.Post, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreatePost", arg0, arg1)
	ret0, _ := ret[0].(*model.Post)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreatePost(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreatePost", reflect.TypeOf((*MockClient)(nil).CreatePost), arg0, arg1)
}
func (m *MockClient) CreateTeam(arg0 context.Context, arg1 *model.Team) (*model.Team, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateTeam", arg0, arg1)
	ret0, _ := ret[0].(*model.Team)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateTeam(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateTeam", reflect.TypeOf((*MockClient)(nil).CreateTeam), arg0, arg1)
}
func (m *MockClient) CreateUpload(arg0 context.Context, arg1 *model.UploadSession) (*model.UploadSession, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateUpload", arg0, arg1)
	ret0, _ := ret[0].(*model.UploadSession)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateUpload(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateUpload", reflect.TypeOf((*MockClient)(nil).CreateUpload), arg0, arg1)
}
func (m *MockClient) CreateUser(arg0 context.Context, arg1 *model.User) (*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateUser", arg0, arg1)
	ret0, _ := ret[0].(*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateUser(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateUser", reflect.TypeOf((*MockClient)(nil).CreateUser), arg0, arg1)
}
func (m *MockClient) CreateUserAccessToken(arg0 context.Context, arg1, arg2 string) (*model.UserAccessToken, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "CreateUserAccessToken", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.UserAccessToken)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) CreateUserAccessToken(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "CreateUserAccessToken", reflect.TypeOf((*MockClient)(nil).CreateUserAccessToken), arg0, arg1, arg2)
}
func (m *MockClient) DeleteCPAField(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeleteCPAField", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DeleteCPAField(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeleteCPAField", reflect.TypeOf((*MockClient)(nil).DeleteCPAField), arg0, arg1)
}
func (m *MockClient) DeleteChannel(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeleteChannel", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DeleteChannel(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeleteChannel", reflect.TypeOf((*MockClient)(nil).DeleteChannel), arg0, arg1)
}
func (m *MockClient) DeleteCommand(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeleteCommand", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DeleteCommand(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeleteCommand", reflect.TypeOf((*MockClient)(nil).DeleteCommand), arg0, arg1)
}
func (m *MockClient) DeleteExport(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeleteExport", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DeleteExport(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeleteExport", reflect.TypeOf((*MockClient)(nil).DeleteExport), arg0, arg1)
}
func (m *MockClient) DeleteImport(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeleteImport", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DeleteImport(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeleteImport", reflect.TypeOf((*MockClient)(nil).DeleteImport), arg0, arg1)
}
func (m *MockClient) DeleteIncomingWebhook(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeleteIncomingWebhook", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DeleteIncomingWebhook(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeleteIncomingWebhook", reflect.TypeOf((*MockClient)(nil).DeleteIncomingWebhook), arg0, arg1)
}
func (m *MockClient) DeleteOutgoingWebhook(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeleteOutgoingWebhook", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DeleteOutgoingWebhook(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeleteOutgoingWebhook", reflect.TypeOf((*MockClient)(nil).DeleteOutgoingWebhook), arg0, arg1)
}
func (m *MockClient) DeletePost(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeletePost", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DeletePost(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeletePost", reflect.TypeOf((*MockClient)(nil).DeletePost), arg0, arg1)
}
func (m *MockClient) DeletePreferences(arg0 context.Context, arg1 string, arg2 model.Preferences) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DeletePreferences", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DeletePreferences(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DeletePreferences", reflect.TypeOf((*MockClient)(nil).DeletePreferences), arg0, arg1, arg2)
}
func (m *MockClient) DemoteUserToGuest(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DemoteUserToGuest", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DemoteUserToGuest(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DemoteUserToGuest", reflect.TypeOf((*MockClient)(nil).DemoteUserToGuest), arg0, arg1)
}
func (m *MockClient) DisableBot(arg0 context.Context, arg1 string) (*model.Bot, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DisableBot", arg0, arg1)
	ret0, _ := ret[0].(*model.Bot)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) DisableBot(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DisableBot", reflect.TypeOf((*MockClient)(nil).DisableBot), arg0, arg1)
}
func (m *MockClient) DisablePlugin(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DisablePlugin", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DisablePlugin(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DisablePlugin", reflect.TypeOf((*MockClient)(nil).DisablePlugin), arg0, arg1)
}
func (m *MockClient) DoAPIPost(arg0 context.Context, arg1, arg2 string) (*http.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DoAPIPost", arg0, arg1, arg2)
	ret0, _ := ret[0].(*http.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DoAPIPost(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DoAPIPost", reflect.TypeOf((*MockClient)(nil).DoAPIPost), arg0, arg1, arg2)
}
func (m *MockClient) DownloadComplianceExport(arg0 context.Context, arg1 string, arg2 io.Writer) (string, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DownloadComplianceExport", arg0, arg1, arg2)
	ret0, _ := ret[0].(string)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) DownloadComplianceExport(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DownloadComplianceExport", reflect.TypeOf((*MockClient)(nil).DownloadComplianceExport), arg0, arg1, arg2)
}
func (m *MockClient) DownloadExport(arg0 context.Context, arg1 string, arg2 io.Writer, arg3 int64) (int64, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "DownloadExport", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(int64)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) DownloadExport(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "DownloadExport", reflect.TypeOf((*MockClient)(nil).DownloadExport), arg0, arg1, arg2, arg3)
}
func (m *MockClient) EnableBot(arg0 context.Context, arg1 string) (*model.Bot, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "EnableBot", arg0, arg1)
	ret0, _ := ret[0].(*model.Bot)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) EnableBot(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "EnableBot", reflect.TypeOf((*MockClient)(nil).EnableBot), arg0, arg1)
}
func (m *MockClient) EnablePlugin(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "EnablePlugin", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) EnablePlugin(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "EnablePlugin", reflect.TypeOf((*MockClient)(nil).EnablePlugin), arg0, arg1)
}
func (m *MockClient) GeneratePresignedURL(arg0 context.Context, arg1 string) (*model.PresignURLResponse, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GeneratePresignedURL", arg0, arg1)
	ret0, _ := ret[0].(*model.PresignURLResponse)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GeneratePresignedURL(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GeneratePresignedURL", reflect.TypeOf((*MockClient)(nil).GeneratePresignedURL), arg0, arg1)
}
func (m *MockClient) GenerateSupportPacket(arg0 context.Context) (io.ReadCloser, string, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GenerateSupportPacket", arg0)
	ret0, _ := ret[0].(io.ReadCloser)
	ret1, _ := ret[1].(string)
	ret2, _ := ret[2].(*model.Response)
	ret3, _ := ret[3].(error)
	return ret0, ret1, ret2, ret3
}
func (mr *MockClientMockRecorder) GenerateSupportPacket(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GenerateSupportPacket", reflect.TypeOf((*MockClient)(nil).GenerateSupportPacket), arg0)
}
func (m *MockClient) GetAllTeams(arg0 context.Context, arg1 string, arg2, arg3 int) ([]*model.Team, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetAllTeams", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].([]*model.Team)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetAllTeams(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetAllTeams", reflect.TypeOf((*MockClient)(nil).GetAllTeams), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetBots(arg0 context.Context, arg1, arg2 int, arg3 string) ([]*model.Bot, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetBots", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].([]*model.Bot)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetBots(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetBots", reflect.TypeOf((*MockClient)(nil).GetBots), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetBotsIncludeDeleted(arg0 context.Context, arg1, arg2 int, arg3 string) ([]*model.Bot, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetBotsIncludeDeleted", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].([]*model.Bot)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetBotsIncludeDeleted(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetBotsIncludeDeleted", reflect.TypeOf((*MockClient)(nil).GetBotsIncludeDeleted), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetBotsOrphaned(arg0 context.Context, arg1, arg2 int, arg3 string) ([]*model.Bot, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetBotsOrphaned", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].([]*model.Bot)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetBotsOrphaned(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetBotsOrphaned", reflect.TypeOf((*MockClient)(nil).GetBotsOrphaned), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetChannel(arg0 context.Context, arg1 string) (*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetChannel", arg0, arg1)
	ret0, _ := ret[0].(*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetChannel(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetChannel", reflect.TypeOf((*MockClient)(nil).GetChannel), arg0, arg1)
}
func (m *MockClient) GetChannelByName(arg0 context.Context, arg1, arg2, arg3 string) (*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetChannelByName", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetChannelByName(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetChannelByName", reflect.TypeOf((*MockClient)(nil).GetChannelByName), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetChannelByNameIncludeDeleted(arg0 context.Context, arg1, arg2, arg3 string) (*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetChannelByNameIncludeDeleted", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetChannelByNameIncludeDeleted(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetChannelByNameIncludeDeleted", reflect.TypeOf((*MockClient)(nil).GetChannelByNameIncludeDeleted), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetChannelMembers(arg0 context.Context, arg1 string, arg2, arg3 int, arg4 string) (model.ChannelMembers, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetChannelMembers", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].(model.ChannelMembers)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetChannelMembers(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetChannelMembers", reflect.TypeOf((*MockClient)(nil).GetChannelMembers), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetChannelsForTeamForUser(arg0 context.Context, arg1, arg2 string, arg3 bool, arg4 string) ([]*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetChannelsForTeamForUser", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetChannelsForTeamForUser(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetChannelsForTeamForUser", reflect.TypeOf((*MockClient)(nil).GetChannelsForTeamForUser), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetClientConfig(arg0 context.Context, arg1 string) (map[string]string, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetClientConfig", arg0, arg1)
	ret0, _ := ret[0].(map[string]string)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetClientConfig(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetClientConfig", reflect.TypeOf((*MockClient)(nil).GetClientConfig), arg0, arg1)
}
func (m *MockClient) GetCommandById(arg0 context.Context, arg1 string) (*model.Command, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetCommandById", arg0, arg1)
	ret0, _ := ret[0].(*model.Command)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetCommandById(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetCommandById", reflect.TypeOf((*MockClient)(nil).GetCommandById), arg0, arg1)
}
func (m *MockClient) GetConfig(arg0 context.Context) (*model.Config, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetConfig", arg0)
	ret0, _ := ret[0].(*model.Config)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetConfig(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetConfig", reflect.TypeOf((*MockClient)(nil).GetConfig), arg0)
}
func (m *MockClient) GetConfigWithOptions(arg0 context.Context, arg1 model.GetConfigOptions) (map[string]interface{}, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetConfigWithOptions", arg0, arg1)
	ret0, _ := ret[0].(map[string]interface{})
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetConfigWithOptions(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetConfigWithOptions", reflect.TypeOf((*MockClient)(nil).GetConfigWithOptions), arg0, arg1)
}
func (m *MockClient) GetDeletedChannelsForTeam(arg0 context.Context, arg1 string, arg2, arg3 int, arg4 string) ([]*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetDeletedChannelsForTeam", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetDeletedChannelsForTeam(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetDeletedChannelsForTeam", reflect.TypeOf((*MockClient)(nil).GetDeletedChannelsForTeam), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetGroupsByChannel(arg0 context.Context, arg1 string, arg2 model.GroupSearchOpts) ([]*model.GroupWithSchemeAdmin, int, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetGroupsByChannel", arg0, arg1, arg2)
	ret0, _ := ret[0].([]*model.GroupWithSchemeAdmin)
	ret1, _ := ret[1].(int)
	ret2, _ := ret[2].(*model.Response)
	ret3, _ := ret[3].(error)
	return ret0, ret1, ret2, ret3
}
func (mr *MockClientMockRecorder) GetGroupsByChannel(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetGroupsByChannel", reflect.TypeOf((*MockClient)(nil).GetGroupsByChannel), arg0, arg1, arg2)
}
func (m *MockClient) GetGroupsByTeam(arg0 context.Context, arg1 string, arg2 model.GroupSearchOpts) ([]*model.GroupWithSchemeAdmin, int, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetGroupsByTeam", arg0, arg1, arg2)
	ret0, _ := ret[0].([]*model.GroupWithSchemeAdmin)
	ret1, _ := ret[1].(int)
	ret2, _ := ret[2].(*model.Response)
	ret3, _ := ret[3].(error)
	return ret0, ret1, ret2, ret3
}
func (mr *MockClientMockRecorder) GetGroupsByTeam(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetGroupsByTeam", reflect.TypeOf((*MockClient)(nil).GetGroupsByTeam), arg0, arg1, arg2)
}
func (m *MockClient) GetIncomingWebhook(arg0 context.Context, arg1, arg2 string) (*model.IncomingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetIncomingWebhook", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.IncomingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetIncomingWebhook(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetIncomingWebhook", reflect.TypeOf((*MockClient)(nil).GetIncomingWebhook), arg0, arg1, arg2)
}
func (m *MockClient) GetIncomingWebhooks(arg0 context.Context, arg1, arg2 int, arg3 string) ([]*model.IncomingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetIncomingWebhooks", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].([]*model.IncomingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetIncomingWebhooks(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetIncomingWebhooks", reflect.TypeOf((*MockClient)(nil).GetIncomingWebhooks), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetIncomingWebhooksForTeam(arg0 context.Context, arg1 string, arg2, arg3 int, arg4 string) ([]*model.IncomingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetIncomingWebhooksForTeam", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.IncomingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetIncomingWebhooksForTeam(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetIncomingWebhooksForTeam", reflect.TypeOf((*MockClient)(nil).GetIncomingWebhooksForTeam), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetJob(arg0 context.Context, arg1 string) (*model.Job, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetJob", arg0, arg1)
	ret0, _ := ret[0].(*model.Job)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetJob(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetJob", reflect.TypeOf((*MockClient)(nil).GetJob), arg0, arg1)
}
func (m *MockClient) GetJobs(arg0 context.Context, arg1, arg2 string, arg3, arg4 int) ([]*model.Job, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetJobs", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.Job)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetJobs(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetJobs", reflect.TypeOf((*MockClient)(nil).GetJobs), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetJobsByType(arg0 context.Context, arg1 string, arg2, arg3 int) ([]*model.Job, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetJobsByType", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].([]*model.Job)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetJobsByType(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetJobsByType", reflect.TypeOf((*MockClient)(nil).GetJobsByType), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetLdapGroups(arg0 context.Context) ([]*model.Group, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetLdapGroups", arg0)
	ret0, _ := ret[0].([]*model.Group)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetLdapGroups(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetLdapGroups", reflect.TypeOf((*MockClient)(nil).GetLdapGroups), arg0)
}
func (m *MockClient) GetLogs(arg0 context.Context, arg1, arg2 int) ([]string, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetLogs", arg0, arg1, arg2)
	ret0, _ := ret[0].([]string)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetLogs(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetLogs", reflect.TypeOf((*MockClient)(nil).GetLogs), arg0, arg1, arg2)
}
func (m *MockClient) GetMarketplacePlugins(arg0 context.Context, arg1 *model.MarketplacePluginFilter) ([]*model.MarketplacePlugin, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetMarketplacePlugins", arg0, arg1)
	ret0, _ := ret[0].([]*model.MarketplacePlugin)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetMarketplacePlugins(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetMarketplacePlugins", reflect.TypeOf((*MockClient)(nil).GetMarketplacePlugins), arg0, arg1)
}
func (m *MockClient) GetOAuthApps(arg0 context.Context, arg1, arg2 int) ([]*model.OAuthApp, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetOAuthApps", arg0, arg1, arg2)
	ret0, _ := ret[0].([]*model.OAuthApp)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetOAuthApps(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetOAuthApps", reflect.TypeOf((*MockClient)(nil).GetOAuthApps), arg0, arg1, arg2)
}
func (m *MockClient) GetOldClientLicense(arg0 context.Context, arg1 string) (map[string]string, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetOldClientLicense", arg0, arg1)
	ret0, _ := ret[0].(map[string]string)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetOldClientLicense(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetOldClientLicense", reflect.TypeOf((*MockClient)(nil).GetOldClientLicense), arg0, arg1)
}
func (m *MockClient) GetOutgoingWebhook(arg0 context.Context, arg1 string) (*model.OutgoingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetOutgoingWebhook", arg0, arg1)
	ret0, _ := ret[0].(*model.OutgoingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetOutgoingWebhook(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetOutgoingWebhook", reflect.TypeOf((*MockClient)(nil).GetOutgoingWebhook), arg0, arg1)
}
func (m *MockClient) GetOutgoingWebhooks(arg0 context.Context, arg1, arg2 int, arg3 string) ([]*model.OutgoingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetOutgoingWebhooks", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].([]*model.OutgoingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetOutgoingWebhooks(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetOutgoingWebhooks", reflect.TypeOf((*MockClient)(nil).GetOutgoingWebhooks), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetOutgoingWebhooksForChannel(arg0 context.Context, arg1 string, arg2, arg3 int, arg4 string) ([]*model.OutgoingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetOutgoingWebhooksForChannel", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.OutgoingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetOutgoingWebhooksForChannel(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetOutgoingWebhooksForChannel", reflect.TypeOf((*MockClient)(nil).GetOutgoingWebhooksForChannel), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetOutgoingWebhooksForTeam(arg0 context.Context, arg1 string, arg2, arg3 int, arg4 string) ([]*model.OutgoingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetOutgoingWebhooksForTeam", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.OutgoingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetOutgoingWebhooksForTeam(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetOutgoingWebhooksForTeam", reflect.TypeOf((*MockClient)(nil).GetOutgoingWebhooksForTeam), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetPing(arg0 context.Context) (string, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPing", arg0)
	ret0, _ := ret[0].(string)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPing(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPing", reflect.TypeOf((*MockClient)(nil).GetPing), arg0)
}
func (m *MockClient) GetPingWithFullServerStatus(arg0 context.Context) (map[string]interface{}, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPingWithFullServerStatus", arg0)
	ret0, _ := ret[0].(map[string]interface{})
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPingWithFullServerStatus(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPingWithFullServerStatus", reflect.TypeOf((*MockClient)(nil).GetPingWithFullServerStatus), arg0)
}
func (m *MockClient) GetPingWithOptions(arg0 context.Context, arg1 model.SystemPingOptions) (map[string]interface{}, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPingWithOptions", arg0, arg1)
	ret0, _ := ret[0].(map[string]interface{})
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPingWithOptions(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPingWithOptions", reflect.TypeOf((*MockClient)(nil).GetPingWithOptions), arg0, arg1)
}
func (m *MockClient) GetPlugins(arg0 context.Context) (*model.PluginsResponse, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPlugins", arg0)
	ret0, _ := ret[0].(*model.PluginsResponse)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPlugins(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPlugins", reflect.TypeOf((*MockClient)(nil).GetPlugins), arg0)
}
func (m *MockClient) GetPost(arg0 context.Context, arg1, arg2 string) (*model.Post, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPost", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Post)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPost(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPost", reflect.TypeOf((*MockClient)(nil).GetPost), arg0, arg1, arg2)
}
func (m *MockClient) GetPostsForChannel(arg0 context.Context, arg1 string, arg2, arg3 int, arg4 string, arg5, arg6 bool) (*model.PostList, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPostsForChannel", arg0, arg1, arg2, arg3, arg4, arg5, arg6)
	ret0, _ := ret[0].(*model.PostList)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPostsForChannel(arg0, arg1, arg2, arg3, arg4, arg5, arg6 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPostsForChannel", reflect.TypeOf((*MockClient)(nil).GetPostsForChannel), arg0, arg1, arg2, arg3, arg4, arg5, arg6)
}
func (m *MockClient) GetPostsForReporting(arg0 context.Context, arg1 model.ReportPostOptions, arg2 model.ReportPostOptionsCursor) (*model.ReportPostListResponse, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPostsForReporting", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.ReportPostListResponse)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPostsForReporting(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPostsForReporting", reflect.TypeOf((*MockClient)(nil).GetPostsForReporting), arg0, arg1, arg2)
}
func (m *MockClient) GetPostsSince(arg0 context.Context, arg1 string, arg2 int64, arg3 bool) (*model.PostList, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPostsSince", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.PostList)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPostsSince(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPostsSince", reflect.TypeOf((*MockClient)(nil).GetPostsSince), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetPreferenceByCategoryAndName(arg0 context.Context, arg1, arg2, arg3 string) (*model.Preference, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPreferenceByCategoryAndName", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.Preference)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPreferenceByCategoryAndName(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPreferenceByCategoryAndName", reflect.TypeOf((*MockClient)(nil).GetPreferenceByCategoryAndName), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetPreferences(arg0 context.Context, arg1 string) (model.Preferences, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPreferences", arg0, arg1)
	ret0, _ := ret[0].(model.Preferences)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPreferences(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPreferences", reflect.TypeOf((*MockClient)(nil).GetPreferences), arg0, arg1)
}
func (m *MockClient) GetPreferencesByCategory(arg0 context.Context, arg1, arg2 string) (model.Preferences, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPreferencesByCategory", arg0, arg1, arg2)
	ret0, _ := ret[0].(model.Preferences)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPreferencesByCategory(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPreferencesByCategory", reflect.TypeOf((*MockClient)(nil).GetPreferencesByCategory), arg0, arg1, arg2)
}
func (m *MockClient) GetPrivateChannelsForTeam(arg0 context.Context, arg1 string, arg2, arg3 int, arg4 string) ([]*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPrivateChannelsForTeam", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPrivateChannelsForTeam(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPrivateChannelsForTeam", reflect.TypeOf((*MockClient)(nil).GetPrivateChannelsForTeam), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetPublicChannelsForTeam(arg0 context.Context, arg1 string, arg2, arg3 int, arg4 string) ([]*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetPublicChannelsForTeam", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetPublicChannelsForTeam(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetPublicChannelsForTeam", reflect.TypeOf((*MockClient)(nil).GetPublicChannelsForTeam), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetRoleByName(arg0 context.Context, arg1 string) (*model.Role, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetRoleByName", arg0, arg1)
	ret0, _ := ret[0].(*model.Role)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetRoleByName(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetRoleByName", reflect.TypeOf((*MockClient)(nil).GetRoleByName), arg0, arg1)
}
func (m *MockClient) GetAllRoles(arg0 context.Context) ([]*model.Role, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetAllRoles", arg0)
	ret0, _ := ret[0].([]*model.Role)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetAllRoles(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetAllRoles", reflect.TypeOf((*MockClient)(nil).GetAllRoles), arg0)
}
func (m *MockClient) GetServerBusy(arg0 context.Context) (*model.ServerBusyState, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetServerBusy", arg0)
	ret0, _ := ret[0].(*model.ServerBusyState)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetServerBusy(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetServerBusy", reflect.TypeOf((*MockClient)(nil).GetServerBusy), arg0)
}
func (m *MockClient) GetTeam(arg0 context.Context, arg1, arg2 string) (*model.Team, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetTeam", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Team)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetTeam(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetTeam", reflect.TypeOf((*MockClient)(nil).GetTeam), arg0, arg1, arg2)
}
func (m *MockClient) GetTeamByName(arg0 context.Context, arg1, arg2 string) (*model.Team, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetTeamByName", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Team)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetTeamByName(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetTeamByName", reflect.TypeOf((*MockClient)(nil).GetTeamByName), arg0, arg1, arg2)
}
func (m *MockClient) GetUpload(arg0 context.Context, arg1 string) (*model.UploadSession, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUpload", arg0, arg1)
	ret0, _ := ret[0].(*model.UploadSession)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUpload(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUpload", reflect.TypeOf((*MockClient)(nil).GetUpload), arg0, arg1)
}
func (m *MockClient) GetUploadsForUser(arg0 context.Context, arg1 string) ([]*model.UploadSession, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUploadsForUser", arg0, arg1)
	ret0, _ := ret[0].([]*model.UploadSession)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUploadsForUser(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUploadsForUser", reflect.TypeOf((*MockClient)(nil).GetUploadsForUser), arg0, arg1)
}
func (m *MockClient) GetUser(arg0 context.Context, arg1, arg2 string) (*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUser", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUser(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUser", reflect.TypeOf((*MockClient)(nil).GetUser), arg0, arg1, arg2)
}
func (m *MockClient) GetUserAccessTokensForUser(arg0 context.Context, arg1 string, arg2, arg3 int) ([]*model.UserAccessToken, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUserAccessTokensForUser", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].([]*model.UserAccessToken)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUserAccessTokensForUser(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUserAccessTokensForUser", reflect.TypeOf((*MockClient)(nil).GetUserAccessTokensForUser), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetUserByEmail(arg0 context.Context, arg1, arg2 string) (*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUserByEmail", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUserByEmail(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUserByEmail", reflect.TypeOf((*MockClient)(nil).GetUserByEmail), arg0, arg1, arg2)
}
func (m *MockClient) GetUserByUsername(arg0 context.Context, arg1, arg2 string) (*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUserByUsername", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUserByUsername(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUserByUsername", reflect.TypeOf((*MockClient)(nil).GetUserByUsername), arg0, arg1, arg2)
}
func (m *MockClient) GetUsers(arg0 context.Context, arg1, arg2 int, arg3 string) ([]*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUsers", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].([]*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUsers(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUsers", reflect.TypeOf((*MockClient)(nil).GetUsers), arg0, arg1, arg2, arg3)
}
func (m *MockClient) GetUsersByIds(arg0 context.Context, arg1 []string) ([]*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUsersByIds", arg0, arg1)
	ret0, _ := ret[0].([]*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUsersByIds(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUsersByIds", reflect.TypeOf((*MockClient)(nil).GetUsersByIds), arg0, arg1)
}
func (m *MockClient) GetUsersInTeam(arg0 context.Context, arg1 string, arg2, arg3 int, arg4 string) ([]*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUsersInTeam", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUsersInTeam(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUsersInTeam", reflect.TypeOf((*MockClient)(nil).GetUsersInTeam), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) GetUsersWithCustomQueryParameters(arg0 context.Context, arg1, arg2 int, arg3, arg4 string) ([]*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "GetUsersWithCustomQueryParameters", arg0, arg1, arg2, arg3, arg4)
	ret0, _ := ret[0].([]*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) GetUsersWithCustomQueryParameters(arg0, arg1, arg2, arg3, arg4 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "GetUsersWithCustomQueryParameters", reflect.TypeOf((*MockClient)(nil).GetUsersWithCustomQueryParameters), arg0, arg1, arg2, arg3, arg4)
}
func (m *MockClient) InstallMarketplacePlugin(arg0 context.Context, arg1 *model.InstallMarketplacePluginRequest) (*model.Manifest, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "InstallMarketplacePlugin", arg0, arg1)
	ret0, _ := ret[0].(*model.Manifest)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) InstallMarketplacePlugin(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "InstallMarketplacePlugin", reflect.TypeOf((*MockClient)(nil).InstallMarketplacePlugin), arg0, arg1)
}
func (m *MockClient) InstallPluginFromURL(arg0 context.Context, arg1 string, arg2 bool) (*model.Manifest, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "InstallPluginFromURL", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Manifest)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) InstallPluginFromURL(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "InstallPluginFromURL", reflect.TypeOf((*MockClient)(nil).InstallPluginFromURL), arg0, arg1, arg2)
}
func (m *MockClient) InviteUsersToTeam(arg0 context.Context, arg1 string, arg2 []string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "InviteUsersToTeam", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) InviteUsersToTeam(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "InviteUsersToTeam", reflect.TypeOf((*MockClient)(nil).InviteUsersToTeam), arg0, arg1, arg2)
}
func (m *MockClient) ListCPAFields(arg0 context.Context) ([]*model.PropertyField, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ListCPAFields", arg0)
	ret0, _ := ret[0].([]*model.PropertyField)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) ListCPAFields(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ListCPAFields", reflect.TypeOf((*MockClient)(nil).ListCPAFields), arg0)
}
func (m *MockClient) ListCPAValues(arg0 context.Context, arg1 string) (map[string]json.RawMessage, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ListCPAValues", arg0, arg1)
	ret0, _ := ret[0].(map[string]json.RawMessage)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) ListCPAValues(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ListCPAValues", reflect.TypeOf((*MockClient)(nil).ListCPAValues), arg0, arg1)
}
func (m *MockClient) ListCommands(arg0 context.Context, arg1 string, arg2 bool) ([]*model.Command, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ListCommands", arg0, arg1, arg2)
	ret0, _ := ret[0].([]*model.Command)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) ListCommands(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ListCommands", reflect.TypeOf((*MockClient)(nil).ListCommands), arg0, arg1, arg2)
}
func (m *MockClient) ListExports(arg0 context.Context) ([]string, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ListExports", arg0)
	ret0, _ := ret[0].([]string)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) ListExports(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ListExports", reflect.TypeOf((*MockClient)(nil).ListExports), arg0)
}
func (m *MockClient) ListImports(arg0 context.Context) ([]string, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ListImports", arg0)
	ret0, _ := ret[0].([]string)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) ListImports(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ListImports", reflect.TypeOf((*MockClient)(nil).ListImports), arg0)
}
func (m *MockClient) MigrateAuthToLdap(arg0 context.Context, arg1, arg2 string, arg3 bool) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "MigrateAuthToLdap", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) MigrateAuthToLdap(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "MigrateAuthToLdap", reflect.TypeOf((*MockClient)(nil).MigrateAuthToLdap), arg0, arg1, arg2, arg3)
}
func (m *MockClient) MigrateAuthToSaml(arg0 context.Context, arg1 string, arg2 map[string]string, arg3 bool) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "MigrateAuthToSaml", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) MigrateAuthToSaml(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "MigrateAuthToSaml", reflect.TypeOf((*MockClient)(nil).MigrateAuthToSaml), arg0, arg1, arg2, arg3)
}
func (m *MockClient) MigrateConfig(arg0 context.Context, arg1, arg2 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "MigrateConfig", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) MigrateConfig(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "MigrateConfig", reflect.TypeOf((*MockClient)(nil).MigrateConfig), arg0, arg1, arg2)
}
func (m *MockClient) MigrateIdLdap(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "MigrateIdLdap", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) MigrateIdLdap(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "MigrateIdLdap", reflect.TypeOf((*MockClient)(nil).MigrateIdLdap), arg0, arg1)
}
func (m *MockClient) MoveChannel(arg0 context.Context, arg1, arg2 string, arg3 bool) (*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "MoveChannel", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) MoveChannel(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "MoveChannel", reflect.TypeOf((*MockClient)(nil).MoveChannel), arg0, arg1, arg2, arg3)
}
func (m *MockClient) MoveCommand(arg0 context.Context, arg1, arg2 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "MoveCommand", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) MoveCommand(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "MoveCommand", reflect.TypeOf((*MockClient)(nil).MoveCommand), arg0, arg1, arg2)
}
func (m *MockClient) PatchBot(arg0 context.Context, arg1 string, arg2 *model.BotPatch) (*model.Bot, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PatchBot", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Bot)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) PatchBot(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PatchBot", reflect.TypeOf((*MockClient)(nil).PatchBot), arg0, arg1, arg2)
}
func (m *MockClient) PatchCPAField(arg0 context.Context, arg1 string, arg2 *model.PropertyFieldPatch) (*model.PropertyField, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PatchCPAField", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.PropertyField)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) PatchCPAField(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PatchCPAField", reflect.TypeOf((*MockClient)(nil).PatchCPAField), arg0, arg1, arg2)
}
func (m *MockClient) PatchCPAValues(arg0 context.Context, arg1 map[string]json.RawMessage) (map[string]json.RawMessage, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PatchCPAValues", arg0, arg1)
	ret0, _ := ret[0].(map[string]json.RawMessage)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) PatchCPAValues(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PatchCPAValues", reflect.TypeOf((*MockClient)(nil).PatchCPAValues), arg0, arg1)
}
func (m *MockClient) PatchCPAValuesForUser(arg0 context.Context, arg1 string, arg2 map[string]json.RawMessage) (map[string]json.RawMessage, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PatchCPAValuesForUser", arg0, arg1, arg2)
	ret0, _ := ret[0].(map[string]json.RawMessage)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) PatchCPAValuesForUser(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PatchCPAValuesForUser", reflect.TypeOf((*MockClient)(nil).PatchCPAValuesForUser), arg0, arg1, arg2)
}
func (m *MockClient) PatchChannel(arg0 context.Context, arg1 string, arg2 *model.ChannelPatch) (*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PatchChannel", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) PatchChannel(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PatchChannel", reflect.TypeOf((*MockClient)(nil).PatchChannel), arg0, arg1, arg2)
}
func (m *MockClient) PatchConfig(arg0 context.Context, arg1 *model.Config) (*model.Config, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PatchConfig", arg0, arg1)
	ret0, _ := ret[0].(*model.Config)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) PatchConfig(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PatchConfig", reflect.TypeOf((*MockClient)(nil).PatchConfig), arg0, arg1)
}
func (m *MockClient) PatchRole(arg0 context.Context, arg1 string, arg2 *model.RolePatch) (*model.Role, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PatchRole", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Role)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) PatchRole(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PatchRole", reflect.TypeOf((*MockClient)(nil).PatchRole), arg0, arg1, arg2)
}
func (m *MockClient) PatchTeam(arg0 context.Context, arg1 string, arg2 *model.TeamPatch) (*model.Team, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PatchTeam", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Team)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) PatchTeam(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PatchTeam", reflect.TypeOf((*MockClient)(nil).PatchTeam), arg0, arg1, arg2)
}
func (m *MockClient) PermanentDeleteAllUsers(arg0 context.Context) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PermanentDeleteAllUsers", arg0)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) PermanentDeleteAllUsers(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PermanentDeleteAllUsers", reflect.TypeOf((*MockClient)(nil).PermanentDeleteAllUsers), arg0)
}
func (m *MockClient) PermanentDeleteChannel(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PermanentDeleteChannel", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) PermanentDeleteChannel(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PermanentDeleteChannel", reflect.TypeOf((*MockClient)(nil).PermanentDeleteChannel), arg0, arg1)
}
func (m *MockClient) PermanentDeletePost(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PermanentDeletePost", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) PermanentDeletePost(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PermanentDeletePost", reflect.TypeOf((*MockClient)(nil).PermanentDeletePost), arg0, arg1)
}
func (m *MockClient) PermanentDeleteTeam(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PermanentDeleteTeam", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) PermanentDeleteTeam(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PermanentDeleteTeam", reflect.TypeOf((*MockClient)(nil).PermanentDeleteTeam), arg0, arg1)
}
func (m *MockClient) PermanentDeleteUser(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PermanentDeleteUser", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) PermanentDeleteUser(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PermanentDeleteUser", reflect.TypeOf((*MockClient)(nil).PermanentDeleteUser), arg0, arg1)
}
func (m *MockClient) PromoteGuestToUser(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "PromoteGuestToUser", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) PromoteGuestToUser(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "PromoteGuestToUser", reflect.TypeOf((*MockClient)(nil).PromoteGuestToUser), arg0, arg1)
}
func (m *MockClient) RegenOutgoingHookToken(arg0 context.Context, arg1 string) (*model.OutgoingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RegenOutgoingHookToken", arg0, arg1)
	ret0, _ := ret[0].(*model.OutgoingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) RegenOutgoingHookToken(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RegenOutgoingHookToken", reflect.TypeOf((*MockClient)(nil).RegenOutgoingHookToken), arg0, arg1)
}
func (m *MockClient) ReloadConfig(arg0 context.Context) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ReloadConfig", arg0)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) ReloadConfig(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ReloadConfig", reflect.TypeOf((*MockClient)(nil).ReloadConfig), arg0)
}
func (m *MockClient) RemoveLicenseFile(arg0 context.Context) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RemoveLicenseFile", arg0)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) RemoveLicenseFile(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RemoveLicenseFile", reflect.TypeOf((*MockClient)(nil).RemoveLicenseFile), arg0)
}
func (m *MockClient) RemovePlugin(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RemovePlugin", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) RemovePlugin(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RemovePlugin", reflect.TypeOf((*MockClient)(nil).RemovePlugin), arg0, arg1)
}
func (m *MockClient) RemoveTeamMember(arg0 context.Context, arg1, arg2 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RemoveTeamMember", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) RemoveTeamMember(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RemoveTeamMember", reflect.TypeOf((*MockClient)(nil).RemoveTeamMember), arg0, arg1, arg2)
}
func (m *MockClient) RemoveUserFromChannel(arg0 context.Context, arg1, arg2 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RemoveUserFromChannel", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) RemoveUserFromChannel(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RemoveUserFromChannel", reflect.TypeOf((*MockClient)(nil).RemoveUserFromChannel), arg0, arg1, arg2)
}
func (m *MockClient) ResetSamlAuthDataToEmail(arg0 context.Context, arg1, arg2 bool, arg3 []string) (int64, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "ResetSamlAuthDataToEmail", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(int64)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) ResetSamlAuthDataToEmail(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "ResetSamlAuthDataToEmail", reflect.TypeOf((*MockClient)(nil).ResetSamlAuthDataToEmail), arg0, arg1, arg2, arg3)
}
func (m *MockClient) RestoreChannel(arg0 context.Context, arg1 string) (*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RestoreChannel", arg0, arg1)
	ret0, _ := ret[0].(*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) RestoreChannel(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RestoreChannel", reflect.TypeOf((*MockClient)(nil).RestoreChannel), arg0, arg1)
}
func (m *MockClient) RestoreGroup(arg0 context.Context, arg1, arg2 string) (*model.Group, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RestoreGroup", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Group)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) RestoreGroup(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RestoreGroup", reflect.TypeOf((*MockClient)(nil).RestoreGroup), arg0, arg1, arg2)
}
func (m *MockClient) RestoreTeam(arg0 context.Context, arg1 string) (*model.Team, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RestoreTeam", arg0, arg1)
	ret0, _ := ret[0].(*model.Team)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) RestoreTeam(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RestoreTeam", reflect.TypeOf((*MockClient)(nil).RestoreTeam), arg0, arg1)
}
func (m *MockClient) RevealPost(arg0 context.Context, arg1 string) (*model.Post, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RevealPost", arg0, arg1)
	ret0, _ := ret[0].(*model.Post)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) RevealPost(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RevealPost", reflect.TypeOf((*MockClient)(nil).RevealPost), arg0, arg1)
}
func (m *MockClient) RevokeUserAccessToken(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "RevokeUserAccessToken", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) RevokeUserAccessToken(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "RevokeUserAccessToken", reflect.TypeOf((*MockClient)(nil).RevokeUserAccessToken), arg0, arg1)
}
func (m *MockClient) SearchTeams(arg0 context.Context, arg1 *model.TeamSearch) ([]*model.Team, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "SearchTeams", arg0, arg1)
	ret0, _ := ret[0].([]*model.Team)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) SearchTeams(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "SearchTeams", reflect.TypeOf((*MockClient)(nil).SearchTeams), arg0, arg1)
}
func (m *MockClient) SendPasswordResetEmail(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "SendPasswordResetEmail", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) SendPasswordResetEmail(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "SendPasswordResetEmail", reflect.TypeOf((*MockClient)(nil).SendPasswordResetEmail), arg0, arg1)
}
func (m *MockClient) SetServerBusy(arg0 context.Context, arg1 int) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "SetServerBusy", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) SetServerBusy(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "SetServerBusy", reflect.TypeOf((*MockClient)(nil).SetServerBusy), arg0, arg1)
}
func (m *MockClient) SoftDeleteTeam(arg0 context.Context, arg1 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "SoftDeleteTeam", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) SoftDeleteTeam(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "SoftDeleteTeam", reflect.TypeOf((*MockClient)(nil).SoftDeleteTeam), arg0, arg1)
}
func (m *MockClient) SyncLdap(arg0 context.Context) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "SyncLdap", arg0)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) SyncLdap(arg0 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "SyncLdap", reflect.TypeOf((*MockClient)(nil).SyncLdap), arg0)
}
func (m *MockClient) UpdateChannelPrivacy(arg0 context.Context, arg1 string, arg2 model.ChannelType) (*model.Channel, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateChannelPrivacy", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Channel)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UpdateChannelPrivacy(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateChannelPrivacy", reflect.TypeOf((*MockClient)(nil).UpdateChannelPrivacy), arg0, arg1, arg2)
}
func (m *MockClient) UpdateCommand(arg0 context.Context, arg1 *model.Command) (*model.Command, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateCommand", arg0, arg1)
	ret0, _ := ret[0].(*model.Command)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UpdateCommand(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateCommand", reflect.TypeOf((*MockClient)(nil).UpdateCommand), arg0, arg1)
}
func (m *MockClient) UpdateConfig(arg0 context.Context, arg1 *model.Config) (*model.Config, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateConfig", arg0, arg1)
	ret0, _ := ret[0].(*model.Config)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UpdateConfig(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateConfig", reflect.TypeOf((*MockClient)(nil).UpdateConfig), arg0, arg1)
}
func (m *MockClient) UpdateIncomingWebhook(arg0 context.Context, arg1 *model.IncomingWebhook) (*model.IncomingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateIncomingWebhook", arg0, arg1)
	ret0, _ := ret[0].(*model.IncomingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UpdateIncomingWebhook(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateIncomingWebhook", reflect.TypeOf((*MockClient)(nil).UpdateIncomingWebhook), arg0, arg1)
}
func (m *MockClient) UpdateJobStatus(arg0 context.Context, arg1, arg2 string, arg3 bool) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateJobStatus", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) UpdateJobStatus(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateJobStatus", reflect.TypeOf((*MockClient)(nil).UpdateJobStatus), arg0, arg1, arg2, arg3)
}
func (m *MockClient) UpdateOutgoingWebhook(arg0 context.Context, arg1 *model.OutgoingWebhook) (*model.OutgoingWebhook, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateOutgoingWebhook", arg0, arg1)
	ret0, _ := ret[0].(*model.OutgoingWebhook)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UpdateOutgoingWebhook(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateOutgoingWebhook", reflect.TypeOf((*MockClient)(nil).UpdateOutgoingWebhook), arg0, arg1)
}
func (m *MockClient) UpdatePreferences(arg0 context.Context, arg1 string, arg2 model.Preferences) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdatePreferences", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) UpdatePreferences(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdatePreferences", reflect.TypeOf((*MockClient)(nil).UpdatePreferences), arg0, arg1, arg2)
}
func (m *MockClient) UpdateTeam(arg0 context.Context, arg1 *model.Team) (*model.Team, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateTeam", arg0, arg1)
	ret0, _ := ret[0].(*model.Team)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UpdateTeam(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateTeam", reflect.TypeOf((*MockClient)(nil).UpdateTeam), arg0, arg1)
}
func (m *MockClient) UpdateTeamPrivacy(arg0 context.Context, arg1, arg2 string) (*model.Team, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateTeamPrivacy", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Team)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UpdateTeamPrivacy(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateTeamPrivacy", reflect.TypeOf((*MockClient)(nil).UpdateTeamPrivacy), arg0, arg1, arg2)
}
func (m *MockClient) UpdateUser(arg0 context.Context, arg1 *model.User) (*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateUser", arg0, arg1)
	ret0, _ := ret[0].(*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UpdateUser(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateUser", reflect.TypeOf((*MockClient)(nil).UpdateUser), arg0, arg1)
}
func (m *MockClient) UpdateUserActive(arg0 context.Context, arg1 string, arg2 bool) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateUserActive", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) UpdateUserActive(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateUserActive", reflect.TypeOf((*MockClient)(nil).UpdateUserActive), arg0, arg1, arg2)
}
func (m *MockClient) UpdateUserAuth(arg0 context.Context, arg1 string, arg2 *model.UserAuth) (*model.UserAuth, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateUserAuth", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.UserAuth)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UpdateUserAuth(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateUserAuth", reflect.TypeOf((*MockClient)(nil).UpdateUserAuth), arg0, arg1, arg2)
}
func (m *MockClient) UpdateUserHashedPassword(arg0 context.Context, arg1, arg2 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateUserHashedPassword", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) UpdateUserHashedPassword(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateUserHashedPassword", reflect.TypeOf((*MockClient)(nil).UpdateUserHashedPassword), arg0, arg1, arg2)
}
func (m *MockClient) UpdateUserMfa(arg0 context.Context, arg1, arg2 string, arg3 bool) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateUserMfa", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) UpdateUserMfa(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateUserMfa", reflect.TypeOf((*MockClient)(nil).UpdateUserMfa), arg0, arg1, arg2, arg3)
}
func (m *MockClient) UpdateUserPassword(arg0 context.Context, arg1, arg2, arg3 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateUserPassword", arg0, arg1, arg2, arg3)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) UpdateUserPassword(arg0, arg1, arg2, arg3 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateUserPassword", reflect.TypeOf((*MockClient)(nil).UpdateUserPassword), arg0, arg1, arg2, arg3)
}
func (m *MockClient) UpdateUserRoles(arg0 context.Context, arg1, arg2 string) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UpdateUserRoles", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) UpdateUserRoles(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UpdateUserRoles", reflect.TypeOf((*MockClient)(nil).UpdateUserRoles), arg0, arg1, arg2)
}
func (m *MockClient) UploadData(arg0 context.Context, arg1 string, arg2 io.Reader) (*model.FileInfo, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UploadData", arg0, arg1, arg2)
	ret0, _ := ret[0].(*model.FileInfo)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UploadData(arg0, arg1, arg2 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UploadData", reflect.TypeOf((*MockClient)(nil).UploadData), arg0, arg1, arg2)
}
func (m *MockClient) UploadLicenseFile(arg0 context.Context, arg1 []byte) (*model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UploadLicenseFile", arg0, arg1)
	ret0, _ := ret[0].(*model.Response)
	ret1, _ := ret[1].(error)
	return ret0, ret1
}
func (mr *MockClientMockRecorder) UploadLicenseFile(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UploadLicenseFile", reflect.TypeOf((*MockClient)(nil).UploadLicenseFile), arg0, arg1)
}
func (m *MockClient) UploadPlugin(arg0 context.Context, arg1 io.Reader) (*model.Manifest, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UploadPlugin", arg0, arg1)
	ret0, _ := ret[0].(*model.Manifest)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UploadPlugin(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UploadPlugin", reflect.TypeOf((*MockClient)(nil).UploadPlugin), arg0, arg1)
}
func (m *MockClient) UploadPluginForced(arg0 context.Context, arg1 io.Reader) (*model.Manifest, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "UploadPluginForced", arg0, arg1)
	ret0, _ := ret[0].(*model.Manifest)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) UploadPluginForced(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "UploadPluginForced", reflect.TypeOf((*MockClient)(nil).UploadPluginForced), arg0, arg1)
}
func (m *MockClient) VerifyUserEmailWithoutToken(arg0 context.Context, arg1 string) (*model.User, *model.Response, error) {
	m.ctrl.T.Helper()
	ret := m.ctrl.Call(m, "VerifyUserEmailWithoutToken", arg0, arg1)
	ret0, _ := ret[0].(*model.User)
	ret1, _ := ret[1].(*model.Response)
	ret2, _ := ret[2].(error)
	return ret0, ret1, ret2
}
func (mr *MockClientMockRecorder) VerifyUserEmailWithoutToken(arg0, arg1 interface{}) *gomock.Call {
	mr.mock.ctrl.T.Helper()
	return mr.mock.ctrl.RecordCallWithMethodType(mr.mock, "VerifyUserEmailWithoutToken", reflect.TypeOf((*MockClient)(nil).VerifyUserEmailWithoutToken), arg0, arg1)
}