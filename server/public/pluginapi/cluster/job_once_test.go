package cluster
import (
	"encoding/json"
	"sync"
	"sync/atomic"
	"testing"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestScheduleOnceParallel(t *testing.T) {
	makeKey := model.NewId
	jobKey1 := makeKey()
	count1 := new(int32)
	jobKey2 := makeKey()
	count2 := new(int32)
	jobKey3 := makeKey()
	jobKey4 := makeKey()
	count4 := new(int32)
	jobKey5 := makeKey()
	count5 := new(int32)
	manyJobs := make(map[string]*int32)
	for range 100 {
		manyJobs[makeKey()] = new(int32)
	}
	callback := func(key string, _ any) {
		switch key {
		case jobKey1:
			atomic.AddInt32(count1, 1)
		case jobKey2:
			atomic.AddInt32(count2, 1)
		case jobKey3:
			return
		case jobKey4:
			atomic.AddInt32(count4, 1)
		case jobKey5:
			atomic.AddInt32(count5, 1)
		default:
			count, ok := manyJobs[key]
			if ok {
				atomic.AddInt32(count, 1)
				return
			}
		}
	}
	mockPluginAPI := newMockPluginAPI(t)
	getVal := func(key string) []byte {
		data, _ := mockPluginAPI.KVGet(key)
		return data
	}
	s := GetJobOnceScheduler(mockPluginAPI)
	err := s.Start()
	require.Error(t, err)
	err = s.SetCallback(callback)
	require.NoError(t, err)
	err = s.Start()
	require.NoError(t, err)
	jobs, err := s.ListScheduledJobs()
	require.NoError(t, err)
	require.Empty(t, jobs)
	t.Run("one scheduled job", func(t *testing.T) {
		t.Parallel()
		job, err2 := s.ScheduleOnce(jobKey1, time.Now().Add(100*time.Millisecond), nil)
		require.NoError(t, err2)
		require.NotNil(t, job)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey1))
		time.Sleep(200*time.Millisecond + scheduleOnceJitter)
		assert.Empty(t, getVal(oncePrefix+jobKey1))
		s.activeJobs.mu.RLock()
		assert.Empty(t, s.activeJobs.jobs[jobKey1])
		s.activeJobs.mu.RUnlock()
		job.Cancel()
		job.Cancel()
		job.Cancel()
		job.Cancel()
		assert.Equal(t, int32(1), atomic.LoadInt32(count1))
	})
	t.Run("one job, stopped before firing", func(t *testing.T) {
		t.Parallel()
		job, err2 := s.ScheduleOnce(jobKey2, time.Now().Add(100*time.Millisecond), nil)
		require.NoError(t, err2)
		require.NotNil(t, job)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey2))
		job.Cancel()
		assert.Empty(t, getVal(oncePrefix+jobKey2))
		s.activeJobs.mu.RLock()
		assert.Empty(t, s.activeJobs.jobs[jobKey2])
		s.activeJobs.mu.RUnlock()
		time.Sleep(2 * (waitAfterFail + scheduleOnceJitter))
		assert.Equal(t, int32(0), atomic.LoadInt32(count2))
		job.Cancel()
		job.Cancel()
		job.Cancel()
		job.Cancel()
	})
	t.Run("failed at the plugin, job removed from db", func(t *testing.T) {
		t.Parallel()
		job, err2 := s.ScheduleOnce(jobKey3, time.Now().Add(100*time.Millisecond), nil)
		require.NoError(t, err2)
		require.NotNil(t, job)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey3))
		time.Sleep(200*time.Millisecond + scheduleOnceJitter)
		assert.Empty(t, getVal(oncePrefix+jobKey3))
		s.activeJobs.mu.RLock()
		assert.Empty(t, s.activeJobs.jobs[jobKey3])
		s.activeJobs.mu.RUnlock()
	})
	t.Run("cancel and restart a job with the same key", func(t *testing.T) {
		t.Parallel()
		job, err2 := s.ScheduleOnce(jobKey4, time.Now().Add(100*time.Millisecond), nil)
		require.NoError(t, err2)
		require.NotNil(t, job)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey4))
		job.Cancel()
		assert.Empty(t, getVal(oncePrefix+jobKey4))
		s.activeJobs.mu.RLock()
		assert.Empty(t, s.activeJobs.jobs[jobKey4])
		s.activeJobs.mu.RUnlock()
		job, err2 = s.ScheduleOnce(jobKey4, time.Now().Add(100*time.Millisecond), nil)
		require.NoError(t, err2)
		require.NotNil(t, job)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey4))
		time.Sleep(200*time.Millisecond + scheduleOnceJitter)
		assert.Equal(t, int32(1), atomic.LoadInt32(count4))
		assert.Empty(t, getVal(oncePrefix+jobKey4))
		s.activeJobs.mu.RLock()
		assert.Empty(t, s.activeJobs.jobs[jobKey4])
		s.activeJobs.mu.RUnlock()
	})
	t.Run("many scheduled jobs", func(t *testing.T) {
		t.Parallel()
		for k := range manyJobs {
			job, err2 := s.ScheduleOnce(k, time.Now().Add(100*time.Millisecond), nil)
			require.NoError(t, err2)
			require.NotNil(t, job)
			assert.NotEmpty(t, getVal(oncePrefix+k))
		}
		time.Sleep(200*time.Millisecond + scheduleOnceJitter)
		for k, v := range manyJobs {
			assert.Empty(t, getVal(oncePrefix+k))
			s.activeJobs.mu.RLock()
			assert.Empty(t, s.activeJobs.jobs[k])
			s.activeJobs.mu.RUnlock()
			assert.Equal(t, int32(1), *v)
		}
	})
	t.Run("cancel a job by key name", func(t *testing.T) {
		t.Parallel()
		job, err2 := s.ScheduleOnce(jobKey5, time.Now().Add(100*time.Millisecond), nil)
		require.NoError(t, err2)
		require.NotNil(t, job)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey5))
		s.activeJobs.mu.RLock()
		assert.NotEmpty(t, s.activeJobs.jobs[jobKey5])
		s.activeJobs.mu.RUnlock()
		s.Cancel(jobKey5)
		assert.Empty(t, getVal(oncePrefix+jobKey5))
		s.activeJobs.mu.RLock()
		assert.Empty(t, s.activeJobs.jobs[jobKey5])
		s.activeJobs.mu.RUnlock()
		s.Cancel(jobKey5)
		time.Sleep(150*time.Millisecond + scheduleOnceJitter)
		assert.Equal(t, int32(0), atomic.LoadInt32(count5))
	})
	t.Run("starting the scheduler again will return an error", func(t *testing.T) {
		t.Parallel()
		newScheduler := GetJobOnceScheduler(mockPluginAPI)
		err = newScheduler.Start()
		require.Error(t, err)
	})
}
func TestScheduleOnceSequential(t *testing.T) {
	makeKey := model.NewId
	s := GetJobOnceScheduler(newMockPluginAPI(t))
	getVal := func(key string) []byte {
		data, _ := s.pluginAPI.KVGet(key)
		return data
	}
	setMetadata := func(key string, metadata JobOnceMetadata) error {
		data, err := json.Marshal(metadata)
		if err != nil {
			return err
		}
		ok, appErr := s.pluginAPI.KVSetWithOptions(oncePrefix+key, data, model.PluginKVSetOptions{})
		if !ok {
			return errors.New("KVSetWithOptions failed")
		}
		if appErr != nil {
			return normalizeAppErr(appErr)
		}
		return nil
	}
	resetScheduler := func() {
		s.activeJobs.mu.Lock()
		defer s.activeJobs.mu.Unlock()
		s.activeJobs.jobs = make(map[string]*JobOnce)
		s.storedCallback.mu.Lock()
		defer s.storedCallback.mu.Unlock()
		s.storedCallback.callback = nil
		s.startedMu.Lock()
		defer s.startedMu.Unlock()
		s.started = false
		s.pluginAPI.(*mockPluginAPI).clear()
	}
	t.Run("starting the scheduler without a callback will return an error", func(t *testing.T) {
		resetScheduler()
		err := s.Start()
		require.Error(t, err)
	})
	t.Run("trying to schedule a job without starting will return an error", func(t *testing.T) {
		resetScheduler()
		callback := func(key string, _ any) {}
		err := s.SetCallback(callback)
		require.NoError(t, err)
		_, err = s.ScheduleOnce("will fail", time.Now(), nil)
		require.Error(t, err)
	})
	t.Run("adding two callback works, only second one is called", func(t *testing.T) {
		resetScheduler()
		newCount2 := new(int32)
		newCount3 := new(int32)
		callback2 := func(key string, _ any) {
			atomic.AddInt32(newCount2, 1)
		}
		callback3 := func(key string, _ any) {
			atomic.AddInt32(newCount3, 1)
		}
		err := s.SetCallback(callback2)
		require.NoError(t, err)
		err = s.SetCallback(callback3)
		require.NoError(t, err)
		err = s.Start()
		require.NoError(t, err)
		_, err = s.ScheduleOnce("anything", time.Now().Add(50*time.Millisecond), nil)
		require.NoError(t, err)
		time.Sleep(70*time.Millisecond + scheduleOnceJitter)
		assert.Equal(t, int32(0), atomic.LoadInt32(newCount2))
		assert.Equal(t, int32(1), atomic.LoadInt32(newCount3))
	})
	t.Run("test paging keys from the db by inserting 3 pages of jobs and starting scheduler", func(t *testing.T) {
		resetScheduler()
		numPagingJobs := keysPerPage*3 + 2
		testPagingJobs := make(map[string]*int32)
		for range numPagingJobs {
			testPagingJobs[makeKey()] = new(int32)
		}
		callback := func(key string, _ any) {
			count, ok := testPagingJobs[key]
			if ok {
				atomic.AddInt32(count, 1)
				return
			}
		}
		for k := range testPagingJobs {
			assert.Empty(t, getVal(oncePrefix+k))
			job, err := newJobOnce(s.pluginAPI, k, time.Now().Add(100*time.Millisecond), s.storedCallback, s.activeJobs, nil)
			require.NoError(t, err)
			err = job.saveMetadata()
			require.NoError(t, err)
			assert.NotEmpty(t, getVal(oncePrefix+k))
		}
		jobs, err := s.ListScheduledJobs()
		require.NoError(t, err)
		assert.Equal(t, len(testPagingJobs), len(jobs))
		err = s.SetCallback(callback)
		require.NoError(t, err)
		err = s.scheduleNewJobsFromDB()
		require.NoError(t, err)
		time.Sleep(300 * time.Millisecond)
		numInDB := 0
		numActive := 0
		numCountsAtZero := 0
		for k, v := range testPagingJobs {
			if getVal(oncePrefix+k) != nil {
				numInDB++
			}
			s.activeJobs.mu.RLock()
			if s.activeJobs.jobs[k] != nil {
				numActive++
			}
			s.activeJobs.mu.RUnlock()
			if atomic.LoadInt32(v) == int32(0) {
				numCountsAtZero++
			}
		}
		assert.Equal(t, 0, numInDB)
		assert.Equal(t, 0, numActive)
		assert.Equal(t, 0, numCountsAtZero)
	})
	t.Run("failed at the db", func(t *testing.T) {
		resetScheduler()
		jobKey1 := makeKey()
		count1 := new(int32)
		callback := func(key string, _ any) {
			if key == jobKey1 {
				atomic.AddInt32(count1, 1)
			}
		}
		err := s.SetCallback(callback)
		require.NoError(t, err)
		err = s.Start()
		require.NoError(t, err)
		jobs, err := s.ListScheduledJobs()
		require.NoError(t, err)
		require.Empty(t, jobs)
		job, err := s.ScheduleOnce(jobKey1, time.Now().Add(100*time.Millisecond), nil)
		require.NoError(t, err)
		require.NotNil(t, job)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey1))
		assert.NotEmpty(t, s.activeJobs.jobs[jobKey1])
		s.pluginAPI.(*mockPluginAPI).setFailingWithPrefix(oncePrefix)
		time.Sleep((maxNumFails + 1) * (waitAfterFail + scheduleOnceJitter))
		assert.Equal(t, int32(0), atomic.LoadInt32(count1))
		assert.Nil(t, getVal(oncePrefix+jobKey1))
		assert.Empty(t, s.activeJobs.jobs[jobKey1])
		assert.Empty(t, getVal(oncePrefix+jobKey1))
		assert.Equal(t, int32(0), atomic.LoadInt32(count1))
		s.pluginAPI.(*mockPluginAPI).setFailingWithPrefix("")
	})
	t.Run("simulate starting the plugin with 3 pending jobs in the db", func(t *testing.T) {
		resetScheduler()
		jobKeys := make(map[string]*int32)
		for range 3 {
			jobKeys[makeKey()] = new(int32)
		}
		callback := func(key string, _ any) {
			count, ok := jobKeys[key]
			if ok {
				atomic.AddInt32(count, 1)
			}
		}
		err := s.SetCallback(callback)
		require.NoError(t, err)
		err = s.Start()
		require.NoError(t, err)
		for k := range jobKeys {
			job, err3 := newJobOnce(s.pluginAPI, k, time.Now().Add(100*time.Millisecond), s.storedCallback, s.activeJobs, nil)
			require.NoError(t, err3)
			err3 = job.saveMetadata()
			require.NoError(t, err3)
			assert.NotEmpty(t, getVal(oncePrefix+k))
		}
		jobs, err := s.ListScheduledJobs()
		require.NoError(t, err)
		require.Len(t, jobs, 3)
		require.NoError(t, err)
		err = s.scheduleNewJobsFromDB()
		require.NoError(t, err)
		time.Sleep(120*time.Millisecond + scheduleOnceJitter)
		for k, v := range jobKeys {
			assert.Empty(t, getVal(oncePrefix+k))
			assert.Empty(t, s.activeJobs.jobs[k])
			assert.Equal(t, int32(1), *v)
		}
		jobs, err = s.ListScheduledJobs()
		require.NoError(t, err)
		require.Empty(t, jobs)
	})
	t.Run("starting a job and polling before it's finished results in only one job running", func(t *testing.T) {
		resetScheduler()
		jobKey := makeKey()
		count := new(int32)
		callback := func(key string, _ any) {
			if key == jobKey {
				atomic.AddInt32(count, 1)
			}
		}
		err := s.SetCallback(callback)
		require.NoError(t, err)
		err = s.Start()
		require.NoError(t, err)
		jobs, err := s.ListScheduledJobs()
		require.NoError(t, err)
		require.Empty(t, jobs)
		job, err := s.ScheduleOnce(jobKey, time.Now().Add(100*time.Millisecond), nil)
		require.NoError(t, err)
		require.NotNil(t, job)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey))
		s.activeJobs.mu.Lock()
		assert.NotEmpty(t, s.activeJobs.jobs[jobKey])
		assert.Len(t, s.activeJobs.jobs, 1)
		s.activeJobs.mu.Unlock()
		err = s.scheduleNewJobsFromDB()
		require.NoError(t, err)
		err = s.scheduleNewJobsFromDB()
		require.NoError(t, err)
		err = s.scheduleNewJobsFromDB()
		require.NoError(t, err)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey))
		s.activeJobs.mu.Lock()
		assert.NotEmpty(t, s.activeJobs.jobs[jobKey])
		assert.Len(t, s.activeJobs.jobs, 1)
		s.activeJobs.mu.Unlock()
		time.Sleep(120*time.Millisecond + scheduleOnceJitter)
		assert.Equal(t, int32(1), atomic.LoadInt32(count))
		assert.Empty(t, getVal(oncePrefix+jobKey))
		s.activeJobs.mu.Lock()
		assert.Empty(t, s.activeJobs.jobs)
		s.activeJobs.mu.Unlock()
	})
	t.Run("starting the same job again while it's still active will fail", func(t *testing.T) {
		resetScheduler()
		jobKey := makeKey()
		count := new(int32)
		callback := func(key string, _ any) {
			if key == jobKey {
				atomic.AddInt32(count, 1)
			}
		}
		err := s.SetCallback(callback)
		require.NoError(t, err)
		err = s.Start()
		require.NoError(t, err)
		jobs, err := s.ListScheduledJobs()
		require.NoError(t, err)
		require.Empty(t, jobs)
		job, err := s.ScheduleOnce(jobKey, time.Now().Add(100*time.Millisecond), nil)
		require.NoError(t, err)
		require.NotNil(t, job)
		assert.NotEmpty(t, getVal(oncePrefix+jobKey))
		assert.NotEmpty(t, s.activeJobs.jobs[jobKey])
		assert.Len(t, s.activeJobs.jobs, 1)
		job, err = s.ScheduleOnce(jobKey, time.Now().Add(10000*time.Millisecond), nil)
		require.Error(t, err)
		require.Nil(t, job)
		time.Sleep(120*time.Millisecond + scheduleOnceJitter)
		assert.Equal(t, int32(1), atomic.LoadInt32(count))
		assert.Empty(t, getVal(oncePrefix+jobKey))
		assert.Empty(t, s.activeJobs.jobs)
	})
	t.Run("simulate HA: canceling and setting a job with a different time--old one shouldn't fire", func(t *testing.T) {
		resetScheduler()
		key := makeKey()
		jobKeys := make(map[string]*int32)
		jobKeys[key] = new(int32)
		control := makeKey()
		jobKeys[control] = new(int32)
		callback := func(key string, _ any) {
			count, ok := jobKeys[key]
			if ok {
				atomic.AddInt32(count, 1)
			}
		}
		err := s.SetCallback(callback)
		require.NoError(t, err)
		err = s.Start()
		require.NoError(t, err)
		originalRunAt := time.Now().Add(100 * time.Millisecond)
		newRunAt := time.Now().Add(101 * time.Millisecond)
		job, err := newJobOnce(s.pluginAPI, key, originalRunAt, s.storedCallback, s.activeJobs, nil)
		require.NoError(t, err)
		err = job.saveMetadata()
		require.NoError(t, err)
		assert.NotEmpty(t, getVal(oncePrefix+key))
		job2, err := newJobOnce(s.pluginAPI, control, originalRunAt, s.storedCallback, s.activeJobs, nil)
		require.NoError(t, err)
		err = job2.saveMetadata()
		require.NoError(t, err)
		assert.NotEmpty(t, getVal(oncePrefix+control))
		jobs, err := s.ListScheduledJobs()
		require.NoError(t, err)
		require.Len(t, jobs, 2)
		require.True(t, originalRunAt.Equal(jobs[0].RunAt))
		require.True(t, originalRunAt.Equal(jobs[1].RunAt))
		require.NoError(t, err)
		err = s.scheduleNewJobsFromDB()
		require.NoError(t, err)
		err = setMetadata(key, JobOnceMetadata{
			Key:   key,
			RunAt: newRunAt,
		})
		require.NoError(t, err)
		err = setMetadata(control, JobOnceMetadata{
			Key:   control,
			RunAt: originalRunAt,
		})
		require.NoError(t, err)
		time.Sleep(120*time.Millisecond + scheduleOnceJitter)
		assert.Empty(t, getVal(oncePrefix+key))
		assert.Empty(t, s.activeJobs.jobs[key])
		assert.Equal(t, int32(0), *jobKeys[key])
		assert.Empty(t, getVal(oncePrefix+control))
		assert.Empty(t, s.activeJobs.jobs[control])
		assert.Equal(t, int32(1), *jobKeys[control])
		jobs, err = s.ListScheduledJobs()
		require.NoError(t, err)
		require.Empty(t, jobs)
	})
}
func TestScheduleOnceProps(t *testing.T) {
	t.Run("confirm props are returned", func(t *testing.T) {
		s := GetJobOnceScheduler(newMockPluginAPI(t))
		jobKey := model.NewId()
		jobProps := struct {
			Foo string
		}{
			Foo: "some foo",
		}
		var mut sync.Mutex
		var called bool
		callback := func(key string, props any) {
			require.Equal(t, jobKey, key)
			require.Equal(t, jobProps, props)
			mut.Lock()
			defer mut.Unlock()
			called = true
		}
		err := s.SetCallback(callback)
		require.NoError(t, err)
		if !s.started {
			err = s.Start()
			require.NoError(t, err)
		}
		_, err = s.ScheduleOnce(jobKey, time.Now().Add(100*time.Millisecond), jobProps)
		require.NoError(t, err)
		require.Eventually(t, func() bool { mut.Lock(); defer mut.Unlock(); return called }, time.Second, 50*time.Millisecond)
	})
	t.Run("props to large", func(t *testing.T) {
		s := GetJobOnceScheduler(newMockPluginAPI(t))
		props := make([]byte, propsLimit)
		for i := range propsLimit {
			props[i] = 'a'
		}
		_, err := s.ScheduleOnce(model.NewId(), time.Now().Add(100*time.Millisecond), props)
		require.Error(t, err)
	})
}