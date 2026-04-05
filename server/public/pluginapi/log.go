package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/plugin"
)
type LogService struct {
	api plugin.API
}
func (l *LogService) Error(message string, keyValuePairs ...any) {
	l.api.LogError(message, keyValuePairs...)
}
func (l *LogService) Warn(message string, keyValuePairs ...any) {
	l.api.LogWarn(message, keyValuePairs...)
}
func (l *LogService) Info(message string, keyValuePairs ...any) {
	l.api.LogInfo(message, keyValuePairs...)
}
func (l *LogService) Debug(message string, keyValuePairs ...any) {
	l.api.LogDebug(message, keyValuePairs...)
}