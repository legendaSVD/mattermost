package mobile_session_metadata
import (
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/jobs"
)
const schedFreq = 24 * time.Hour
func MakeScheduler(jobServer *jobs.JobServer) *jobs.PeriodicScheduler {
	isEnabled := func(cfg *model.Config) bool {
		return *cfg.MetricsSettings.EnableClientMetrics
	}
	return jobs.NewPeriodicScheduler(jobServer, model.JobTypeMobileSessionMetadata, schedFreq, isEnabled)
}