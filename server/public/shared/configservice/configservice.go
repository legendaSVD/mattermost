package configservice
import (
	"github.com/mattermost/mattermost/server/public/model"
)
type ConfigService interface {
	Config() *model.Config
	AddConfigListener(func(old, current *model.Config)) string
	RemoveConfigListener(string)
}