package mlog
import "github.com/mattermost/logr/v2"
func MaxQueueSize(size int) Option {
	return logr.MaxQueueSize(size)
}
func OnLoggerError(f func(error)) Option {
	return logr.OnLoggerError(f)
}
func OnQueueFull(f func(rec *LogRec, maxQueueSize int) bool) Option {
	return logr.OnQueueFull(f)
}
func OnTargetQueueFull(f func(target Target, rec *LogRec, maxQueueSize int) bool) Option {
	return logr.OnTargetQueueFull(f)
}
func SetMetricsCollector(collector MetricsCollector, updateFreqMillis int64) Option {
	return logr.SetMetricsCollector(collector, updateFreqMillis)
}
func StackFilter(pkg ...string) Option {
	return logr.StackFilter(pkg...)
}
func MaxFieldLen(size int) Option {
	return logr.MaxFieldLen(size)
}