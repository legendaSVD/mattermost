package jobs
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type AccessControlSyncJobInterface interface {
	MakeWorker() model.Worker
	MakeScheduler() Scheduler
}