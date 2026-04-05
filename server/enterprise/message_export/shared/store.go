package shared
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
type MessageExportStore interface {
	Post() store.PostStore
	ChannelMemberHistory() store.ChannelMemberHistoryStore
	Channel() store.ChannelStore
	Compliance() store.ComplianceStore
	FileInfo() MEFileInfoStore
}
type MEFileInfoStore interface {
	GetForPost(postID string, readFromMaster, includeDeleted, allowFromCache bool) ([]*model.FileInfo, error)
}
type messageExportStore struct {
	store.Store
}
func NewMessageExportStore(s store.Store) messageExportStore {
	return messageExportStore{s}
}
func (ss messageExportStore) FileInfo() MEFileInfoStore {
	return ss.Store.FileInfo()
}