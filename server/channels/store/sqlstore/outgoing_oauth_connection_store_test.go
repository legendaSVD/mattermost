package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestOutgoingOAuthConnectionStore(t *testing.T) {
	StoreTest(t, storetest.TestOutgoingOAuthConnectionStore)
}