package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/searchtest"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestPostStore(t *testing.T) {
	StoreTestWithSqlStore(t, storetest.TestPostStore)
}
func TestSearchPostStore(t *testing.T) {
	StoreTestWithSearchTestEngine(t, searchtest.TestSearchPostStore)
}