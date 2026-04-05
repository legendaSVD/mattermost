package poster
import (
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
)
type defaultPoster struct {
	postAPI PostAPI
	id      string
}
func NewPoster(postAPI PostAPI, id string) Poster {
	return &defaultPoster{
		postAPI: postAPI,
		id:      id,
	}
}
func (p *defaultPoster) DM(mattermostUserID, format string, args ...any) (string, error) {
	post := &model.Post{
		Message: fmt.Sprintf(format, args...),
	}
	err := p.postAPI.DM(p.id, mattermostUserID, post)
	if err != nil {
		return "", err
	}
	return post.Id, nil
}
func (p *defaultPoster) DMWithAttachments(mattermostUserID string, attachments ...*model.MessageAttachment) (string, error) {
	post := model.Post{}
	model.ParseMessageAttachment(&post, attachments)
	err := p.postAPI.DM(p.id, mattermostUserID, &post)
	if err != nil {
		return "", err
	}
	return post.Id, nil
}
func (p *defaultPoster) Ephemeral(userID, channelID, format string, args ...any) {
	post := &model.Post{
		UserId:    p.id,
		ChannelId: channelID,
		Message:   fmt.Sprintf(format, args...),
	}
	p.postAPI.SendEphemeralPost(userID, post)
}
func (p *defaultPoster) UpdatePostByID(postID, format string, args ...any) error {
	post, err := p.postAPI.GetPost(postID)
	if err != nil {
		return err
	}
	post.Message = fmt.Sprintf(format, args...)
	return p.UpdatePost(post)
}
func (p *defaultPoster) DeletePost(postID string) error {
	return p.postAPI.DeletePost(postID)
}
func (p *defaultPoster) UpdatePost(post *model.Post) error {
	return p.postAPI.UpdatePost(post)
}
func (p *defaultPoster) UpdatePosterID(id string) {
	p.id = id
}