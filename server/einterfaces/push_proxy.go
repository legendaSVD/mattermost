package einterfaces
import (
	"github.com/mattermost/mattermost/server/public/model"
	ejobs "github.com/mattermost/mattermost/server/v8/einterfaces/jobs"
)
type PushProxyInterface interface {
	GetAuthToken() string
	GenerateAuthToken() *model.AppError
	DeleteAuthToken() *model.AppError
	MakeWorker() model.Worker
	MakeScheduler() ejobs.Scheduler
}