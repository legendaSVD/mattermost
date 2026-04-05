package imageproxy
import (
	"errors"
	"io"
	"net/http"
	"net/url"
	"reflect"
	"strings"
	"sync"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/configservice"
	"github.com/mattermost/mattermost/server/public/shared/httpservice"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
var ErrNotEnabled = Error{errors.New("imageproxy.ImageProxy: image proxy not enabled")}
type ImageProxy struct {
	ConfigService    configservice.ConfigService
	configListenerID string
	HTTPService httpservice.HTTPService
	Logger *mlog.Logger
	siteURL *url.URL
	lock    sync.RWMutex
	backend ImageProxyBackend
}
type ImageProxyBackend interface {
	GetImage(w http.ResponseWriter, r *http.Request, imageURL string)
	GetImageDirect(imageURL string) (io.ReadCloser, string, error)
}
func MakeImageProxy(configService configservice.ConfigService, httpService httpservice.HTTPService, logger *mlog.Logger) *ImageProxy {
	proxy := &ImageProxy{
		ConfigService: configService,
		HTTPService:   httpService,
		Logger:        logger,
	}
	siteURL, _ := url.Parse(*configService.Config().ServiceSettings.SiteURL)
	proxy.siteURL = siteURL
	proxy.configListenerID = proxy.ConfigService.AddConfigListener(proxy.OnConfigChange)
	config := proxy.ConfigService.Config()
	proxy.backend = proxy.makeBackend(config.ImageProxySettings)
	return proxy
}
func (proxy *ImageProxy) makeBackend(proxySettings model.ImageProxySettings) ImageProxyBackend {
	if !*proxySettings.Enable {
		return nil
	}
	switch *proxySettings.ImageProxyType {
	case model.ImageProxyTypeLocal:
		return makeLocalBackend(proxy)
	case model.ImageProxyTypeAtmosCamo:
		return makeAtmosCamoBackend(proxy, proxySettings)
	default:
		return nil
	}
}
func (proxy *ImageProxy) Close() {
	proxy.lock.Lock()
	defer proxy.lock.Unlock()
	proxy.ConfigService.RemoveConfigListener(proxy.configListenerID)
}
func (proxy *ImageProxy) OnConfigChange(oldConfig, newConfig *model.Config) {
	if *oldConfig.ServiceSettings.SiteURL != *newConfig.ServiceSettings.SiteURL ||
		!reflect.DeepEqual(oldConfig.ImageProxySettings, newConfig.ImageProxySettings) {
		proxy.lock.Lock()
		defer proxy.lock.Unlock()
		siteURL, _ := url.Parse(*newConfig.ServiceSettings.SiteURL)
		proxy.siteURL = siteURL
		proxy.backend = proxy.makeBackend(newConfig.ImageProxySettings)
	}
}
func (proxy *ImageProxy) GetImage(w http.ResponseWriter, r *http.Request, imageURL string) {
	proxy.lock.RLock()
	defer proxy.lock.RUnlock()
	if proxy.backend == nil {
		w.WriteHeader(http.StatusNotImplemented)
		return
	}
	proxy.backend.GetImage(w, r, imageURL)
}
func (proxy *ImageProxy) GetImageDirect(imageURL string) (io.ReadCloser, string, error) {
	proxy.lock.RLock()
	defer proxy.lock.RUnlock()
	if proxy.backend == nil {
		return nil, "", ErrNotEnabled
	}
	return proxy.backend.GetImageDirect(imageURL)
}
func (proxy *ImageProxy) GetProxiedImageURL(imageURL string) string {
	if imageURL == "" || proxy.siteURL == nil || strings.HasPrefix(strings.ToLower(imageURL), "data:image/") {
		return imageURL
	}
	parsedURL, err := url.Parse(imageURL)
	if err != nil || parsedURL.Opaque != "" {
		return proxy.siteURL.String()
	}
	if parsedURL.Host == proxy.siteURL.Host {
		return parsedURL.String()
	}
	if parsedURL.Scheme == "" {
		parsedURL.Scheme = proxy.siteURL.Scheme
	}
	if parsedURL.Host == "" {
		parsedURL.Host = proxy.siteURL.Host
		return parsedURL.String()
	}
	return proxy.siteURL.String() + "/api/v4/image?url=" + url.QueryEscape(parsedURL.String())
}
func (proxy *ImageProxy) GetUnproxiedImageURL(proxiedURL string) string {
	return getUnproxiedImageURL(proxiedURL, *proxy.ConfigService.Config().ServiceSettings.SiteURL)
}
func getUnproxiedImageURL(proxiedURL, siteURL string) string {
	if !strings.HasPrefix(proxiedURL, siteURL+"/api/v4/image?url=") {
		return proxiedURL
	}
	parsed, err := url.Parse(proxiedURL)
	if err != nil {
		return proxiedURL
	}
	u := parsed.Query()["url"]
	if len(u) == 0 {
		return proxiedURL
	}
	return u[0]
}