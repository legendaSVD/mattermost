package app
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/public/utils"
)
func (a *App) processPostFileChanges(rctx request.CTX, newPost, oldPost *model.Post, updatePostOptions *model.UpdatePostOptions) (model.StringArray, *model.AppError) {
	newFileIDs := model.RemoveDuplicateStrings(newPost.FileIds)
	oldFileIDs := model.RemoveDuplicateStrings(oldPost.FileIds)
	addedFileIDs, removedFileIDs, unchangedFileIDs := utils.FindExclusives(newFileIDs, oldFileIDs)
	if len(addedFileIDs) > 0 {
		if updatePostOptions != nil && updatePostOptions.IsRestorePost {
			err := a.Srv().Store().FileInfo().RestoreForPostByIds(rctx, newPost.Id, addedFileIDs)
			if err != nil {
				return nil, model.NewAppError("app.processPostFileChanges", "app.file_info.undelete_for_post_ids.app_error", map[string]any{"post_id": newPost.Id}, "", 0).Wrap(err)
			}
		} else {
			a.attachNewFilesToPost(rctx, newPost, addedFileIDs, unchangedFileIDs)
		}
	}
	if len(removedFileIDs) > 0 {
		if appErr := a.detachFilesFromPost(rctx, newPost.Id, removedFileIDs); appErr != nil {
			return nil, appErr
		}
	}
	filesChanged := len(addedFileIDs) > 0 || len(removedFileIDs) > 0
	if filesChanged {
		a.Srv().Store().FileInfo().InvalidateFileInfosForPostCache(newPost.Id, false)
	}
	return newPost.FileIds, nil
}
func (a *App) attachNewFilesToPost(rctx request.CTX, post *model.Post, addedFileIDs, unchangedFileIDs []string) {
	userId := rctx.Session().UserId
	attachedFileIDs := a.attachFileIDsToPost(rctx, post.Id, post.ChannelId, userId, addedFileIDs)
	if len(attachedFileIDs) != len(addedFileIDs) {
		post.FileIds = append(attachedFileIDs, unchangedFileIDs...)
	}
}
func (a *App) detachFilesFromPost(rctx request.CTX, postId string, removedFileIDs []string) *model.AppError {
	if err := a.Srv().Store().FileInfo().DeleteForPostByIds(rctx, postId, removedFileIDs); err != nil {
		return model.NewAppError("app.detachFilesFromPost", "app.file_info.delete_for_post_ids.app_error", map[string]any{"post_id": postId}, "", 0).Wrap(err)
	}
	return nil
}