package oauther
import (
	"net/http"
	"time"
	"golang.org/x/oauth2"
	"github.com/mattermost/mattermost/server/public/pluginapi"
	"github.com/mattermost/mattermost/server/public/pluginapi/experimental/bot/logger"
	"github.com/mattermost/mattermost/server/public/pluginapi/experimental/common"
)
const (
	DefaultStorePrefix = "oauth_"
	DefaultOAuthURL = "/oauth2"
	DefaultConnectedString = "Successfully connected. Please close this window."
	DefaultOAuth2StateTimeToLive = 5 * time.Minute
	DefaultPayloadTimeToLive = 10 * time.Minute
)
const (
	connectURL  = "/connect"
	completeURL = "/complete"
)
type OAuther interface {
	GetToken(userID string) (*oauth2.Token, error)
	GetConnectURL() string
	Deauthorize(userID string) error
	ServeHTTP(w http.ResponseWriter, r *http.Request)
	AddPayload(userID string, payload []byte) error
}
type oAuther struct {
	pluginURL             string
	config                oauth2.Config
	onConnect             func(userID string, token oauth2.Token, payload []byte)
	store                 common.KVStore
	logger                logger.Logger
	storePrefix           string
	oAuthURL              string
	connectedString       string
	oAuth2StateTimeToLive time.Duration
	payloadTimeToLive     time.Duration
}
func New(
	pluginURL string,
	oAuthConfig oauth2.Config,
	onConnect func(userID string, token oauth2.Token, payload []byte),
	store common.KVStore,
	l logger.Logger,
	options ...Option,
) OAuther {
	o := &oAuther{
		pluginURL:             pluginURL,
		config:                oAuthConfig,
		onConnect:             onConnect,
		store:                 store,
		logger:                l,
		storePrefix:           DefaultStorePrefix,
		oAuthURL:              DefaultOAuthURL,
		connectedString:       DefaultConnectedString,
		oAuth2StateTimeToLive: DefaultOAuth2StateTimeToLive,
		payloadTimeToLive:     DefaultPayloadTimeToLive,
	}
	for _, option := range options {
		option(o)
	}
	o.config.RedirectURL = o.pluginURL + o.oAuthURL + "/complete"
	return o
}
func NewFromClient(
	client *pluginapi.Client,
	oAuthConfig oauth2.Config,
	onConnect func(userID string, token oauth2.Token, payload []byte),
	l logger.Logger,
	options ...Option,
) OAuther {
	return New(
		common.GetPluginURL(client),
		oAuthConfig,
		onConnect,
		&client.KV,
		l,
		options...,
	)
}
func (o *oAuther) GetConnectURL() string {
	return o.pluginURL + o.oAuthURL + "/connect"
}
func (o *oAuther) GetToken(userID string) (*oauth2.Token, error) {
	var token *oauth2.Token
	err := o.store.Get(o.getTokenKey(userID), &token)
	if err != nil {
		return nil, err
	}
	return token, nil
}
func (o *oAuther) getTokenKey(userID string) string {
	return o.storePrefix + "token_" + userID
}
func (o *oAuther) getStateKey(userID string) string {
	return o.storePrefix + "state_" + userID
}
func (o *oAuther) getPayloadKey(userID string) string {
	return o.storePrefix + "payload_" + userID
}
func (o *oAuther) Deauthorize(userID string) error {
	err := o.store.Delete(o.getTokenKey(userID))
	if err != nil {
		return err
	}
	return nil
}
func (o *oAuther) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case o.oAuthURL + connectURL:
		o.oauth2Connect(w, r)
	case o.oAuthURL + completeURL:
		o.oauth2Complete(w, r)
	default:
		http.NotFound(w, r)
	}
}
func (o *oAuther) AddPayload(userID string, payload []byte) error {
	_, err := o.store.Set(o.getPayloadKey(userID), payload, pluginapi.SetExpiry(o.payloadTimeToLive))
	if err != nil {
		return err
	}
	return nil
}