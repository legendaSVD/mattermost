package settings
import (
	"github.com/mattermost/mattermost/server/public/model"
)
const (
	ContextIDKey = "setting_id"
	ContextButtonValueKey = "button_value"
	ContextOptionValueKey = "selected_option"
	DisabledString = "Disabled"
	TrueString = "true"
	FalseString = "false"
)
type Setting interface {
	Set(userID string, value any) error
	Get(userID string) (any, error)
	GetID() string
	GetDependency() string
	IsDisabled(foreignValue any) bool
	GetTitle() string
	GetDescription() string
	GetMessageAttachments(userID, settingHandler string, disabled bool) (*model.MessageAttachment, error)
}