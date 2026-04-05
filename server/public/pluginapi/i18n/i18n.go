package i18n
import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"github.com/pkg/errors"
	"golang.org/x/text/language"
	"github.com/mattermost/mattermost/server/public/model"
)
type PluginAPI interface {
	GetBundlePath() (string, error)
	GetConfig() *model.Config
	GetUser(userID string) (*model.User, *model.AppError)
	LogWarn(msg string, keyValuePairs ...any)
}
type Message = i18n.Message
type LocalizeConfig = i18n.LocalizeConfig
type Localizer = i18n.Localizer
type Bundle struct {
	*i18n.Bundle
	api PluginAPI
}
func InitBundle(api PluginAPI, path string) (*Bundle, error) {
	bundle := &Bundle{
		Bundle: i18n.NewBundle(language.English),
		api:    api,
	}
	bundle.RegisterUnmarshalFunc("json", json.Unmarshal)
	bundlePath, err := api.GetBundlePath()
	if err != nil {
		return nil, errors.Wrap(err, "failed to get bundle path")
	}
	i18nDir := filepath.Join(bundlePath, path)
	files, err := os.ReadDir(i18nDir)
	if err != nil {
		return nil, errors.Wrap(err, "failed to open i18n directory")
	}
	for _, file := range files {
		if !strings.HasPrefix(file.Name(), "active.") {
			continue
		}
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}
		if file.Name() == "active.en.json" {
			continue
		}
		_, err = bundle.LoadMessageFile(filepath.Join(i18nDir, file.Name()))
		if err != nil {
			return nil, errors.Wrapf(err, "failed to load message file %s", file.Name())
		}
	}
	return bundle, nil
}
func (b *Bundle) GetUserLocalizer(userID string) *i18n.Localizer {
	user, err := b.api.GetUser(userID)
	if err != nil {
		b.api.LogWarn("Failed get user's locale", "error", err.Error())
		return b.GetServerLocalizer()
	}
	return i18n.NewLocalizer(b.Bundle, user.Locale)
}
func (b *Bundle) GetServerLocalizer() *i18n.Localizer {
	local := *b.api.GetConfig().LocalizationSettings.DefaultServerLocale
	return i18n.NewLocalizer(b.Bundle, local)
}
func (b *Bundle) LocalizeDefaultMessage(l *Localizer, m *Message) string {
	s, err := l.LocalizeMessage(m)
	if err != nil {
		b.api.LogWarn("Failed to localize message", "message ID", m.ID, "error", err.Error())
		return ""
	}
	return s
}
func (b *Bundle) LocalizeWithConfig(l *Localizer, lc *LocalizeConfig) string {
	s, err := l.Localize(lc)
	if err != nil {
		b.api.LogWarn("Failed to localize with config", "error", err.Error())
		return ""
	}
	return s
}