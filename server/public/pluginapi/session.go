package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type SessionService struct {
	api plugin.API
}
func (s *SessionService) Get(id string) (*model.Session, error) {
	session, appErr := s.api.GetSession(id)
	return session, normalizeAppErr(appErr)
}
func (s *SessionService) Create(session *model.Session) (*model.Session, error) {
	session, appErr := s.api.CreateSession(session)
	return session, normalizeAppErr(appErr)
}
func (s *SessionService) ExtendExpiry(sessionID string, newExpiry int64) error {
	return normalizeAppErr(s.api.ExtendSessionExpiry(sessionID, newExpiry))
}
func (s *SessionService) Revoke(sessionID string) error {
	return normalizeAppErr(s.api.RevokeSession(sessionID))
}