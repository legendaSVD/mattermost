package jobs
import (
	"net/http"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
type BatchMigrationWorkerAppIFace interface {
	GetClusterStatus(rctx request.CTX) ([]*model.ClusterInfo, error)
}
type BatchMigrationWorker struct {
	*BatchWorker
	app              BatchMigrationWorkerAppIFace
	migrationKey     string
	doMigrationBatch func(data model.StringMap, store store.Store) (model.StringMap, bool, error)
}
func MakeBatchMigrationWorker(
	jobServer *JobServer,
	store store.Store,
	app BatchMigrationWorkerAppIFace,
	migrationKey string,
	timeBetweenBatches time.Duration,
	doMigrationBatch func(data model.StringMap, store store.Store) (model.StringMap, bool, error),
) *BatchMigrationWorker {
	worker := &BatchMigrationWorker{
		app:              app,
		migrationKey:     migrationKey,
		doMigrationBatch: doMigrationBatch,
	}
	worker.BatchWorker = MakeBatchWorker(jobServer, store, timeBetweenBatches, worker.doBatch)
	return worker
}
func (worker *BatchMigrationWorker) doBatch(rctx request.CTX, job *model.Job) bool {
	if !worker.checkIsClusterInSync(rctx) {
		worker.logger.Warn("Worker: Resetting job")
		worker.resetJob(worker.logger, job)
		return true
	}
	nextData, done, err := worker.doMigrationBatch(job.Data, worker.store)
	if err != nil {
		worker.logger.Error("Worker: Failed to do migration batch. Exiting", mlog.Err(err))
		worker.setJobError(worker.logger, job, model.NewAppError("doMigrationBatch", model.NoTranslation, nil, "", http.StatusInternalServerError).Wrap(err))
		return true
	} else if done {
		worker.logger.Info("Worker: Job is complete")
		worker.setJobSuccess(worker.logger, job)
		worker.markAsComplete()
		return true
	}
	job.Data = nextData
	if err := worker.jobServer.SetJobProgress(job, 0); err != nil {
		worker.logger.Error("Worker: Failed to set job progress", mlog.Err(err))
		return false
	}
	return false
}
func (worker *BatchMigrationWorker) checkIsClusterInSync(rctx request.CTX) bool {
	clusterStatus, err := worker.app.GetClusterStatus(rctx)
	if err != nil {
		worker.logger.Error("Worker: Failed to get cluster status", mlog.Err(err))
		return false
	}
	for i := 1; i < len(clusterStatus); i++ {
		if clusterStatus[i].SchemaVersion != clusterStatus[0].SchemaVersion {
			rctx.Logger().Warn(
				"Worker: cluster not in sync",
				mlog.String("schema_version_a", clusterStatus[0].SchemaVersion),
				mlog.String("schema_version_b", clusterStatus[1].SchemaVersion),
				mlog.String("server_ip_a", clusterStatus[0].IPAddress),
				mlog.String("server_ip_b", clusterStatus[1].IPAddress),
			)
			return false
		}
	}
	return true
}
func (worker *BatchMigrationWorker) markAsComplete() {
	system := model.System{
		Name:  worker.migrationKey,
		Value: "true",
	}
	if err := worker.jobServer.Store.System().Save(&system); err != nil {
		worker.logger.Error("Worker: Failed to mark migration as completed in the systems table.", mlog.String("migration_key", worker.migrationKey), mlog.Err(err))
	}
}