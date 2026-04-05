package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestBotStore(t *testing.T) {
	StoreTestWithSqlStore(t, storetest.TestBotStore)
}