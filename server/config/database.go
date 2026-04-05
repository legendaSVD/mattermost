package config
import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	_ "github.com/lib/pq"
	"github.com/mattermost/morph"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/morph/drivers"
	ps "github.com/mattermost/morph/drivers/postgres"
	mbindata "github.com/mattermost/morph/sources/embedded"
)
var assets embed.FS
const migrationsTableName = "db_config_migrations"
const migrationsTimeoutInSeconds = 100000
type DatabaseStore struct {
	originalDsn    string
	driverName     string
	dataSourceName string
	db             *sqlx.DB
}
func NewDatabaseStore(dsn string) (ds *DatabaseStore, err error) {
	driverName, dataSourceName, err := parseDSN(dsn)
	if err != nil {
		return nil, errors.Wrap(err, "invalid DSN")
	}
	db, err := sqlx.Open(driverName, dataSourceName)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to connect to %s database", driverName)
	}
	db.SetMaxIdleConns(0)
	db.SetMaxOpenConns(2)
	defer func() {
		if err != nil {
			db.Close()
		}
	}()
	ds = &DatabaseStore{
		driverName:     driverName,
		originalDsn:    dsn,
		dataSourceName: dataSourceName,
		db:             db,
	}
	if err = ds.initializeConfigurationsTable(); err != nil {
		err = errors.Wrap(err, "failed to initialize")
		return nil, err
	}
	return ds, nil
}
func (ds *DatabaseStore) initializeConfigurationsTable() error {
	assetsList, err := assets.ReadDir(filepath.Join("migrations", ds.driverName))
	if err != nil {
		return err
	}
	assetNamesForDriver := make([]string, len(assetsList))
	for i, entry := range assetsList {
		assetNamesForDriver[i] = entry.Name()
	}
	src, err := mbindata.WithInstance(&mbindata.AssetSource{
		Names: assetNamesForDriver,
		AssetFunc: func(name string) ([]byte, error) {
			return assets.ReadFile(filepath.Join("migrations", ds.driverName, name))
		},
	})
	if err != nil {
		return err
	}
	var driver drivers.Driver
	switch ds.driverName {
	case model.DatabaseDriverPostgres:
		driver, err = ps.WithInstance(ds.db.DB)
	default:
		err = fmt.Errorf("unsupported database type %s for migration", ds.driverName)
	}
	if err != nil {
		return err
	}
	opts := []morph.EngineOption{
		morph.WithLock("mm-config-lock-key"),
		morph.SetMigrationTableName(migrationsTableName),
		morph.SetStatementTimeoutInSeconds(migrationsTimeoutInSeconds),
	}
	engine, err := morph.New(context.Background(), driver, src, opts...)
	if err != nil {
		return err
	}
	defer engine.Close()
	return engine.ApplyAll()
}
func parseDSN(dsn string) (string, string, error) {
	s := strings.SplitN(dsn, "://", 2)
	if len(s) != 2 {
		return "", "", errors.New("failed to parse DSN as URL")
	}
	scheme := s[0]
	switch scheme {
	case "postgres", "postgresql":
	default:
		return "", "", errors.Errorf("unsupported scheme %s", scheme)
	}
	return scheme, dsn, nil
}
func (ds *DatabaseStore) Set(newCfg *model.Config) error {
	return ds.persist(newCfg)
}
func (ds *DatabaseStore) persist(cfg *model.Config) error {
	b, err := marshalConfig(cfg)
	if err != nil {
		return errors.Wrap(err, "failed to serialize")
	}
	value := string(b)
	sum := sha256.Sum256(b)
	var oldValue string
	row := ds.db.QueryRow("SELECT SHA FROM Configurations WHERE Active")
	if err = row.Scan(&oldValue); err != nil && err != sql.ErrNoRows {
		return errors.Wrap(err, "failed to query active configuration")
	}
	oldSum, err := hex.DecodeString(strings.TrimSpace(oldValue))
	if err != nil {
		return errors.Wrap(err, "could not encode value")
	}
	if bytes.Equal(oldSum, sum[0:]) {
		return nil
	}
	tx, err := ds.db.Beginx()
	if err != nil {
		return errors.Wrap(err, "failed to begin transaction")
	}
	defer func() {
		if err = tx.Rollback(); err != nil && err != sql.ErrTxDone {
			mlog.Error("Failed to rollback configuration transaction", mlog.Err(err))
		}
	}()
	if _, err := tx.Exec("UPDATE Configurations SET Active = NULL WHERE Active"); err != nil {
		return errors.Wrap(err, "failed to deactivate current configuration")
	}
	params := map[string]any{
		"id":        model.NewId(),
		"value":     value,
		"create_at": model.GetMillis(),
		"key":       "ConfigurationId",
		"sha":       hex.EncodeToString(sum[0:]),
	}
	if _, err := tx.NamedExec("INSERT INTO Configurations (Id, Value, CreateAt, Active, SHA) VALUES (:id, :value, :create_at, TRUE, :sha)", params); err != nil {
		return errors.Wrap(err, "failed to record new configuration")
	}
	if err := tx.Commit(); err != nil {
		return errors.Wrap(err, "failed to commit transaction")
	}
	return nil
}
func (ds *DatabaseStore) Load() ([]byte, error) {
	var configurationData []byte
	row := ds.db.QueryRow("SELECT Value FROM Configurations WHERE Active")
	if err := row.Scan(&configurationData); err != nil && err != sql.ErrNoRows {
		return nil, errors.Wrap(err, "failed to query active configuration")
	}
	if len(configurationData) == 0 {
		configWithDB := model.Config{}
		configWithDB.SqlSettings.DriverName = model.NewPointer(ds.driverName)
		configWithDB.SqlSettings.DataSource = model.NewPointer(ds.dataSourceName)
		return json.Marshal(configWithDB)
	}
	return configurationData, nil
}
func (ds *DatabaseStore) GetFile(name string) ([]byte, error) {
	query, args, err := sqlx.Named("SELECT Data FROM ConfigurationFiles WHERE Name = :name", map[string]any{
		"name": name,
	})
	if err != nil {
		return nil, err
	}
	var data []byte
	row := ds.db.QueryRowx(ds.db.Rebind(query), args...)
	if err = row.Scan(&data); err != nil {
		return nil, errors.Wrapf(err, "failed to scan data from row for %s", name)
	}
	return data, nil
}
func (ds *DatabaseStore) SetFile(name string, data []byte) error {
	params := map[string]any{
		"name":      name,
		"data":      data,
		"create_at": model.GetMillis(),
		"update_at": model.GetMillis(),
	}
	result, err := ds.db.NamedExec("UPDATE ConfigurationFiles SET Data = :data, UpdateAt = :update_at WHERE Name = :name", params)
	if err != nil {
		return errors.Wrapf(err, "failed to update row for %s", name)
	}
	count, err := result.RowsAffected()
	if err != nil {
		return errors.Wrapf(err, "failed to count rows affected for %s", name)
	} else if count > 0 {
		return nil
	}
	_, err = ds.db.NamedExec("INSERT INTO ConfigurationFiles (Name, Data, CreateAt, UpdateAt) VALUES (:name, :data, :create_at, :update_at)", params)
	if err != nil {
		return errors.Wrapf(err, "failed to insert row for %s", name)
	}
	return nil
}
func (ds *DatabaseStore) HasFile(name string) (bool, error) {
	query, args, err := sqlx.Named("SELECT COUNT(*) FROM ConfigurationFiles WHERE Name = :name", map[string]any{
		"name": name,
	})
	if err != nil {
		return false, err
	}
	var count int64
	row := ds.db.QueryRowx(ds.db.Rebind(query), args...)
	if err = row.Scan(&count); err != nil {
		return false, errors.Wrapf(err, "failed to scan count of rows for %s", name)
	}
	return count != 0, nil
}
func (ds *DatabaseStore) RemoveFile(name string) error {
	_, err := ds.db.NamedExec("DELETE FROM ConfigurationFiles WHERE Name = :name", map[string]any{
		"name": name,
	})
	if err != nil {
		return errors.Wrapf(err, "failed to remove row for %s", name)
	}
	return nil
}
func (ds *DatabaseStore) String() string {
	sanitized, _ := model.SanitizeDataSource(ds.driverName, ds.originalDsn)
	return sanitized
}
func (ds *DatabaseStore) Close() error {
	return ds.db.Close()
}
func (ds *DatabaseStore) cleanUp(thresholdCreateAt int64) error {
	query := `
		DELETE FROM Configurations
		WHERE CreateAt < :timestamp
			AND (Active IS NULL OR Active = false)
			AND ID NOT IN (
				SELECT ID
				FROM Configurations
				ORDER BY CreateAt DESC
				LIMIT 5
			)
	`
	if _, err := ds.db.NamedExec(query, map[string]any{"timestamp": thresholdCreateAt}); err != nil {
		return errors.Wrap(err, "unable to clean Configurations table")
	}
	return nil
}