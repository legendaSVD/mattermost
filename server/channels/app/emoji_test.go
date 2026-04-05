package app
import (
	"testing"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestGetMultipleEmojiByName(t *testing.T) {
	mainHelper.Parallel(t)
	th := SetupWithStoreMock(t)
	th.App.UpdateConfig(func(cfg *model.Config) {
		*cfg.ServiceSettings.EnableCustomEmoji = true
	})
	emojis, appErr := th.App.GetMultipleEmojiByName(th.Context, []string{"+1"})
	require.Nil(t, appErr)
	assert.Empty(t, emojis)
}