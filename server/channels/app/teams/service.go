package teams
import (
	"errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
type TeamService struct {
	store        store.TeamStore
	groupStore   store.GroupStore
	channelStore store.ChannelStore
	users        Users
	wh           WebHub
	config       func() *model.Config
	license      func() *model.License
}
type ServiceConfig struct {
	TeamStore    store.TeamStore
	GroupStore   store.GroupStore
	ChannelStore store.ChannelStore
	Users        Users
	WebHub       WebHub
	ConfigFn     func() *model.Config
	LicenseFn    func() *model.License
}
type Users interface {
	GetUser(userID string) (*model.User, error)
}
type WebHub interface {
	Publish(message *model.WebSocketEvent)
}
func New(c ServiceConfig) (*TeamService, error) {
	if err := c.validate(); err != nil {
		return nil, err
	}
	return &TeamService{
		store:        c.TeamStore,
		groupStore:   c.GroupStore,
		channelStore: c.ChannelStore,
		users:        c.Users,
		config:       c.ConfigFn,
		license:      c.LicenseFn,
		wh:           c.WebHub,
	}, nil
}
func (c *ServiceConfig) validate() error {
	if c.ConfigFn == nil || c.TeamStore == nil || c.LicenseFn == nil || c.Users == nil || c.ChannelStore == nil || c.GroupStore == nil || c.WebHub == nil {
		return errors.New("required parameters are not provided")
	}
	return nil
}