package pluginapi
import (
	"bytes"
	"io"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type EmojiService struct {
	api plugin.API
}
func (e *EmojiService) Get(id string) (*model.Emoji, error) {
	emoji, appErr := e.api.GetEmoji(id)
	return emoji, normalizeAppErr(appErr)
}
func (e *EmojiService) GetByName(name string) (*model.Emoji, error) {
	emoji, appErr := e.api.GetEmojiByName(name)
	return emoji, normalizeAppErr(appErr)
}
func (e *EmojiService) GetImage(id string) (io.Reader, string, error) {
	contentBytes, format, appErr := e.api.GetEmojiImage(id)
	if appErr != nil {
		return nil, "", normalizeAppErr(appErr)
	}
	return bytes.NewReader(contentBytes), format, nil
}
func (e *EmojiService) List(sortBy string, page, count int) ([]*model.Emoji, error) {
	emojis, appErr := e.api.GetEmojiList(sortBy, page, count)
	return emojis, normalizeAppErr(appErr)
}