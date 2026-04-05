package jobs
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type ElasticsearchIndexerInterface interface {
	MakeWorker() model.Worker
}
type ElasticsearchAggregatorInterface interface {
	MakeWorker() model.Worker
	MakeScheduler() Scheduler
}