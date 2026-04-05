package metrics
import (
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/prometheus/client_golang/prometheus"
)
type DynamicCounter struct {
	counter *prometheus.CounterVec
}
func NewDynamicCounter(opts prometheus.CounterOpts, labels ...string) *DynamicCounter {
	return &DynamicCounter{
		counter: prometheus.NewCounterVec(opts, labels),
	}
}
func (dc *DynamicCounter) GetCounter(values ...string) (prometheus.Counter, error) {
	return dc.counter.GetMetricWithLabelValues(values...)
}
type DynamicGauge struct {
	gauge *prometheus.GaugeVec
}
func NewDynamicGauge(opts prometheus.GaugeOpts, labels ...string) *DynamicGauge {
	return &DynamicGauge{
		gauge: prometheus.NewGaugeVec(opts, labels),
	}
}
func (dg *DynamicGauge) GetGauge(values ...string) (prometheus.Gauge, error) {
	return dg.gauge.GetMetricWithLabelValues(values...)
}
type LoggerMetricsCollector struct {
	queueGauge      *DynamicGauge
	loggedCounters  *DynamicCounter
	errorCounters   *DynamicCounter
	droppedCounters *DynamicCounter
	blockedCounters *DynamicCounter
}
func (c *LoggerMetricsCollector) QueueSizeGauge(target string) (mlog.Gauge, error) {
	return c.queueGauge.GetGauge(target)
}
func (c *LoggerMetricsCollector) LoggedCounter(target string) (mlog.Counter, error) {
	return c.loggedCounters.GetCounter(target)
}
func (c *LoggerMetricsCollector) ErrorCounter(target string) (mlog.Counter, error) {
	return c.errorCounters.GetCounter(target)
}
func (c *LoggerMetricsCollector) DroppedCounter(target string) (mlog.Counter, error) {
	return c.droppedCounters.GetCounter(target)
}
func (c *LoggerMetricsCollector) BlockedCounter(target string) (mlog.Counter, error) {
	return c.blockedCounters.GetCounter(target)
}