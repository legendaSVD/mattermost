package jobs
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type DataRetentionJobInterface interface {
	MakeWorker() model.Worker
	MakeScheduler() Scheduler
}