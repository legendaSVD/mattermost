package httpservice
import (
	"fmt"
	"net"
	"net/http"
	"slices"
	"strings"
	"time"
	"unicode"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type HTTPService interface {
	MakeClient(trustURLs bool) *http.Client
	MakeTransport(trustURLs bool) *MattermostTransport
}
type getConfig interface {
	Config() *model.Config
}
type HTTPServiceImpl struct {
	configService getConfig
	RequestTimeout time.Duration
}
func splitFields(c rune) bool {
	return unicode.IsSpace(c) || c == ','
}
func MakeHTTPService(configService getConfig) HTTPService {
	return &HTTPServiceImpl{
		configService,
		RequestTimeout,
	}
}
type pluginAPIConfigServiceAdapter struct {
	pluginAPIConfigService plugin.API
}
func (p *pluginAPIConfigServiceAdapter) Config() *model.Config {
	return p.pluginAPIConfigService.GetConfig()
}
func MakeHTTPServicePlugin(configService plugin.API) HTTPService {
	return MakeHTTPService(&pluginAPIConfigServiceAdapter{configService})
}
func (h *HTTPServiceImpl) MakeClient(trustURLs bool) *http.Client {
	return &http.Client{
		Transport: h.MakeTransport(trustURLs),
		Timeout:   h.RequestTimeout,
	}
}
func (h *HTTPServiceImpl) MakeTransport(trustURLs bool) *MattermostTransport {
	insecure := h.configService.Config().ServiceSettings.EnableInsecureOutgoingConnections != nil && *h.configService.Config().ServiceSettings.EnableInsecureOutgoingConnections
	if trustURLs {
		return NewTransport(insecure, nil, nil)
	}
	allowHost := func(host string) bool {
		if h.configService.Config().ServiceSettings.AllowedUntrustedInternalConnections == nil {
			return false
		}
		return slices.Contains(strings.FieldsFunc(*h.configService.Config().ServiceSettings.AllowedUntrustedInternalConnections, splitFields), host)
	}
	allowIP := func(ip net.IP) error {
		reservedIP := IsReservedIP(ip)
		ownIP, err := IsOwnIP(ip)
		if err != nil {
			return fmt.Errorf("unable to determine if IP is own IP: %w", err)
		}
		if !reservedIP && !ownIP {
			return nil
		}
		for _, allowed := range strings.FieldsFunc(model.SafeDereference(h.configService.Config().ServiceSettings.AllowedUntrustedInternalConnections), splitFields) {
			if _, ipRange, err := net.ParseCIDR(allowed); err == nil && ipRange.Contains(ip) {
				return nil
			}
		}
		if reservedIP {
			return fmt.Errorf("IP %s is in a reserved range and not in AllowedUntrustedInternalConnections", ip)
		}
		return fmt.Errorf("IP %s is a self-assigned IP and not in AllowedUntrustedInternalConnections", ip)
	}
	return NewTransport(insecure, allowHost, allowIP)
}