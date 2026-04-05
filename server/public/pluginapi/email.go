package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/plugin"
)
type MailService struct {
	api plugin.API
}
func (m *MailService) Send(to, subject, htmlBody string) error {
	return normalizeAppErr(m.api.SendMail(to, subject, htmlBody))
}