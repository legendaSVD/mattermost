package jobs
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type IndexerJobInterface interface {
	MakeWorker() model.Worker
}