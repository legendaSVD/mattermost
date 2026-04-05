package pluginapi
import (
	"fmt"
	"io"
	"github.com/sirupsen/logrus"
)
type LogrusHook struct {
	log LogService
}
func NewLogrusHook(log LogService) *LogrusHook {
	return &LogrusHook{
		log: log,
	}
}
func (lh *LogrusHook) Levels() []logrus.Level {
	return logrus.AllLevels
}
func (lh *LogrusHook) Fire(entry *logrus.Entry) error {
	fields := []any{}
	for key, value := range entry.Data {
		fields = append(fields, key, fmt.Sprintf("%+v", value))
	}
	if entry.Caller != nil {
		fields = append(fields, "plugin_caller", fmt.Sprintf("%s:%d", entry.Caller.File, entry.Caller.Line))
	}
	switch entry.Level {
	case logrus.PanicLevel, logrus.FatalLevel, logrus.ErrorLevel:
		lh.log.Error(entry.Message, fields...)
	case logrus.WarnLevel:
		lh.log.Warn(entry.Message, fields...)
	case logrus.InfoLevel:
		lh.log.Info(entry.Message, fields...)
	case logrus.DebugLevel, logrus.TraceLevel:
		lh.log.Debug(entry.Message, fields...)
	}
	return nil
}
func ConfigureLogrus(logger *logrus.Logger, client *Client) {
	hook := NewLogrusHook(client.Log)
	logger.Hooks.Add(hook)
	logger.SetOutput(io.Discard)
	logrus.SetReportCaller(true)
	logrus.SetLevel(logrus.TraceLevel)
}