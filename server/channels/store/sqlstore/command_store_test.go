package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestCommandStore(t *testing.T) {
	StoreTest(t, storetest.TestCommandStore)
}