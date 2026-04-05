package oauther
import "time"
type Option func(*oAuther)
func OAuthURL(url string) Option {
	return func(o *oAuther) {
		o.oAuthURL = url
	}
}
func StorePrefix(prefix string) Option {
	return func(o *oAuther) {
		o.storePrefix = prefix
	}
}
func ConnectedString(text string) Option {
	return func(o *oAuther) {
		o.connectedString = text
	}
}
func OAuth2StateTimeToLive(ttl time.Duration) Option {
	return func(o *oAuther) {
		o.oAuth2StateTimeToLive = ttl
	}
}
func PayloadTimeToLive(ttl time.Duration) Option {
	return func(o *oAuther) {
		o.payloadTimeToLive = ttl
	}
}