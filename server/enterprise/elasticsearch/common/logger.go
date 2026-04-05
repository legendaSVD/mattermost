package common
import (
	"fmt"
	"net/http"
	"time"
	"github.com/mattermost/logr/v2"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
func NewLogger(backend string, mlogger mlog.LoggerIFace, trace bool) *Logger {
	return &Logger{
		backend: backend,
		logger:  mlogger,
		trace:   trace,
	}
}
type Logger struct {
	backend string
	trace   bool
	logger  mlog.LoggerIFace
}
func (l *Logger) LogRoundTrip(req *http.Request, res *http.Response, err error, start time.Time, dur time.Duration) error {
	var level int
	switch {
	case err != nil:
		level = 2
	case res != nil && res.StatusCode > 0 && res.StatusCode < 500:
		level = 0
	case res != nil && res.StatusCode > 499:
		level = 2
	default:
		level = 2
	}
	fields := []mlog.Field{
		mlog.String("method", req.Method),
		mlog.Int("status_code", res.StatusCode),
		mlog.String("duration", dur.String()),
		mlog.String("url", req.URL.String()),
	}
	var logFn func(string, ...logr.Field)
	switch level {
	case 0:
		logFn = l.logger.Debug
	case 1:
		logFn = l.logger.Warn
	case 2:
		logFn = l.logger.Error
	}
	logFn(l.backend+" request", fields...)
	return nil
}
func (l *Logger) RequestBodyEnabled() bool { return l.trace }
func (l *Logger) ResponseBodyEnabled() bool { return false }
func NewBulkIndexerLogger(mlogger mlog.LoggerIFace, name string) BulkIndexerDebugLogger {
	return BulkIndexerDebugLogger{
		logger: mlogger,
		name:   name,
	}
}
type BulkIndexerDebugLogger struct {
	logger mlog.LoggerIFace
	name   string
}
func (bl BulkIndexerDebugLogger) Printf(str string, params ...any) {
	line := fmt.Sprintf(str, params...)
	bl.logger.Debug(line, mlog.String("workername", bl.name))
}