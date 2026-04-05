package cluster
import (
	"encoding/json"
	"sync"
	"time"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
)
const (
	cronPrefix = "cron_"
)
type JobPluginAPI interface {
	MutexPluginAPI
	KVGet(key string) ([]byte, *model.AppError)
	KVDelete(key string) *model.AppError
	KVList(page, count int) ([]string, *model.AppError)
}
type JobConfig struct {
	Interval time.Duration
}
type NextWaitInterval func(now time.Time, metadata JobMetadata) time.Duration
func MakeWaitForInterval(interval time.Duration) NextWaitInterval {
	if interval == 0 {
		panic("must specify non-zero ready interval")
	}
	return func(now time.Time, metadata JobMetadata) time.Duration {
		sinceLastFinished := now.Sub(metadata.LastFinished)
		if sinceLastFinished < interval {
			return interval - sinceLastFinished
		}
		return 0
	}
}
func MakeWaitForRoundedInterval(interval time.Duration) NextWaitInterval {
	if interval == 0 {
		panic("must specify non-zero ready interval")
	}
	return func(now time.Time, metadata JobMetadata) time.Duration {
		if metadata.LastFinished.IsZero() {
			return 0
		}
		target := metadata.LastFinished.Add(interval).Truncate(interval)
		untilTarget := target.Sub(now)
		if untilTarget > 0 {
			return untilTarget
		}
		return 0
	}
}
type Job struct {
	pluginAPI        JobPluginAPI
	key              string
	mutex            *Mutex
	nextWaitInterval NextWaitInterval
	callback         func()
	stopOnce sync.Once
	stop     chan bool
	done     chan bool
}
type JobMetadata struct {
	LastFinished time.Time
}
func Schedule(pluginAPI JobPluginAPI, key string, nextWaitInterval NextWaitInterval, callback func()) (*Job, error) {
	key = cronPrefix + key
	mutex, err := NewMutex(pluginAPI, key)
	if err != nil {
		return nil, errors.Wrap(err, "failed to create job mutex")
	}
	job := &Job{
		pluginAPI:        pluginAPI,
		key:              key,
		mutex:            mutex,
		nextWaitInterval: nextWaitInterval,
		callback:         callback,
		stop:             make(chan bool),
		done:             make(chan bool),
	}
	go job.run()
	return job, nil
}
func (j *Job) readMetadata() (JobMetadata, error) {
	data, appErr := j.pluginAPI.KVGet(j.key)
	if appErr != nil {
		return JobMetadata{}, errors.Wrap(appErr, "failed to read data")
	}
	if data == nil {
		return JobMetadata{}, nil
	}
	var metadata JobMetadata
	err := json.Unmarshal(data, &metadata)
	if err != nil {
		return JobMetadata{}, errors.Wrap(err, "failed to decode data")
	}
	return metadata, nil
}
func (j *Job) saveMetadata(metadata JobMetadata) error {
	data, err := json.Marshal(metadata)
	if err != nil {
		return errors.Wrap(err, "failed to marshal data")
	}
	ok, appErr := j.pluginAPI.KVSetWithOptions(j.key, data, model.PluginKVSetOptions{})
	if appErr != nil || !ok {
		return errors.Wrap(appErr, "failed to set data")
	}
	return nil
}
func (j *Job) run() {
	defer close(j.done)
	var waitInterval time.Duration
	for {
		select {
		case <-j.stop:
			return
		case <-time.After(waitInterval):
		}
		func() {
			j.mutex.Lock()
			defer j.mutex.Unlock()
			metadata, err := j.readMetadata()
			if err != nil {
				j.pluginAPI.LogError("failed to read job metadata", "err", err, "key", j.key)
				waitInterval = nextWaitInterval(waitInterval, err)
				return
			}
			waitInterval = j.nextWaitInterval(time.Now(), metadata)
			if waitInterval > 0 {
				return
			}
			j.callback()
			metadata.LastFinished = time.Now()
			err = j.saveMetadata(metadata)
			if err != nil {
				j.pluginAPI.LogError("failed to write job data", "err", err, "key", j.key)
			}
			waitInterval = j.nextWaitInterval(time.Now(), metadata)
		}()
	}
}
func (j *Job) Close() error {
	j.stopOnce.Do(func() {
		close(j.stop)
	})
	<-j.done
	return nil
}