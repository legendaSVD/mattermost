package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestRetentionPolicyStore(t *testing.T) {
	StoreTestWithSqlStore(t, storetest.TestRetentionPolicyStore)
}