package poster
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type PostAPI interface {
	DM(senderUserID, receiverUserID string, post *model.Post) error
	GetPost(postID string) (*model.Post, error)
	UpdatePost(post *model.Post) error
	DeletePost(postID string) error
	SendEphemeralPost(userID string, post *model.Post)
}