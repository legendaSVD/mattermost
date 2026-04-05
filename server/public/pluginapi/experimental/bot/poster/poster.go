package poster
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type Poster interface {
	DMer
	DMWithAttachments(mattermostUserID string, attachments ...*model.MessageAttachment) (string, error)
	Ephemeral(mattermostUserID, channelID, format string, args ...any)
	UpdatePostByID(postID, format string, args ...any) error
	DeletePost(postID string) error
	UpdatePost(post *model.Post) error
	UpdatePosterID(id string)
}
type DMer interface {
	DM(mattermostUserID, format string, args ...any) (string, error)
}