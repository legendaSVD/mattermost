package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestPostPriorityStore(t *testing.T) {
	StoreTestWithSqlStore(t, storetest.TestPostPriorityStore)
}