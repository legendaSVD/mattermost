package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestSessionStore(t *testing.T) {
	StoreTest(t, storetest.TestSessionStore)
}