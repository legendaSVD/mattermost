package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestPostAcknowledgementsStore(t *testing.T) {
	StoreTestWithSqlStore(t, storetest.TestPostAcknowledgementsStore)
}