package jobs
import (
	"sync"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
type BatchWorker struct {
	jobServer *JobServer
	logger    mlog.LoggerIFace
	store     store.Store
	stateMut  sync.Mutex
	stopCh    chan struct{}
	stoppedCh chan bool
	stopped   bool
	jobs      chan model.Job
	timeBetweenBatches time.Duration
	doBatch            func(rctx request.CTX, job *model.Job) bool
}
func MakeBatchWorker(
	jobServer *JobServer,
	store store.Store,
	timeBetweenBatches time.Duration,
	doBatch func(rctx request.CTX, job *model.Job) bool,
) *BatchWorker {
	return &BatchWorker{
		jobServer:          jobServer,
		logger:             jobServer.Logger(),
		store:              store,
		stoppedCh:          make(chan bool, 1),
		jobs:               make(chan model.Job),
		timeBetweenBatches: timeBetweenBatches,
		doBatch:            doBatch,
		stopped:            true,
	}
}
func (worker *BatchWorker) Run() {
	worker.stateMut.Lock()
	if worker.stopped {
		worker.stopped = false
		worker.stopCh = make(chan struct{})
	} else {
		worker.stateMut.Unlock()
		return
	}
	worker.stateMut.Unlock()
	worker.logger.Debug("Worker started")
	defer func() {
		worker.logger.Debug("Worker finished")
		worker.stoppedCh <- true
	}()
	for {
		select {
		case <-worker.stopCh:
			worker.logger.Debug("Worker received stop signal")
			return
		case job := <-worker.jobs:
			worker.DoJob(&job)
		}
	}
}
func (worker *BatchWorker) Stop() {
	worker.stateMut.Lock()
	defer worker.stateMut.Unlock()
	if worker.stopped {
		return
	}
	worker.stopped = true
	worker.logger.Debug("Worker stopping")
	close(worker.stopCh)
	<-worker.stoppedCh
}
func (worker *BatchWorker) JobChannel() chan<- model.Job {
	return worker.jobs
}
func (worker *BatchWorker) IsEnabled(_ *model.Config) bool {
	return true
}
func (worker *BatchWorker) DoJob(job *model.Job) {
	logger := worker.logger.With(mlog.Any("job", job))
	logger.Debug("Worker received a new candidate job.")
	defer worker.jobServer.HandleJobPanic(logger, job)
	var appErr *model.AppError
	job, appErr = worker.jobServer.ClaimJob(job)
	if appErr != nil {
		logger.Warn("Worker experienced an error while trying to claim job", mlog.Err(appErr))
		return
	} else if job == nil {
		return
	}
	if job.Data == nil {
		job.Data = make(model.StringMap)
	}
	c := request.EmptyContext(logger)
	for {
		select {
		case <-worker.stopCh:
			logger.Info("Worker: Batch has been canceled via Worker Stop. Setting the job back to pending.")
			if err := worker.jobServer.SetJobPending(job); err != nil {
				worker.logger.Error("Worker: Failed to mark job as pending", mlog.Err(err))
			}
			return
		case <-time.After(worker.timeBetweenBatches):
			if stop := worker.doBatch(c, job); stop {
				return
			}
		}
	}
}
func (worker *BatchWorker) resetJob(logger mlog.LoggerIFace, job *model.Job) {
	job.Data = nil
	job.Progress = 0
	job.Status = model.JobStatusPending
	if _, err := worker.store.Job().UpdateOptimistically(job, model.JobStatusInProgress); err != nil {
		worker.logger.Error("Worker: Failed to reset job data. May resume instead of restarting.", mlog.Err(err))
	}
}
func (worker *BatchWorker) setJobSuccess(logger mlog.LoggerIFace, job *model.Job) {
	if err := worker.jobServer.SetJobProgress(job, 100); err != nil {
		logger.Error("Worker: Failed to update progress for job", mlog.Err(err))
		worker.setJobError(logger, job, err)
	}
	if err := worker.jobServer.SetJobSuccess(job); err != nil {
		logger.Error("Worker: Failed to set success for job", mlog.Err(err))
		worker.setJobError(logger, job, err)
	}
}
func (worker *BatchWorker) setJobError(logger mlog.LoggerIFace, job *model.Job, appError *model.AppError) {
	if err := worker.jobServer.SetJobError(job, appError); err != nil {
		logger.Error("Worker: Failed to set job error", mlog.Err(err))
	}
}