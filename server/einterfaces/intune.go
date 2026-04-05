package einterfaces
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
type IntuneInterface interface {
	IsConfigured() bool
	Login(rctx request.CTX, accessToken string) (*model.User, *model.AppError)
}