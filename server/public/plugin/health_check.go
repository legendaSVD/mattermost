package plugin
import (
	"sync"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
const (
	HealthCheckInterval           = 30 * time.Second
	HealthCheckDeactivationWindow = 60 * time.Minute
	HealthCheckPingFailLimit      = 3
	HealthCheckNumRestartsLimit   = 3
)
type PluginHealthCheckJob struct {
	cancel            chan struct{}
	cancelled         chan struct{}
	cancelOnce        sync.Once
	env               *Environment
	failureTimestamps sync.Map
}
func (job *PluginHealthCheckJob) run() {
	mlog.Debug("Plugin health check job starting.")
	defer close(job.cancelled)
	ticker := time.NewTicker(HealthCheckInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			activePlugins := job.env.Active()
			for _, plugin := range activePlugins {
				job.CheckPlugin(plugin.Manifest.Id)
			}
		case <-job.cancel:
			return
		}
	}
}
func (job *PluginHealthCheckJob) CheckPlugin(id string) {
	err := job.env.PerformHealthCheck(id)
	if err == nil {
		return
	}
	mlog.Warn("Health check failed for plugin", mlog.String("id", id), mlog.Err(err))
	timestamps := job.getStoredTimestamps(id)
	timestamps = append(timestamps, time.Now())
	if shouldDeactivatePlugin(timestamps) {
		mlog.Debug("Deactivating plugin due to multiple crashes", mlog.String("id", id))
		job.env.Deactivate(id)
		job.failureTimestamps.Delete(id)
		job.env.setPluginState(id, model.PluginStateFailedToStayRunning)
	} else {
		mlog.Debug("Restarting plugin due to failed health check", mlog.String("id", id))
		if err := job.env.RestartPlugin(id); err != nil {
			mlog.Error("Failed to restart plugin", mlog.String("id", id), mlog.Err(err))
		}
		job.failureTimestamps.Store(id, removeStaleTimestamps(timestamps))
	}
}
func (job *PluginHealthCheckJob) getStoredTimestamps(id string) []time.Time {
	timestamps, ok := job.failureTimestamps.Load(id)
	if !ok {
		timestamps = []time.Time{}
	}
	return timestamps.([]time.Time)
}
func newPluginHealthCheckJob(env *Environment) *PluginHealthCheckJob {
	return &PluginHealthCheckJob{
		cancel:    make(chan struct{}),
		cancelled: make(chan struct{}),
		env:       env,
	}
}
func (job *PluginHealthCheckJob) Cancel() {
	job.cancelOnce.Do(func() {
		close(job.cancel)
	})
	<-job.cancelled
}
func shouldDeactivatePlugin(failedTimestamps []time.Time) bool {
	if len(failedTimestamps) < HealthCheckNumRestartsLimit {
		return false
	}
	index := len(failedTimestamps) - HealthCheckNumRestartsLimit
	return time.Since(failedTimestamps[index]) <= HealthCheckDeactivationWindow
}
func removeStaleTimestamps(timestamps []time.Time) []time.Time {
	if len(timestamps) > HealthCheckNumRestartsLimit {
		timestamps = timestamps[len(timestamps)-HealthCheckNumRestartsLimit:]
	}
	return timestamps
}