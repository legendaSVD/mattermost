package cluster
import (
	"strings"
	"sync"
	"time"
	"github.com/pkg/errors"
)
type syncedCallback struct {
	mu       sync.Mutex
	callback func(string, any)
}
type syncedJobs struct {
	mu   sync.RWMutex
	jobs map[string]*JobOnce
}
type JobOnceScheduler struct {
	pluginAPI JobPluginAPI
	startedMu sync.RWMutex
	started   bool
	activeJobs     *syncedJobs
	storedCallback *syncedCallback
}
var schedulerOnce sync.Once
var s *JobOnceScheduler
func GetJobOnceScheduler(pluginAPI JobPluginAPI) *JobOnceScheduler {
	schedulerOnce.Do(func() {
		s = &JobOnceScheduler{
			pluginAPI: pluginAPI,
			activeJobs: &syncedJobs{
				jobs: make(map[string]*JobOnce),
			},
			storedCallback: &syncedCallback{},
		}
	})
	return s
}
func (s *JobOnceScheduler) Start() error {
	s.startedMu.Lock()
	defer s.startedMu.Unlock()
	if s.started {
		return errors.New("scheduler has already been started")
	}
	if err := s.verifyCallbackExists(); err != nil {
		return errors.Wrap(err, "callback not found; cannot start scheduler")
	}
	if err := s.scheduleNewJobsFromDB(); err != nil {
		return errors.Wrap(err, "could not start JobOnceScheduler due to error")
	}
	go s.pollForNewScheduledJobs()
	s.started = true
	return nil
}
func (s *JobOnceScheduler) SetCallback(callback func(string, any)) error {
	if callback == nil {
		return errors.New("callback cannot be nil")
	}
	s.storedCallback.mu.Lock()
	defer s.storedCallback.mu.Unlock()
	s.storedCallback.callback = callback
	return nil
}
func (s *JobOnceScheduler) ListScheduledJobs() ([]JobOnceMetadata, error) {
	var ret []JobOnceMetadata
	for i := 0; ; i++ {
		keys, err := s.pluginAPI.KVList(i, keysPerPage)
		if err != nil {
			return nil, errors.Wrap(err, "error getting KVList")
		}
		for _, k := range keys {
			if strings.HasPrefix(k, oncePrefix) {
				metadata, err := readMetadata(s.pluginAPI, k[len(oncePrefix):])
				if err != nil {
					s.pluginAPI.LogError(errors.Wrap(err, "could not retrieve data from plugin kvstore for key: "+k).Error())
					continue
				}
				if metadata == nil {
					continue
				}
				ret = append(ret, *metadata)
			}
		}
		if len(keys) < keysPerPage {
			break
		}
	}
	return ret, nil
}
func (s *JobOnceScheduler) ScheduleOnce(key string, runAt time.Time, props any) (*JobOnce, error) {
	s.startedMu.RLock()
	defer s.startedMu.RUnlock()
	if !s.started {
		return nil, errors.New("start the scheduler before adding jobs")
	}
	job, err := newJobOnce(s.pluginAPI, key, runAt, s.storedCallback, s.activeJobs, props)
	if err != nil {
		return nil, errors.Wrap(err, "could not create new job")
	}
	if err = job.saveMetadata(); err != nil {
		return nil, errors.Wrap(err, "could not save job metadata")
	}
	s.runAndTrack(job)
	return job, nil
}
func (s *JobOnceScheduler) Cancel(key string) {
	job := func() *JobOnce {
		s.activeJobs.mu.RLock()
		defer s.activeJobs.mu.RUnlock()
		j, ok := s.activeJobs.jobs[key]
		if ok {
			return j
		}
		mutex, err := NewMutex(s.pluginAPI, key)
		if err != nil {
			s.pluginAPI.LogError(errors.Wrap(err, "failed to create job mutex in Cancel for key: "+key).Error())
		}
		mutex.Lock()
		defer mutex.Unlock()
		_ = s.pluginAPI.KVDelete(oncePrefix + key)
		return nil
	}()
	if job != nil {
		job.Cancel()
	}
}
func (s *JobOnceScheduler) scheduleNewJobsFromDB() error {
	scheduled, err := s.ListScheduledJobs()
	if err != nil {
		return errors.Wrap(err, "could not read scheduled jobs from db")
	}
	for _, m := range scheduled {
		job, err := newJobOnce(s.pluginAPI, m.Key, m.RunAt, s.storedCallback, s.activeJobs, m.Props)
		if err != nil {
			s.pluginAPI.LogError(errors.Wrap(err, "could not create new job for key: "+m.Key).Error())
			continue
		}
		s.runAndTrack(job)
	}
	return nil
}
func (s *JobOnceScheduler) runAndTrack(job *JobOnce) {
	s.activeJobs.mu.Lock()
	defer s.activeJobs.mu.Unlock()
	if _, ok := s.activeJobs.jobs[job.key]; ok {
		return
	}
	go job.run()
	s.activeJobs.jobs[job.key] = job
}
func (s *JobOnceScheduler) pollForNewScheduledJobs() {
	for {
		<-time.After(pollNewJobsInterval + addJitter())
		if err := s.scheduleNewJobsFromDB(); err != nil {
			s.pluginAPI.LogError("pluginAPI scheduleOnce poller encountered an error but is still polling", "error", err)
		}
	}
}
func (s *JobOnceScheduler) verifyCallbackExists() error {
	s.storedCallback.mu.Lock()
	defer s.storedCallback.mu.Unlock()
	if s.storedCallback.callback == nil {
		return errors.New("set callback before starting the scheduler")
	}
	return nil
}