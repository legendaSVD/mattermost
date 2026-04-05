package jobs
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type LdapSyncInterface interface {
	MakeWorker() model.Worker
	MakeScheduler() Scheduler
}