package cluster
import (
	"encoding/json"
	"math/rand"
	"sync"
	"time"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
)
const (
	oncePrefix = "once_"
	keysPerPage = 1000
	maxNumFails = 3
	waitAfterFail = 1 * time.Second
	pollNewJobsInterval = 5 * time.Minute
	scheduleOnceJitter = 100 * time.Millisecond
	propsLimit = 10000
)
type JobOnceMetadata struct {
	Key   string
	RunAt time.Time
	Props any
}
type JobOnce struct {
	pluginAPI    JobPluginAPI
	clusterMutex *Mutex
	key      string
	props    any
	runAt    time.Time
	numFails int
	done     chan bool
	doneOnce sync.Once
	join     chan bool
	joinOnce sync.Once
	storedCallback *syncedCallback
	activeJobs     *syncedJobs
}
func (j *JobOnce) Cancel() {
	j.clusterMutex.Lock()
	defer j.clusterMutex.Unlock()
	j.cancelWhileHoldingMutex()
	j.joinOnce.Do(func() {
		<-j.join
	})
}
func newJobOnce(pluginAPI JobPluginAPI, key string, runAt time.Time, callback *syncedCallback, jobs *syncedJobs, props any) (*JobOnce, error) {
	mutex, err := NewMutex(pluginAPI, key)
	if err != nil {
		return nil, errors.Wrap(err, "failed to create job mutex")
	}
	propsBytes, err := json.Marshal(props)
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal props")
	}
	if len(propsBytes) > propsLimit {
		return nil, errors.Errorf("props length extends limit")
	}
	return &JobOnce{
		pluginAPI:      pluginAPI,
		clusterMutex:   mutex,
		key:            key,
		props:          props,
		runAt:          runAt,
		done:           make(chan bool),
		join:           make(chan bool),
		storedCallback: callback,
		activeJobs:     jobs,
	}, nil
}
func (j *JobOnce) run() {
	defer close(j.join)
	wait := time.Until(j.runAt)
	for {
		select {
		case <-j.done:
			return
		case <-time.After(wait + addJitter()):
		}
		func() {
			j.clusterMutex.Lock()
			defer j.clusterMutex.Unlock()
			metadata, err := readMetadata(j.pluginAPI, j.key)
			if err != nil {
				j.numFails++
				if j.numFails > maxNumFails {
					j.cancelWhileHoldingMutex()
					return
				}
				wait = waitAfterFail
				return
			}
			if metadata == nil || !j.runAt.Equal(metadata.RunAt) {
				j.cancelWhileHoldingMutex()
				return
			}
			j.executeJob()
			j.cancelWhileHoldingMutex()
		}()
	}
}
func (j *JobOnce) executeJob() {
	j.storedCallback.mu.Lock()
	defer j.storedCallback.mu.Unlock()
	j.storedCallback.callback(j.key, j.props)
}
func readMetadata(pluginAPI JobPluginAPI, key string) (*JobOnceMetadata, error) {
	data, appErr := pluginAPI.KVGet(oncePrefix + key)
	if appErr != nil {
		return nil, errors.Wrap(normalizeAppErr(appErr), "failed to read data")
	}
	if data == nil {
		return nil, nil
	}
	var metadata JobOnceMetadata
	if err := json.Unmarshal(data, &metadata); err != nil {
		return nil, errors.Wrap(err, "failed to decode data")
	}
	return &metadata, nil
}
func (j *JobOnce) saveMetadata() error {
	j.clusterMutex.Lock()
	defer j.clusterMutex.Unlock()
	metadata := JobOnceMetadata{
		Key:   j.key,
		Props: j.props,
		RunAt: j.runAt,
	}
	data, err := json.Marshal(metadata)
	if err != nil {
		return errors.Wrap(err, "failed to marshal data")
	}
	ok, appErr := j.pluginAPI.KVSetWithOptions(oncePrefix+j.key, data, model.PluginKVSetOptions{
		Atomic:   true,
		OldValue: nil,
	})
	if appErr != nil {
		return normalizeAppErr(appErr)
	}
	if !ok {
		return errors.New("failed to set data")
	}
	return nil
}
func (j *JobOnce) cancelWhileHoldingMutex() {
	_ = j.pluginAPI.KVDelete(oncePrefix + j.key)
	j.activeJobs.mu.Lock()
	defer j.activeJobs.mu.Unlock()
	delete(j.activeJobs.jobs, j.key)
	j.doneOnce.Do(func() {
		close(j.done)
	})
}
func addJitter() time.Duration {
	return time.Duration(rand.Int63n(int64(scheduleOnceJitter)))
}
func normalizeAppErr(appErr *model.AppError) error {
	if appErr == nil {
		return nil
	}
	return appErr
}