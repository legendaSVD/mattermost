package store
import (
	"context"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
type storeContextKey string
type contextValue string
const (
	useMaster contextValue = "useMaster"
)
func WithMaster(ctx context.Context) context.Context {
	return context.WithValue(ctx, storeContextKey(useMaster), true)
}
func RequestContextWithMaster(rctx request.CTX) request.CTX {
	ctx := WithMaster(rctx.Context())
	rctx = rctx.WithContext(ctx)
	return rctx
}
func HasMaster(ctx context.Context) bool {
	if v := ctx.Value(storeContextKey(useMaster)); v != nil {
		if res, ok := v.(bool); ok && res {
			return true
		}
	}
	return false
}