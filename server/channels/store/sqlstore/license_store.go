package sqlstore
import (
	sq "github.com/mattermost/squirrel"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
type SqlLicenseStore struct {
	*SqlStore
}
func newSqlLicenseStore(sqlStore *SqlStore) store.LicenseStore {
	return &SqlLicenseStore{sqlStore}
}
func (ls SqlLicenseStore) Save(license *model.LicenseRecord) error {
	license.PreSave()
	if err := license.IsValid(); err != nil {
		return err
	}
	query := ls.getQueryBuilder().
		Insert("Licenses").
		Columns("Id", "CreateAt", "Bytes").
		Values(license.Id, license.CreateAt, license.Bytes)
	query = query.SuffixExpr(sq.Expr("ON CONFLICT (Id) DO NOTHING"))
	queryString, args, err := query.ToSql()
	if err != nil {
		return errors.Wrap(err, "license_tosql")
	}
	if _, err := ls.GetMaster().Exec(queryString, args...); err != nil {
		return errors.Wrapf(err, "failed to insert License with licenseId=%s", license.Id)
	}
	return nil
}
func (ls SqlLicenseStore) Get(rctx request.CTX, id string) (*model.LicenseRecord, error) {
	query := ls.getQueryBuilder().
		Select("Id, CreateAt, Bytes").
		From("Licenses").
		Where(sq.Eq{"Id": id})
	queryString, args, err := query.ToSql()
	if err != nil {
		return nil, errors.Wrap(err, "license_record_tosql")
	}
	license := &model.LicenseRecord{}
	if err := ls.DBXFromContext(rctx.Context()).Get(license, queryString, args...); err != nil {
		return nil, store.NewErrNotFound("License", id)
	}
	return license, nil
}
func (ls SqlLicenseStore) GetAll() ([]*model.LicenseRecord, error) {
	query := ls.getQueryBuilder().
		Select("Id, CreateAt, Bytes").
		From("Licenses")
	queryString, _, err := query.ToSql()
	if err != nil {
		return nil, errors.Wrap(err, "license_tosql")
	}
	licenses := []*model.LicenseRecord{}
	if err := ls.GetReplica().Select(&licenses, queryString); err != nil {
		return nil, errors.Wrap(err, "failed to fetch licenses")
	}
	return licenses, nil
}