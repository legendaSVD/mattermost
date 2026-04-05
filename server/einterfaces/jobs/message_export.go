package jobs
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type MessageExportJobInterface interface {
	MakeWorker() model.Worker
	MakeScheduler() Scheduler
}