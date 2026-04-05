package featureflag
import (
	"fmt"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
type splitLogger struct {
	wrappedLog *mlog.Logger
}
func (s *splitLogger) Error(msg ...any) {
	s.wrappedLog.Error(fmt.Sprint(msg...))
}
func (s *splitLogger) Warning(msg ...any) {
	s.wrappedLog.Warn(fmt.Sprint(msg...))
}
func (s *splitLogger) Info(msg ...any) {
}
func (s *splitLogger) Debug(msg ...any) {
}
func (s *splitLogger) Verbose(msg ...any) {
}