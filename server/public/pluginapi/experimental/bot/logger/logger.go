package logger
import "time"
const (
	timed   = "__since"
	elapsed = "Elapsed"
	ErrorKey = "error"
)
type LogLevel string
const (
	LogLevelDebug = "debug"
	LogLevelInfo = "info"
	LogLevelWarn = "warn"
	LogLevelError = "error"
)
type LogContext map[string]any
type Logger interface {
	With(LogContext) Logger
	WithError(error) Logger
	Context() LogContext
	Timed() Logger
	Debugf(format string, args ...any)
	Errorf(format string, args ...any)
	Infof(format string, args ...any)
	Warnf(format string, args ...any)
}
func measure(lc LogContext) {
	if lc[timed] == nil {
		return
	}
	started := lc[timed].(time.Time)
	lc[elapsed] = time.Since(started).String()
	delete(lc, timed)
}
func Level(l LogLevel) int {
	switch l {
	case LogLevelDebug:
		return 4
	case LogLevelInfo:
		return 3
	case LogLevelWarn:
		return 2
	case LogLevelError:
		return 1
	}
	return 0
}
func toKeyValuePairs(in map[string]any) (out []any) {
	for k, v := range in {
		out = append(out, k, v)
	}
	return out
}