package mlog
import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"maps"
	"os"
	"slices"
	"strings"
	"sync/atomic"
	"time"
	"github.com/pkg/errors"
	"github.com/mattermost/logr/v2"
	logrcfg "github.com/mattermost/logr/v2/config"
)
const (
	ShutdownTimeout                = time.Second * 15
	FlushTimeout                   = time.Second * 15
	DefaultMaxQueueSize            = 1000
	DefaultMetricsUpdateFreqMillis = 15000
)
type LoggerIFace interface {
	IsLevelEnabled(Level) bool
	Trace(string, ...Field)
	Debug(string, ...Field)
	Info(string, ...Field)
	Warn(string, ...Field)
	Error(string, ...Field)
	Critical(string, ...Field)
	Fatal(string, ...Field)
	Log(Level, string, ...Field)
	LogM([]Level, string, ...Field)
	With(fields ...Field) *Logger
	Flush() error
	Sugar(fields ...Field) Sugar
	StdLogger(level Level) *log.Logger
}
type Field = logr.Field
type Level = logr.Level
type Option = logr.Option
type Target = logr.Target
type TargetInfo = logr.TargetInfo
type LogRec = logr.LogRec
type LogCloner = logr.LogCloner
type MetricsCollector = logr.MetricsCollector
type TargetCfg = logrcfg.TargetCfg
type TargetFactory = logrcfg.TargetFactory
type FormatterFactory = logrcfg.FormatterFactory
type Factories = logrcfg.Factories
type Sugar = logr.Sugar
type LoggerConfiguration map[string]TargetCfg
func (lc LoggerConfiguration) Append(cfg LoggerConfiguration) {
	maps.Copy(lc, cfg)
}
func (lc LoggerConfiguration) IsValid(validLevels []Level) error {
	logger, err := logr.New()
	if err != nil {
		return errors.Wrap(err, "failed to create logger")
	}
	defer logger.Shutdown()
	err = logrcfg.ConfigureTargets(logger, lc, nil)
	if err != nil {
		return errors.Wrap(err, "logger configuration is invalid")
	}
	validLevelIDs := make([]logr.LevelID, 0, len(validLevels))
	for _, l := range validLevels {
		validLevelIDs = append(validLevelIDs, l.ID)
	}
	for _, c := range lc {
		for _, l := range c.Levels {
			if !slices.Contains(validLevelIDs, l.ID) {
				return errors.Errorf("invalid log level id %d", l.ID)
			}
		}
	}
	return nil
}
func (lc LoggerConfiguration) toTargetCfg() map[string]logrcfg.TargetCfg {
	tcfg := make(map[string]logrcfg.TargetCfg)
	maps.Copy(tcfg, lc)
	return tcfg
}
var Any = logr.Any
func Int[T ~int | ~int8 | ~int16 | ~int32 | ~int64](key string, val T) Field {
	return logr.Int[T](key, val)
}
func Uint[T ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr](key string, val T) Field {
	return logr.Uint[T](key, val)
}
func Float[T ~float32 | ~float64](key string, val T) Field {
	return logr.Float[T](key, val)
}
func String[T ~string | ~[]byte](key string, val T) Field {
	return logr.String[T](key, val)
}
var Stringer = func(key string, s fmt.Stringer) logr.Field {
	if s == nil {
		return Field{Key: key, Type: logr.StringType, String: ""}
	}
	return Field{Key: key, Type: logr.StringType, String: s.String()}
}
var Err = func(err error) logr.Field {
	return NamedErr("error", err)
}
var NamedErr = func(key string, err error) logr.Field {
	if err == nil {
		return Field{Key: key, Type: logr.StringType, String: ""}
	}
	return Field{Key: key, Type: logr.StringType, String: err.Error()}
}
func Bool[T ~bool](key string, val T) Field {
	return logr.Bool[T](key, val)
}
var Time = logr.Time
var Duration = logr.Duration
var Millis = logr.Millis
func Array[S ~[]E, E any](key string, val S) Field {
	return logr.Array[S](key, val)
}
func Map[M ~map[K]V, K comparable, V any](key string, val M) Field {
	return logr.Map[M](key, val)
}
type Logger struct {
	log        *logr.Logger
	lockConfig *int32
}
func NewLogger(options ...Option) (*Logger, error) {
	options = append(options, logr.StackFilter(logr.GetPackageName("NewLogger")))
	lgr, err := logr.New(options...)
	if err != nil {
		return nil, err
	}
	log := lgr.NewLogger()
	var lockConfig int32
	return &Logger{
		log:        &log,
		lockConfig: &lockConfig,
	}, nil
}
func (l *Logger) Configure(cfgFile string, cfgEscaped string, factories *Factories) error {
	if atomic.LoadInt32(l.lockConfig) != 0 {
		return ErrConfigurationLock
	}
	cfgMap := make(LoggerConfiguration)
	if cfgFile != "" {
		b, err := os.ReadFile(cfgFile)
		if err != nil {
			return fmt.Errorf("error reading logger config file %s: %w", cfgFile, err)
		}
		var mapCfgFile LoggerConfiguration
		if err := json.Unmarshal(b, &mapCfgFile); err != nil {
			return fmt.Errorf("error decoding logger config file %s: %w", cfgFile, err)
		}
		cfgMap.Append(mapCfgFile)
	}
	if cfgEscaped != "" {
		var mapCfgEscaped LoggerConfiguration
		if err := json.Unmarshal([]byte(cfgEscaped), &mapCfgEscaped); err != nil {
			return fmt.Errorf("error decoding logger config as escaped json: %w", err)
		}
		cfgMap.Append(mapCfgEscaped)
	}
	if len(cfgMap) == 0 {
		return nil
	}
	return logrcfg.ConfigureTargets(l.log.Logr(), cfgMap.toTargetCfg(), factories)
}
func (l *Logger) ConfigureTargets(cfg LoggerConfiguration, factories *Factories) error {
	if atomic.LoadInt32(l.lockConfig) != 0 {
		return ErrConfigurationLock
	}
	return logrcfg.ConfigureTargets(l.log.Logr(), cfg.toTargetCfg(), factories)
}
func (l *Logger) LockConfiguration() bool {
	old := atomic.SwapInt32(l.lockConfig, 1)
	return old != 0
}
func (l *Logger) UnlockConfiguration() bool {
	old := atomic.SwapInt32(l.lockConfig, 0)
	return old != 0
}
func (l *Logger) IsConfigurationLocked() bool {
	return atomic.LoadInt32(l.lockConfig) != 0
}
func (l *Logger) With(fields ...Field) *Logger {
	logWith := l.log.With(fields...)
	return &Logger{
		log:        &logWith,
		lockConfig: l.lockConfig,
	}
}
func (l *Logger) IsLevelEnabled(level Level) bool {
	return l.log.IsLevelEnabled(level)
}
func (l *Logger) Log(level Level, msg string, fields ...Field) {
	l.log.Log(level, msg, fields...)
}
func (l *Logger) LogM(levels []Level, msg string, fields ...Field) {
	l.log.LogM(levels, msg, fields...)
}
func (l *Logger) Trace(msg string, fields ...Field) {
	l.log.Trace(msg, fields...)
}
func (l *Logger) Debug(msg string, fields ...Field) {
	l.log.Debug(msg, fields...)
}
func (l *Logger) Info(msg string, fields ...Field) {
	l.log.Info(msg, fields...)
}
func (l *Logger) Warn(msg string, fields ...Field) {
	l.log.Warn(msg, fields...)
}
func (l *Logger) Error(msg string, fields ...Field) {
	l.log.Error(msg, fields...)
}
func (l *Logger) Critical(msg string, fields ...Field) {
	l.log.Log(LvlCritical, msg, fields...)
}
func (l *Logger) Fatal(msg string, fields ...Field) {
	l.log.Log(logr.Fatal, msg, fields...)
	_ = l.Shutdown()
	os.Exit(1)
}
func (l *Logger) HasTargets() bool {
	return l.log.Logr().HasTargets()
}
func (l *Logger) StdLogger(level Level) *log.Logger {
	return l.log.StdLogger(level)
}
func (l *Logger) StdLogWriter() io.Writer {
	return &logWriter{
		logger: l,
	}
}
func (l *Logger) RedirectStdLog(level Level, fields ...Field) func() {
	return l.log.Logr().RedirectStdLog(level, fields...)
}
func (l *Logger) RemoveTargets(ctx context.Context, f func(ti TargetInfo) bool) error {
	return l.log.Logr().RemoveTargets(ctx, f)
}
func (l *Logger) SetMetricsCollector(collector MetricsCollector, updateFrequencyMillis int64) {
	l.log.Logr().SetMetricsCollector(collector, updateFrequencyMillis)
}
func (l *Logger) Sugar(fields ...Field) Sugar {
	return l.log.Sugar(fields...)
}
func (l *Logger) Flush() error {
	ctx, cancel := context.WithTimeout(context.Background(), FlushTimeout)
	defer cancel()
	return l.log.Logr().FlushWithTimeout(ctx)
}
func (l *Logger) FlushWithTimeout(ctx context.Context) error {
	return l.log.Logr().FlushWithTimeout(ctx)
}
func (l *Logger) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), ShutdownTimeout)
	defer cancel()
	return l.log.Logr().ShutdownWithTimeout(ctx)
}
func (l *Logger) ShutdownWithTimeout(ctx context.Context) error {
	return l.log.Logr().ShutdownWithTimeout(ctx)
}
func GetPackageName(f string) string {
	for {
		lastPeriod := strings.LastIndex(f, ".")
		lastSlash := strings.LastIndex(f, "/")
		if lastPeriod > lastSlash {
			f = f[:lastPeriod]
		} else {
			break
		}
	}
	return f
}
func ShouldQuote(val string) bool {
	for _, c := range val {
		if !((c >= '0' && c <= '9') ||
			(c >= 'a' && c <= 'z') ||
			(c >= 'A' && c <= 'Z') ||
			c == '-' || c == '.' || c == '_' || c == '/' || c == '@' || c == '^' || c == '+') {
			return true
		}
	}
	return false
}
type logWriter struct {
	logger *Logger
}
func (lw *logWriter) Write(p []byte) (int, error) {
	lw.logger.Info(string(p))
	return len(p), nil
}
var ErrConfigurationLock = errors.New("configuration is locked")