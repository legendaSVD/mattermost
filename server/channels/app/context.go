package app
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store/sqlstore"
)
func RequestContextWithMaster(rctx request.CTX) request.CTX {
	return sqlstore.RequestContextWithMaster(rctx)
}
func RequestContextWithCallerID(rctx request.CTX, callerID string) request.CTX {
	ctx := model.WithCallerID(rctx.Context(), callerID)
	return rctx.WithContext(ctx)
}
func CallerIDFromRequestContext(rctx request.CTX) (string, bool) {
	if rctx == nil {
		return "", false
	}
	return model.CallerIDFromContext(rctx.Context())
}
func pluginContext(rctx request.CTX) *plugin.Context {
	context := &plugin.Context{
		RequestId:      rctx.RequestId(),
		SessionId:      rctx.Session().Id,
		IPAddress:      rctx.IPAddress(),
		AcceptLanguage: rctx.AcceptLanguage(),
		UserAgent:      rctx.UserAgent(),
	}
	return context
}