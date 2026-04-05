package platform
import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path"
	"slices"
	"time"
	"github.com/hashicorp/go-multierror"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/public/utils"
	"github.com/mattermost/mattermost/server/v8/config"
)
func (ps *PlatformService) Log() mlog.LoggerIFace {
	return ps.logger
}
func (ps *PlatformService) ReconfigureLogger() error {
	return ps.initLogging()
}
func (ps *PlatformService) initLogging() error {
	if ps.logger == nil {
		var err error
		ps.logger, err = mlog.NewLogger(
			mlog.MaxFieldLen(*ps.Config().LogSettings.MaxFieldSize),
			mlog.StackFilter("log"),
		)
		if err != nil {
			return err
		}
	}
	if err := ps.ConfigureLogger("logging", ps.logger, &ps.Config().LogSettings, config.GetLogFileLocation); err != nil {
		if !errors.Is(err, mlog.ErrConfigurationLock) {
			mlog.InitGlobalLogger(nil)
			return err
		}
	}
	ps.logger.RedirectStdLog(mlog.LvlWarn)
	mlog.InitGlobalLogger(ps.logger)
	return nil
}
func (ps *PlatformService) Logger() *mlog.Logger {
	return ps.logger
}
func (ps *PlatformService) EnableLoggingMetrics() {
	if ps.metrics == nil || ps.metricsIFace == nil {
		return
	}
	ps.logger.SetMetricsCollector(ps.metricsIFace.GetLoggerMetricsCollector(), mlog.DefaultMetricsUpdateFreqMillis)
	if err := ps.initLogging(); err != nil {
		mlog.Error("Error re-configuring logging for metrics")
		return
	}
	mlog.Debug("Logging metrics enabled")
}
func (ps *PlatformService) RemoveUnlicensedLogTargets(license *model.License) {
	if license != nil && *license.Features.AdvancedLogging {
		return
	}
	timeoutCtx, cancelCtx := context.WithTimeout(context.Background(), time.Second*10)
	defer cancelCtx()
	if err := ps.logger.RemoveTargets(timeoutCtx, func(ti mlog.TargetInfo) bool {
		return ti.Type != "*targets.Writer" && ti.Type != "*targets.File"
	}); err != nil {
		mlog.Error("Failed to remove log targets", mlog.Err(err))
	}
}
func (ps *PlatformService) GetLogsSkipSend(rctx request.CTX, page, perPage int, logFilter *model.LogFilter) ([]string, *model.AppError) {
	var lines []string
	if *ps.Config().LogSettings.EnableFile {
		ps.Log().Flush()
		logFile := config.GetLogFileLocation(*ps.Config().LogSettings.FileLocation)
		if err := ps.validateLogFilePath(logFile); err != nil {
			rctx.Logger().Error("Blocked attempt to read log file outside allowed root",
				mlog.String("path", logFile),
				mlog.String("config_section", "LogSettings.FileLocation"),
				mlog.Err(err))
			return nil, model.NewAppError("getLogs", "api.admin.file_read_error", nil, "", http.StatusForbidden).Wrap(err)
		}
		file, err := os.Open(logFile)
		if err != nil {
			return nil, model.NewAppError("getLogs", "api.admin.file_read_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
		defer file.Close()
		var newLine = []byte{'\n'}
		var lineCount int
		const searchPos = -1
		b := make([]byte, 1)
		var endOffset int64
		var stat os.FileInfo
		if stat, err = os.Stat(logFile); err == nil {
			if _, err = file.ReadAt(b, stat.Size()-1); err == nil && b[0] == newLine[0] {
				endOffset = -1
			}
		}
		lineEndPos, err := file.Seek(endOffset, io.SeekEnd)
		if err != nil {
			return nil, model.NewAppError("getLogs", "api.admin.file_read_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
		for {
			pos, err := file.Seek(searchPos, io.SeekCurrent)
			if err != nil {
				return nil, model.NewAppError("getLogs", "api.admin.file_read_error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
			_, err = file.ReadAt(b, pos)
			if err != nil {
				return nil, model.NewAppError("getLogs", "api.admin.file_read_error", nil, "", http.StatusInternalServerError).Wrap(err)
			}
			if b[0] == newLine[0] || pos == 0 {
				lineCount++
				if lineCount > page*perPage {
					line := make([]byte, lineEndPos-pos)
					_, err := file.ReadAt(line, pos)
					if err != nil {
						return nil, model.NewAppError("getLogs", "api.admin.file_read_error", nil, "", http.StatusInternalServerError).Wrap(err)
					}
					filtered := false
					var entry *model.LogEntry
					err = json.Unmarshal(line, &entry)
					if err != nil {
						rctx.Logger().Debug("Failed to parse line, skipping")
					} else {
						filtered = isLogFilteredByLevel(logFilter, entry) || filtered
						filtered = isLogFilteredByDate(rctx, logFilter, entry) || filtered
					}
					if filtered {
						lineCount--
					} else {
						lines = append(lines, string(line))
					}
				}
				if pos == 0 {
					break
				}
				lineEndPos = pos
			}
			if len(lines) == perPage {
				break
			}
		}
		for i, j := 0, len(lines)-1; i < j; i, j = i+1, j-1 {
			lines[i], lines[j] = lines[j], lines[i]
		}
	} else {
		lines = append(lines, "")
	}
	return lines, nil
}
func (ps *PlatformService) GetLogFile(rctx request.CTX) (*model.FileData, error) {
	if !*ps.Config().LogSettings.EnableFile {
		return nil, errors.New("Unable to retrieve mattermost logs because LogSettings.EnableFile is set to false")
	}
	mattermostLog := config.GetLogFileLocation(*ps.Config().LogSettings.FileLocation)
	if err := ps.validateLogFilePath(mattermostLog); err != nil {
		rctx.Logger().Error("Blocked attempt to read log file outside allowed root",
			mlog.String("path", mattermostLog),
			mlog.String("config_section", "LogSettings.FileLocation"),
			mlog.Err(err))
		return nil, errors.Wrapf(err, "log file path %s is outside allowed logging directory", mattermostLog)
	}
	mattermostLogFileData, err := os.ReadFile(mattermostLog)
	if err != nil {
		return nil, errors.Wrapf(err, "failed read mattermost log file at path %s", mattermostLog)
	}
	return &model.FileData{
		Filename: config.LogFilename,
		Body:     mattermostLogFileData,
	}, nil
}
func (ps *PlatformService) validateLogFilePath(filePath string) error {
	loggingRoot := config.GetLogRootPath()
	return config.ValidateLogFilePath(filePath, loggingRoot)
}
func (ps *PlatformService) GetAdvancedLogs(rctx request.CTX) ([]*model.FileData, error) {
	var (
		rErr *multierror.Error
		ret  []*model.FileData
	)
	rctx.Logger().Debug("Advanced logs access requested")
	for name, loggingJSON := range map[string]json.RawMessage{
		"LogSettings.AdvancedLoggingJSON":               ps.Config().LogSettings.AdvancedLoggingJSON,
		"ExperimentalAuditSettings.AdvancedLoggingJSON": ps.Config().ExperimentalAuditSettings.AdvancedLoggingJSON,
	} {
		if utils.IsEmptyJSON(loggingJSON) {
			continue
		}
		cfg := make(mlog.LoggerConfiguration)
		err := json.Unmarshal(loggingJSON, &cfg)
		if err != nil {
			rErr = multierror.Append(rErr, errors.Wrapf(err, "error decoding advanced logging configuration %s", name))
			continue
		}
		for _, t := range cfg {
			if t.Type != "file" {
				continue
			}
			var fileOption struct {
				Filename string `json:"filename"`
			}
			if err := json.Unmarshal(t.Options, &fileOption); err != nil {
				rErr = multierror.Append(rErr, errors.Wrapf(err, "error decoding file target options in %s", name))
				continue
			}
			if err := ps.validateLogFilePath(fileOption.Filename); err != nil {
				rctx.Logger().Error("Blocked attempt to read log file outside allowed root",
					mlog.String("path", fileOption.Filename),
					mlog.String("config_section", name),
					mlog.String("user_id", rctx.Session().UserId),
					mlog.Err(err))
				rErr = multierror.Append(rErr, errors.Wrapf(err, "log file path %s in %s is outside allowed logging directory", fileOption.Filename, name))
				continue
			}
			data, err := os.ReadFile(fileOption.Filename)
			if err != nil {
				rErr = multierror.Append(rErr, errors.Wrapf(err, "failed to read advanced log file at path %s in %s", fileOption.Filename, name))
				continue
			}
			fileName := path.Base(fileOption.Filename)
			ret = append(ret, &model.FileData{
				Filename: fileName,
				Body:     data,
			})
		}
	}
	return ret, rErr.ErrorOrNil()
}
func isLogFilteredByLevel(logFilter *model.LogFilter, entry *model.LogEntry) bool {
	logLevels := logFilter.LogLevels
	if len(logLevels) == 0 {
		return false
	}
	return !slices.Contains(logLevels, entry.Level)
}
func isLogFilteredByDate(rctx request.CTX, logFilter *model.LogFilter, entry *model.LogEntry) bool {
	if logFilter.DateFrom == "" && logFilter.DateTo == "" {
		return false
	}
	dateFrom, err := time.Parse("2006-01-02 15:04:05.999 -07:00", logFilter.DateFrom)
	if err != nil {
		dateFrom = time.Time{}
	}
	dateTo, err := time.Parse("2006-01-02 15:04:05.999 -07:00", logFilter.DateTo)
	if err != nil {
		dateTo = time.Now()
	}
	timestamp, err := time.Parse("2006-01-02 15:04:05.999 -07:00", entry.Timestamp)
	if err != nil {
		rctx.Logger().Debug("Cannot parse timestamp, skipping")
		return false
	}
	if timestamp.Equal(dateFrom) || timestamp.Equal(dateTo) {
		return false
	}
	if timestamp.After(dateFrom) && timestamp.Before(dateTo) {
		return false
	}
	return true
}