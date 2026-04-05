package einterfaces
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
type AccountMigrationInterface interface {
	MigrateToLdap(rctx request.CTX, fromAuthService string, foreignUserFieldNameToMatch string, force bool, dryRun bool) *model.AppError
	MigrateToSaml(rctx request.CTX, fromAuthService string, usersMap map[string]string, auto bool, dryRun bool) *model.AppError
}