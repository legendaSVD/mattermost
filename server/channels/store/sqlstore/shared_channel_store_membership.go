package sqlstore
import (
	"fmt"
	sq "github.com/mattermost/squirrel"
	"github.com/pkg/errors"
)
func (s SqlSharedChannelStore) UpdateRemoteMembershipCursor(id string, syncTime int64) error {
	query := s.getQueryBuilder().
		Update("SharedChannelRemotes")
	query = query.Set("LastMembersSyncAt", sq.Expr("GREATEST(LastMembersSyncAt, ?)", syncTime))
	query = query.Where(sq.Eq{"Id": id})
	result, err := s.GetMaster().ExecBuilder(query)
	if err != nil {
		return errors.Wrap(err, "failed to update membership cursor for SharedChannelRemote")
	}
	count, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to determine rows affected")
	}
	if count == 0 {
		return fmt.Errorf("id not found: %s", id)
	}
	return nil
}