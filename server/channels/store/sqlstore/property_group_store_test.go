package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestPropertyGroupStore(t *testing.T) {
	StoreTestWithSqlStore(t, storetest.TestPropertyGroupStore)
}