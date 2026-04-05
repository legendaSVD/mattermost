package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestStatusStore(t *testing.T) {
	StoreTestWithSqlStore(t, storetest.TestStatusStore)
}