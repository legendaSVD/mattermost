package sqlstore
import (
	"testing"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest"
)
func TestLinkMetadataStore(t *testing.T) {
	StoreTest(t, storetest.TestLinkMetadataStore)
}