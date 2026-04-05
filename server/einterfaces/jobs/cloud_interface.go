package jobs
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type CloudJobInterface interface {
	MakeWorker() model.Worker
	MakeScheduler() Scheduler
}