package httpservice
import (
	"net/http"
)
type MattermostTransport struct {
	Transport http.RoundTripper
}
func (t *MattermostTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("User-Agent", defaultUserAgent)
	return t.Transport.RoundTrip(req)
}