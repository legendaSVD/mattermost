package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestTemporaryPostStore(t *testing.T) {
	StoreTestWithSqlStore(t, storetest.TestTemporaryPostStore)
}