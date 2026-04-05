package sqlstore
import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/einterfaces"
	"github.com/pkg/errors"
	sq "github.com/mattermost/squirrel"
)
const MaxPerPage = 1000
const DefaultPerPage = 10
type accessControlPolicyV0_1 struct {
	Imports []string                        `json:"imports"`
	Rules   []model.AccessControlPolicyRule `json:"rules"`
}
type storeAccessControlPolicy struct {
	ID       string
	Name     string
	Type     string
	Active   bool
	CreateAt int64
	Revision int
	Version  string
	Data     []byte
	Props    []byte
}
func (s *storeAccessControlPolicy) toModel() (*model.AccessControlPolicy, error) {
	policy := &model.AccessControlPolicy{
		ID:       s.ID,
		Name:     s.Name,
		Type:     s.Type,
		Active:   s.Active,
		CreateAt: s.CreateAt,
		Revision: s.Revision,
		Version:  s.Version,
	}
	var p accessControlPolicyV0_1
	if err := json.Unmarshal(s.Data, &p); err != nil {
		return nil, err
	}
	policy.Imports = p.Imports
	policy.Rules = p.Rules
	if err := json.Unmarshal(s.Props, &policy.Props); err != nil {
		return nil, err
	}
	return policy, nil
}
func fromModel(policy *model.AccessControlPolicy) (*storeAccessControlPolicy, error) {
	data, err := json.Marshal(&accessControlPolicyV0_1{
		Imports: policy.Imports,
		Rules:   policy.Rules,
	})
	if err != nil {
		return nil, err
	}
	props, err := json.Marshal(policy.Props)
	if err != nil {
		return nil, err
	}
	return &storeAccessControlPolicy{
		ID:       policy.ID,
		Name:     policy.Name,
		Type:     policy.Type,
		Active:   policy.Active,
		CreateAt: policy.CreateAt,
		Revision: policy.Revision,
		Version:  policy.Version,
		Data:     data,
		Props:    props,
	}, nil
}
func accessControlPolicySliceColumns(prefix ...string) []string {
	var p string
	if len(prefix) == 1 {
		p = prefix[0] + "."
	} else if len(prefix) > 1 {
		panic("cannot accept multiple prefixes")
	}
	return []string{
		p + "ID",
		p + "Name",
		p + "Type",
		p + "Active",
		p + "CreateAt",
		p + "Revision",
		p + "Version",
		p + "Data",
		p + "Props",
	}
}
func accessControlPolicyHistorySliceColumns(prefix ...string) []string {
	var p string
	if len(prefix) == 1 {
		p = prefix[0] + "."
	} else if len(prefix) > 1 {
		panic("cannot accept multiple prefixes")
	}
	return []string{
		p + "ID",
		p + "Name",
		p + "Type",
		p + "CreateAt",
		p + "Revision",
		p + "Version",
		p + "Data",
		p + "Props",
	}
}
type SqlAccessControlPolicyStore struct {
	*SqlStore
	metrics einterfaces.MetricsInterface
	selectQueryBuilder sq.SelectBuilder
}
func newSqlAccessControlPolicyStore(sqlStore *SqlStore, metrics einterfaces.MetricsInterface) store.AccessControlPolicyStore {
	s := &SqlAccessControlPolicyStore{
		SqlStore: sqlStore,
		metrics:  metrics,
	}
	s.selectQueryBuilder = s.getQueryBuilder().Select(accessControlPolicySliceColumns()...).From("AccessControlPolicies")
	return s
}
func preSaveAccessControlPolicy(policy *storeAccessControlPolicy, existingPolicy *model.AccessControlPolicy) {
	policy.CreateAt = model.GetMillis()
	if existingPolicy != nil {
		policy.Revision = existingPolicy.Revision + 1
	} else {
		policy.Revision = 1
	}
}
func (s *SqlAccessControlPolicyStore) Save(rctx request.CTX, policy *model.AccessControlPolicy) (*model.AccessControlPolicy, error) {
	if err := policy.IsValid(); err != nil {
		return nil, err
	}
	tx, err := s.GetMaster().Beginx()
	if err != nil {
		return nil, errors.Wrap(err, "failed to start transaction")
	}
	defer finalizeTransactionX(tx, &err)
	existingPolicy, err := s.getT(rctx, tx, policy.ID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, errors.Wrapf(err, "failed to fetch policy with id=%s", policy.ID)
	}
	storePolicy, err := fromModel(policy)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to parse policy with Id=%s", policy.ID)
	}
	data := storePolicy.Data
	props := storePolicy.Props
	if s.IsBinaryParamEnabled() {
		data = AppendBinaryFlag(data)
		props = AppendBinaryFlag(props)
	}
	if existingPolicy != nil {
		if existingPolicy.Type != policy.Type {
			return nil, errors.New("cannot change type of existing policy")
		}
		tmp, err2 := fromModel(existingPolicy)
		if err2 != nil {
			return nil, errors.Wrapf(err2, "failed to parse policy with id=%s", policy.ID)
		}
		if bytes.Equal(storePolicy.Data, tmp.Data) &&
			storePolicy.Version == tmp.Version {
			if storePolicy.Name != tmp.Name {
				nameUpdate := s.getQueryBuilder().
					Update("AccessControlPolicies").
					Set("Name", storePolicy.Name).
					Where(sq.Eq{"ID": policy.ID})
				if _, err = tx.ExecBuilder(nameUpdate); err != nil {
					if IsUniqueConstraintError(err, []string{"Name", "idx_accesscontrolpolicies_name_type"}) {
						return nil, store.NewErrConflict("AccessControlPolicy", err, "name="+policy.Name)
					}
					return nil, errors.Wrapf(err, "failed to update name for policy with id=%s", policy.ID)
				}
				existingPolicy.Name = storePolicy.Name
				if err = tx.Commit(); err != nil {
					return nil, errors.Wrap(err, "commit_transaction")
				}
			}
			return existingPolicy, nil
		}
		existingData := tmp.Data
		existingProps := tmp.Props
		if s.IsBinaryParamEnabled() {
			existingData = AppendBinaryFlag(existingData)
			existingProps = AppendBinaryFlag(existingProps)
		}
		query := s.getQueryBuilder().
			Insert("AccessControlPolicyHistory").
			Columns(accessControlPolicyHistorySliceColumns()...).
			Values(tmp.ID, tmp.Name, tmp.Type, tmp.CreateAt, tmp.Revision, tmp.Version, existingData, existingProps)
		_, err = tx.ExecBuilder(query)
		if err != nil {
			return nil, errors.Wrapf(err, "failed to save policy with id=%s to history", policy.ID)
		}
		err = s.deleteT(rctx, tx, existingPolicy.ID)
		if err != nil {
			return nil, errors.Wrapf(err, "failed to delete policy with id=%s", policy.ID)
		}
	} else {
		existingPolicy, err = s.getHistoryT(rctx, tx, policy.ID)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return nil, errors.Wrapf(err, "failed to fetch policy with id=%s", policy.ID)
		}
	}
	preSaveAccessControlPolicy(storePolicy, existingPolicy)
	query := s.getQueryBuilder().
		Insert("AccessControlPolicies").
		Columns(accessControlPolicySliceColumns()...).
		Values(storePolicy.ID, storePolicy.Name, storePolicy.Type, storePolicy.Active, storePolicy.CreateAt, storePolicy.Revision, storePolicy.Version, data, props)
	_, err = tx.ExecBuilder(query)
	if err != nil {
		if IsUniqueConstraintError(err, []string{"Name", "idx_accesscontrolpolicies_name_type"}) {
			return nil, store.NewErrConflict("AccessControlPolicy", err, "name="+policy.Name)
		}
		return nil, errors.Wrapf(err, "failed to save policy with id=%s", policy.ID)
	}
	cp, err := storePolicy.toModel()
	if err != nil {
		return nil, errors.Wrapf(err, "failed to parse policy with id=%s", policy.ID)
	}
	if err = tx.Commit(); err != nil {
		return nil, errors.Wrap(err, "commit_transaction")
	}
	return cp, nil
}
func (s *SqlAccessControlPolicyStore) Delete(rctx request.CTX, id string) error {
	tx, err := s.GetMaster().Beginx()
	if err != nil {
		return errors.Wrap(err, "failed to start transaction")
	}
	defer finalizeTransactionX(tx, &err)
	existingPolicy, err := s.getT(rctx, tx, id)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return errors.Wrapf(err, "failed to fetch policy with id=%s", id)
	}
	if existingPolicy != nil {
		tmp, err2 := fromModel(existingPolicy)
		if err2 != nil {
			return errors.Wrapf(err2, "failed to parse policy with id=%s", id)
		}
		data := tmp.Data
		props := tmp.Props
		if s.IsBinaryParamEnabled() {
			data = AppendBinaryFlag(data)
			props = AppendBinaryFlag(props)
		}
		query := s.getQueryBuilder().
			Insert("AccessControlPolicyHistory").
			Columns(accessControlPolicyHistorySliceColumns()...).
			Values(tmp.ID, tmp.Name, tmp.Type, tmp.CreateAt, tmp.Revision, tmp.Version, data, props)
		_, err = tx.ExecBuilder(query)
		if err != nil {
			return errors.Wrapf(err, "failed to save policy with id=%s to history", id)
		}
		err = s.deleteT(rctx, tx, existingPolicy.ID)
		if err != nil {
			return errors.Wrapf(err, "failed to delete policy with id=%s", id)
		}
	}
	if err = tx.Commit(); err != nil {
		return errors.Wrap(err, "commit_transaction")
	}
	return nil
}
func (s *SqlAccessControlPolicyStore) deleteT(_ request.CTX, tx *sqlxTxWrapper, id string) error {
	query := s.getQueryBuilder().Delete("AccessControlPolicies").Where(sq.Eq{"ID": id})
	_, err := tx.ExecBuilder(query)
	if err != nil {
		return errors.Wrapf(err, "failed to delete policy with id=%s", id)
	}
	return nil
}
func (s *SqlAccessControlPolicyStore) SetActiveStatus(rctx request.CTX, id string, active bool) (*model.AccessControlPolicy, error) {
	tx, err := s.GetMaster().Beginx()
	if err != nil {
		return nil, errors.Wrap(err, "failed to start transaction")
	}
	defer finalizeTransactionX(tx, &err)
	existingPolicy, err := s.getT(rctx, tx, id)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to fetch policy with id=%s", id)
	} else if errors.Is(err, sql.ErrNoRows) {
		return nil, store.NewErrNotFound("AccessControlPolicy", id)
	}
	existingPolicy.Active = active
	if appErr := existingPolicy.IsValid(); err != nil {
		return nil, appErr
	}
	query, args, err := s.getQueryBuilder().Update("AccessControlPolicies").Set("Active", active).Where(sq.Eq{"ID": id}).ToSql()
	if err != nil {
		return nil, errors.Wrapf(err, "failed to build query for policy with id=%s", id)
	}
	_, err = tx.Exec(query, args...)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to update policy with id=%s", id)
	}
	if existingPolicy.Type == model.AccessControlPolicyTypeParent {
		expr := sq.Expr("Data->'imports' @> ?::jsonb", fmt.Sprintf("%q", id))
		query, args, err = s.getQueryBuilder().Update("AccessControlPolicies").Set("Active", active).Where(expr).ToSql()
		if err != nil {
			return nil, errors.Wrapf(err, "failed to build query for policy with id=%s", id)
		}
		_, err = tx.Exec(query, args...)
		if err != nil {
			return nil, errors.Wrapf(err, "failed to update child policies with id=%s", id)
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, errors.Wrap(err, "commit_transaction")
	}
	return existingPolicy, nil
}
func (s *SqlAccessControlPolicyStore) SetActiveStatusMultiple(rctx request.CTX, list []model.AccessControlPolicyActiveUpdate) ([]*model.AccessControlPolicy, error) {
	tx, err := s.GetMaster().Beginx()
	if err != nil {
		return nil, errors.Wrap(err, "failed to start transaction")
	}
	defer finalizeTransactionX(tx, &err)
	activeTrue := []string{}
	activeFalse := []string{}
	ids := make([]any, 0, len(list))
	for _, entry := range list {
		ids = append(ids, entry.ID)
		if entry.Active {
			activeTrue = append(activeTrue, entry.ID)
			continue
		}
		activeFalse = append(activeFalse, entry.ID)
	}
	if len(activeTrue) > 0 {
		query, args, qbErr := s.getQueryBuilder().
			Update("AccessControlPolicies").
			Set("Active", true).
			Where(sq.Eq{"ID": activeTrue}).
			ToSql()
		if qbErr != nil {
			return nil, errors.Wrap(qbErr, "failed to build active=true update query")
		}
		_, err = tx.Exec(query, args...)
		if err != nil {
			return nil, errors.Wrap(err, "failed to update active=true policies")
		}
	}
	if len(activeFalse) > 0 {
		query, args, qbErr := s.getQueryBuilder().
			Update("AccessControlPolicies").
			Set("Active", false).
			Where(sq.Eq{"ID": activeFalse}).
			ToSql()
		if qbErr != nil {
			return nil, errors.Wrap(qbErr, "failed to build active=false update query")
		}
		_, err = tx.Exec(query, args...)
		if err != nil {
			return nil, errors.Wrap(err, "failed to update active=false policies")
		}
	}
	p := []storeAccessControlPolicy{}
	query := s.selectQueryBuilder.Where(sq.Eq{"ID": ids})
	err = tx.SelectBuilder(&p, query)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to find policies with ids=%v", ids)
	}
	policies := make([]*model.AccessControlPolicy, len(p))
	for i := range p {
		policies[i], err = p[i].toModel()
		if err != nil {
			return nil, errors.Wrapf(err, "failed to parse policy with id=%s", p[i].ID)
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, errors.Wrap(err, "commit_transaction")
	}
	return policies, nil
}
func (s *SqlAccessControlPolicyStore) Get(_ request.CTX, id string) (*model.AccessControlPolicy, error) {
	p := storeAccessControlPolicy{}
	query := s.selectQueryBuilder.Where(sq.Eq{"ID": id})
	err := s.GetMaster().GetBuilder(&p, query)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, store.NewErrNotFound("AccessControlPolicy", id)
		}
		return nil, errors.Wrapf(err, "failed to find policy with id=%s", id)
	}
	policy, err := p.toModel()
	if err != nil {
		return nil, errors.Wrapf(err, "failed to parse policy with id=%s", id)
	}
	return policy, nil
}
func (s *SqlAccessControlPolicyStore) getT(_ request.CTX, tx *sqlxTxWrapper, id string) (*model.AccessControlPolicy, error) {
	query := s.getQueryBuilder().
		Select(accessControlPolicySliceColumns()...).
		From("AccessControlPolicies").
		Where(
			sq.Eq{"ID": id},
		)
	sql, args, err := query.ToSql()
	if err != nil {
		return nil, errors.Wrapf(err, "failed to build query for policy with id=%s", id)
	}
	var storePolicy storeAccessControlPolicy
	err = tx.Get(&storePolicy, sql, args...)
	if err != nil {
		return nil, err
	}
	policy, err := storePolicy.toModel()
	if err != nil {
		return nil, errors.Wrapf(err, "failed to parse policy with id=%s", id)
	}
	return policy, nil
}
func (s *SqlAccessControlPolicyStore) getHistoryT(_ request.CTX, tx *sqlxTxWrapper, id string) (*model.AccessControlPolicy, error) {
	query := s.getQueryBuilder().
		Select(accessControlPolicyHistorySliceColumns()...).
		From("AccessControlPolicyHistory").
		Where(
			sq.Eq{"ID": id},
		).OrderBy("Revision DESC").
		Limit(1)
	sql, args, err := query.ToSql()
	if err != nil {
		return nil, errors.Wrapf(err, "failed to build query for policy with id=%s", id)
	}
	var storePolicy storeAccessControlPolicy
	err = tx.Get(&storePolicy, sql, args...)
	if err != nil {
		return nil, err
	}
	policy, err := storePolicy.toModel()
	if err != nil {
		return nil, errors.Wrapf(err, "failed to parse policy with id=%s", id)
	}
	return policy, nil
}
func (s *SqlAccessControlPolicyStore) GetAll(_ request.CTX, opts model.GetAccessControlPolicyOptions) ([]*model.AccessControlPolicy, model.AccessControlPolicyCursor, error) {
	p := []storeAccessControlPolicy{}
	query := s.selectQueryBuilder
	if opts.ParentID != "" {
		query = query.Where(sq.Expr("Data->'imports' @> ?", fmt.Sprintf("%q", opts.ParentID)))
	}
	if opts.Type != "" {
		query = query.Where(sq.Eq{"Type": opts.Type})
	}
	cursor := opts.Cursor
	if !cursor.IsEmpty() {
		query = query.Where(sq.Or{
			sq.Gt{"Id": cursor.ID},
		})
	}
	limit := uint64(opts.Limit)
	if limit < 1 {
		limit = DefaultPerPage
	} else if limit > MaxPerPage {
		limit = MaxPerPage
	}
	query = query.Limit(limit)
	err := s.GetReplica().SelectBuilder(&p, query)
	if err != nil {
		return nil, cursor, errors.Wrapf(err, "failed to find policies with opts={\"parentID\"=%q, \"resourceType\"=%q", opts.ParentID, opts.Type)
	}
	policies := make([]*model.AccessControlPolicy, len(p))
	for i := range p {
		policies[i], err = p[i].toModel()
		if err != nil {
			return nil, cursor, errors.Wrapf(err, "failed to parse policy with id=%s", p[i].ID)
		}
	}
	if len(policies) != 0 {
		cursor.ID = policies[len(policies)-1].ID
	}
	return policies, cursor, nil
}
func (s *SqlAccessControlPolicyStore) SearchPolicies(rctx request.CTX, opts model.AccessControlPolicySearch) ([]*model.AccessControlPolicy, int64, error) {
	type wrapper struct {
		storeAccessControlPolicy
		ChildIDs json.RawMessage
	}
	p := []wrapper{}
	var query sq.SelectBuilder
	if opts.IncludeChildren && opts.ParentID == "" {
		columns := accessControlPolicySliceColumns("p")
		childIDs := `COALESCE((SELECT JSON_AGG(c.ID)
     FROM AccessControlPolicies c
	 WHERE c.Type != 'parent'
     AND c.Data->'imports' @> JSONB_BUILD_ARRAY(p.ID)), '[]'::json) AS ChildIDs`
		columns = append(columns, childIDs)
		query = s.getQueryBuilder().Select(columns...).From("AccessControlPolicies p")
	} else {
		query = s.selectQueryBuilder
	}
	count := s.getQueryBuilder().Select("COUNT(*)").From("AccessControlPolicies")
	if opts.Term != "" {
		condition := sq.Like{"Name": fmt.Sprintf("%%%s%%", opts.Term)}
		query = query.Where(condition)
		count = count.Where(condition)
	}
	if opts.Type != "" {
		condition := sq.Eq{"Type": opts.Type}
		query = query.Where(condition)
		count = count.Where(condition)
	}
	if opts.ParentID != "" {
		condition := sq.Expr("Data->'imports' @> ?", fmt.Sprintf("%q", opts.ParentID))
		query = query.Where(condition)
		count = count.Where(condition)
	}
	if opts.Active {
		query = query.Where(sq.Eq{"Active": true})
		count = count.Where(sq.Eq{"Active": true})
	}
	if len(opts.IDs) > 0 {
		condition := sq.Eq{"Id": opts.IDs}
		query = query.Where(condition)
		count = count.Where(condition)
	}
	cursor := opts.Cursor
	if !cursor.IsEmpty() {
		query = query.Where(sq.Gt{"Id": cursor.ID})
	}
	limit := uint64(opts.Limit)
	if limit < 1 {
		limit = DefaultPerPage
	} else if limit > MaxPerPage {
		limit = MaxPerPage
	}
	query = query.Limit(limit)
	query = query.OrderBy("Id ASC")
	err := s.GetReplica().SelectBuilder(&p, query)
	if err != nil {
		return nil, 0, errors.Wrapf(err, "failed to find policies with opts={\"name\"=%q, \"resourceType\"=%q", opts.Term, opts.Type)
	}
	policies := make([]*model.AccessControlPolicy, len(p))
	for i := range p {
		m, err2 := p[i].toModel()
		if err2 != nil {
			return nil, 0, errors.Wrapf(err2, "failed to parse policy with id=%s", p[i].ID)
		}
		if opts.IncludeChildren && opts.ParentID == "" {
			if m.Props == nil {
				m.Props = make(map[string]any)
			}
			var childIDs []string
			if err = json.Unmarshal(p[i].ChildIDs, &childIDs); err != nil {
				return nil, 0, errors.Wrapf(err, "failed to unmarshal child IDs for policy with id=%s", p[i].ID)
			}
			m.Props["child_ids"] = childIDs
		}
		policies[i] = m
	}
	var total int64
	err = s.GetReplica().GetBuilder(&total, count)
	if err != nil {
		return nil, 0, errors.Wrapf(err, "failed to count policies with opts={\"name\"=%q, \"resourceType\"=%q", opts.Term, opts.Type)
	}
	if len(policies) != 0 {
		cursor.ID = policies[len(policies)-1].ID
	}
	return policies, total, nil
}
func (s *SqlAccessControlPolicyStore) GetPoliciesByFieldID(_ request.CTX, fieldID string) ([]*model.AccessControlPolicy, error) {
	if !model.IsValidId(fieldID) {
		return nil, store.NewErrInvalidInput("AccessControlPolicy", "fieldID", fieldID)
	}
	p := []storeAccessControlPolicy{}
	query := s.selectQueryBuilder.Where(sq.Expr("Data::text LIKE ?", fmt.Sprintf("%%id\\_%s%%", fieldID)))
	err := s.GetReplica().SelectBuilder(&p, query)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to find policies referencing field id=%s", fieldID)
	}
	policies := make([]*model.AccessControlPolicy, len(p))
	for i := range p {
		policies[i], err = p[i].toModel()
		if err != nil {
			return nil, errors.Wrapf(err, "failed to parse policy with id=%s", p[i].ID)
		}
	}
	return policies, nil
}