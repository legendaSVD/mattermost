package mocks
import (
	model "github.com/mattermost/mattermost/server/public/model"
	request "github.com/mattermost/mattermost/server/public/shared/request"
	mock "github.com/stretchr/testify/mock"
)
type AccountMigrationInterface struct {
	mock.Mock
}
func (_m *AccountMigrationInterface) MigrateToLdap(rctx request.CTX, fromAuthService string, foreignUserFieldNameToMatch string, force bool, dryRun bool) *model.AppError {
	ret := _m.Called(rctx, fromAuthService, foreignUserFieldNameToMatch, force, dryRun)
	if len(ret) == 0 {
		panic("no return value specified for MigrateToLdap")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, string, string, bool, bool) *model.AppError); ok {
		r0 = rf(rctx, fromAuthService, foreignUserFieldNameToMatch, force, dryRun)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func (_m *AccountMigrationInterface) MigrateToSaml(rctx request.CTX, fromAuthService string, usersMap map[string]string, auto bool, dryRun bool) *model.AppError {
	ret := _m.Called(rctx, fromAuthService, usersMap, auto, dryRun)
	if len(ret) == 0 {
		panic("no return value specified for MigrateToSaml")
	}
	var r0 *model.AppError
	if rf, ok := ret.Get(0).(func(request.CTX, string, map[string]string, bool, bool) *model.AppError); ok {
		r0 = rf(rctx, fromAuthService, usersMap, auto, dryRun)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*model.AppError)
		}
	}
	return r0
}
func NewAccountMigrationInterface(t interface {
	mock.TestingT
	Cleanup(func())
}) *AccountMigrationInterface {
	mock := &AccountMigrationInterface{}
	mock.Mock.Test(t)
	t.Cleanup(func() { mock.AssertExpectations(t) })
	return mock
}