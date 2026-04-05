package app
import (
	"net/http"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
func (a *App) RestorePostVersion(rctx request.CTX, userID, postID, restoreVersionID string) (*model.Post, bool, *model.AppError) {
	toRestorePostVersion, err := a.Srv().Store().Post().GetSingle(rctx, restoreVersionID, true)
	if err != nil {
		var statusCode int
		var notFoundErr *store.ErrNotFound
		switch {
		case errors.As(err, &notFoundErr):
			statusCode = http.StatusNotFound
		default:
			statusCode = http.StatusInternalServerError
		}
		return nil, false, model.NewAppError("RestorePostVersion", "app.post.restore_post_version.get_single.app_error", nil, err.Error(), statusCode)
	}
	if toRestorePostVersion.OriginalId != postID {
		return nil, false, model.NewAppError("RestorePostVersion", "app.post.restore_post_version.not_an_history_item.app_error", nil, "", http.StatusBadRequest)
	}
	if toRestorePostVersion.UserId != userID {
		return nil, false, model.NewAppError("RestorePostVersion", "app.post.restore_post_version.not_allowed.app_error", nil, "", http.StatusForbidden)
	}
	if toRestorePostVersion.DeleteAt == 0 {
		return nil, false, model.NewAppError("RestorePostVersion", "app.post.restore_post_version.not_valid_post_history_item.app_error", nil, "", http.StatusBadRequest)
	}
	postPatch := &model.PostPatch{
		Message: &toRestorePostVersion.Message,
		FileIds: &toRestorePostVersion.FileIds,
	}
	patchPostOptions := &model.UpdatePostOptions{
		IsRestorePost: true,
	}
	return a.PatchPost(rctx, postID, postPatch, patchPostOptions)
}