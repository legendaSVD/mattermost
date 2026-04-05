package delete_dms_preferences_migration
import (
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/jobs"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/pkg/errors"
)
const (
	timeBetweenBatches = 1 * time.Second
)
func MakeWorker(jobServer *jobs.JobServer, store store.Store, app jobs.BatchMigrationWorkerAppIFace) model.Worker {
	return jobs.MakeBatchMigrationWorker(
		jobServer,
		store,
		app,
		model.MigrationKeyDeleteDmsPreferences,
		timeBetweenBatches,
		doDeleteDmsPreferencesMigrationBatch,
	)
}
func doDeleteDmsPreferencesMigrationBatch(data model.StringMap, store store.Store) (model.StringMap, bool, error) {
	rowAffected, err := store.Preference().DeleteInvalidVisibleDmsGms()
	if err != nil {
		return nil, false, errors.Wrapf(err, "failed to delete invalid limit_visible_dms_gms")
	}
	if rowAffected == 0 {
		return nil, true, nil
	}
	return nil, false, nil
}