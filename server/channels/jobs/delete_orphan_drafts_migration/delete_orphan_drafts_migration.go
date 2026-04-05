package delete_orphan_drafts_migration
import (
	"strconv"
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
		model.MigrationKeyDeleteOrphanDrafts,
		timeBetweenBatches,
		doDeleteOrphanDraftsMigrationBatch,
	)
}
func parseJobMetadata(data model.StringMap) (int64, string, error) {
	createAt := int64(0)
	if data["create_at"] != "" {
		parsedCreateAt, parseErr := strconv.ParseInt(data["create_at"], 10, 64)
		if parseErr != nil {
			return 0, "", errors.Wrap(parseErr, "failed to parse create_at")
		}
		createAt = parsedCreateAt
	}
	userID := data["user_id"]
	return createAt, userID, nil
}
func makeJobMetadata(createAt int64, userID string) model.StringMap {
	data := make(model.StringMap)
	data["create_at"] = strconv.FormatInt(createAt, 10)
	data["user_id"] = userID
	return data
}
func doDeleteOrphanDraftsMigrationBatch(data model.StringMap, store store.Store) (model.StringMap, bool, error) {
	createAt, userID, err := parseJobMetadata(data)
	if err != nil {
		return nil, false, errors.Wrap(err, "failed to parse job metadata")
	}
	nextCreateAt, nextUserID, err := store.Draft().GetLastCreateAtAndUserIdValuesForEmptyDraftsMigration(createAt, userID)
	if err != nil {
		return nil, false, errors.Wrapf(err, "failed to get the next batch (create_at=%v, user_id=%v)", createAt, userID)
	}
	if nextCreateAt == 0 && nextUserID == "" {
		return nil, true, nil
	}
	err = store.Draft().DeleteOrphanDraftsByCreateAtAndUserId(createAt, userID)
	if err != nil {
		return nil, false, errors.Wrapf(err, "failed to delete orphan drafts (create_at=%v, user_id=%v)", createAt, userID)
	}
	return makeJobMetadata(nextCreateAt, nextUserID), false, nil
}