package sqlstore
import (
	"context"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
func WithMaster(ctx context.Context) context.Context {
	return store.WithMaster(ctx)
}
func RequestContextWithMaster(rctx request.CTX) request.CTX {
	return store.RequestContextWithMaster(rctx)
}
func HasMaster(ctx context.Context) bool {
	return store.HasMaster(ctx)
}
func (ss *SqlStore) DBXFromContext(ctx context.Context) *sqlxDBWrapper {
	if HasMaster(ctx) {
		return ss.GetMaster()
	}
	return ss.GetReplica()
}