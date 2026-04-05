package sql
import (
	"context"
	dbsql "database/sql"
	"strings"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/pkg/errors"
)
const (
	DBPingTimeout    = 10 * time.Second
	DBConnRetrySleep = 2 * time.Second
	replicaLagPrefix = "replica-lag"
)
func SetupConnection(logger mlog.LoggerIFace, connType string, dataSource string, settings *model.SqlSettings, attempts int) (*dbsql.DB, error) {
	db, err := dbsql.Open(*settings.DriverName, dataSource)
	if err != nil {
		return nil, errors.Wrap(err, "failed to open SQL connection")
	}
	sanitized, _ := model.SanitizeDataSource(*settings.DriverName, dataSource)
	logger = logger.With(
		mlog.String("database", connType),
		mlog.String("dataSource", sanitized),
	)
	for attempt := 1; attempt <= attempts; attempt++ {
		if attempt > 1 {
			logger.Info("Pinging SQL", mlog.Int("attempt", attempt))
		}
		ctx, cancel := context.WithTimeout(context.Background(), DBPingTimeout)
		defer cancel()
		err = db.PingContext(ctx)
		if err != nil {
			if attempt == attempts {
				return nil, err
			}
			logger.Error("Failed to ping DB", mlog.Float("retrying in seconds", DBConnRetrySleep.Seconds()), mlog.Err(err))
			time.Sleep(DBConnRetrySleep)
			continue
		}
		break
	}
	if strings.HasPrefix(connType, replicaLagPrefix) {
		db.SetMaxOpenConns(1)
		db.SetMaxIdleConns(1)
	} else {
		db.SetMaxIdleConns(*settings.MaxIdleConns)
		db.SetMaxOpenConns(*settings.MaxOpenConns)
	}
	db.SetConnMaxLifetime(time.Duration(*settings.ConnMaxLifetimeMilliseconds) * time.Millisecond)
	db.SetConnMaxIdleTime(time.Duration(*settings.ConnMaxIdleTimeMilliseconds) * time.Millisecond)
	return db, nil
}