package imageproxy
import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/hex"
	"io"
	"net/http"
	"net/url"
	"github.com/mattermost/mattermost/server/public/model"
)
type AtmosCamoBackend struct {
	siteURL       *url.URL
	remoteOptions string
	remoteURL     *url.URL
	client        *http.Client
}
func makeAtmosCamoBackend(proxy *ImageProxy, proxySettings model.ImageProxySettings) *AtmosCamoBackend {
	remoteURL, _ := url.Parse(*proxySettings.RemoteImageProxyURL)
	return &AtmosCamoBackend{
		siteURL:       proxy.siteURL,
		remoteURL:     remoteURL,
		remoteOptions: *proxySettings.RemoteImageProxyOptions,
		client:        proxy.HTTPService.MakeClient(false),
	}
}
func (backend *AtmosCamoBackend) GetImage(w http.ResponseWriter, r *http.Request, imageURL string) {
	http.Redirect(w, r, backend.getAtmosCamoImageURL(imageURL), http.StatusFound)
}
func (backend *AtmosCamoBackend) GetImageDirect(imageURL string) (io.ReadCloser, string, error) {
	req, err := http.NewRequest("GET", backend.getAtmosCamoImageURL(imageURL), nil)
	if err != nil {
		return nil, "", Error{err}
	}
	resp, err := backend.client.Do(req)
	if err != nil {
		return nil, "", Error{err}
	}
	return resp.Body, resp.Header.Get("Content-Type"), nil
}
func (backend *AtmosCamoBackend) getAtmosCamoImageURL(imageURL string) string {
	if imageURL == "" || backend.siteURL == nil {
		return imageURL
	}
	parsedURL, err := url.Parse(imageURL)
	if err != nil || parsedURL.Opaque != "" {
		return backend.siteURL.String()
	}
	if parsedURL.Host == backend.siteURL.Host || parsedURL.Host == backend.remoteURL.Host {
		return parsedURL.String()
	}
	if parsedURL.Scheme == "" {
		parsedURL.Scheme = backend.siteURL.Scheme
	}
	if parsedURL.Host == "" {
		parsedURL.Host = backend.siteURL.Host
		return parsedURL.String()
	}
	urlBytes := []byte(parsedURL.String())
	mac := hmac.New(sha1.New, []byte(backend.remoteOptions))
	mac.Write(urlBytes)
	digest := hex.EncodeToString(mac.Sum(nil))
	return backend.remoteURL.String() + "/" + digest + "/" + hex.EncodeToString(urlBytes)
}