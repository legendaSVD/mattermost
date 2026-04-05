package audit
import (
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
const DefMaxQueueSize = 1000
type Audit struct {
	logger *mlog.Logger
	OnQueueFull func(qname string, maxQueueSize int) bool
	OnError func(err error)
}
func (a *Audit) Init(maxQueueSize int) {
	a.logger, _ = mlog.NewLogger(
		mlog.MaxQueueSize(maxQueueSize),
		mlog.OnLoggerError(a.onLoggerError),
		mlog.OnQueueFull(a.onQueueFull),
		mlog.OnTargetQueueFull(a.onTargetQueueFull),
	)
}
func (a *Audit) LogRecord(level mlog.Level, rec model.AuditRecord) {
	flds := []mlog.Field{
		mlog.String(model.AuditKeyEventName, rec.EventName),
		mlog.String(model.AuditKeyStatus, rec.Status),
		mlog.Any(model.AuditKeyActor, rec.Actor),
		mlog.Any(model.AuditKeyEvent, rec.EventData),
		mlog.Any(model.AuditKeyMeta, rec.Meta),
		mlog.Any(model.AuditKeyError, rec.Error),
	}
	a.logger.Log(level, "", flds...)
}
func (a *Audit) Configure(cfg mlog.LoggerConfiguration) error {
	return a.logger.ConfigureTargets(cfg, nil)
}
func (a *Audit) Flush() error {
	err := a.logger.Flush()
	if err != nil {
		a.onLoggerError(err)
	}
	return err
}
func (a *Audit) Shutdown() error {
	err := a.logger.Shutdown()
	if err != nil {
		a.onLoggerError(err)
	}
	return err
}
func (a *Audit) onQueueFull(rec *mlog.LogRec, maxQueueSize int) bool {
	if a.OnQueueFull != nil {
		return a.OnQueueFull("main", maxQueueSize)
	}
	mlog.Error("Audit logging queue full, dropping record.", mlog.Int("queueSize", maxQueueSize))
	return true
}
func (a *Audit) onTargetQueueFull(target mlog.Target, rec *mlog.LogRec, maxQueueSize int) bool {
	if a.OnQueueFull != nil {
		return a.OnQueueFull(fmt.Sprintf("%v", target), maxQueueSize)
	}
	mlog.Error("Audit logging queue full for target, dropping record.", mlog.Any("target", target), mlog.Int("queueSize", maxQueueSize))
	return true
}
func (a *Audit) onLoggerError(err error) {
	if a.OnError != nil {
		a.OnError(err)
		return
	}
	mlog.Error("Auditing error", mlog.Err(err))
}