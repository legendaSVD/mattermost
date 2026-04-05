package mlog
import (
	"sync"
)
var (
	globalLogger    *Logger
	muxGlobalLogger sync.RWMutex
)
func InitGlobalLogger(logger *Logger) {
	muxGlobalLogger.Lock()
	defer muxGlobalLogger.Unlock()
	globalLogger = logger
}
func getGlobalLogger() *Logger {
	muxGlobalLogger.RLock()
	defer muxGlobalLogger.RUnlock()
	return globalLogger
}
func IsLevelEnabled(level Level) bool {
	logger := getGlobalLogger()
	if logger == nil {
		return defaultIsLevelEnabled(level)
	}
	return logger.IsLevelEnabled(level)
}
func Log(level Level, msg string, fields ...Field) {
	logger := getGlobalLogger()
	if logger == nil {
		defaultLog(level, msg, fields...)
		return
	}
	logger.Log(level, msg, fields...)
}
func LogM(levels []Level, msg string, fields ...Field) {
	logger := getGlobalLogger()
	if logger == nil {
		defaultCustomMultiLog(levels, msg, fields...)
		return
	}
	logger.LogM(levels, msg, fields...)
}
func Trace(msg string, fields ...Field) {
	logger := getGlobalLogger()
	if logger == nil {
		defaultLog(LvlTrace, msg, fields...)
		return
	}
	logger.Trace(msg, fields...)
}
func Debug(msg string, fields ...Field) {
	logger := getGlobalLogger()
	if logger == nil {
		defaultLog(LvlDebug, msg, fields...)
		return
	}
	logger.Debug(msg, fields...)
}
func Info(msg string, fields ...Field) {
	logger := getGlobalLogger()
	if logger == nil {
		defaultLog(LvlInfo, msg, fields...)
		return
	}
	logger.Info(msg, fields...)
}
func Warn(msg string, fields ...Field) {
	logger := getGlobalLogger()
	if logger == nil {
		defaultLog(LvlWarn, msg, fields...)
		return
	}
	logger.Warn(msg, fields...)
}
func Error(msg string, fields ...Field) {
	logger := getGlobalLogger()
	if logger == nil {
		defaultLog(LvlError, msg, fields...)
		return
	}
	logger.Error(msg, fields...)
}
func Critical(msg string, fields ...Field) {
	Fatal(msg, fields...)
}
func Fatal(msg string, fields ...Field) {
	logger := getGlobalLogger()
	if logger == nil {
		defaultLog(LvlFatal, msg, fields...)
		return
	}
	logger.Fatal(msg, fields...)
}