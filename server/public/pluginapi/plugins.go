package pluginapi
import (
	"io"
	"net/http"
	"net/url"
	"time"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type PluginService struct {
	api plugin.API
}
func (p *PluginService) List() ([]*model.Manifest, error) {
	manifests, appErr := p.api.GetPlugins()
	return manifests, normalizeAppErr(appErr)
}
func (p *PluginService) Install(file io.Reader, replace bool) (*model.Manifest, error) {
	manifest, appErr := p.api.InstallPlugin(file, replace)
	return manifest, normalizeAppErr(appErr)
}
func (p *PluginService) InstallPluginFromURL(downloadURL string, replace bool) (*model.Manifest, error) {
	err := ensureServerVersion(p.api, "5.18.0")
	if err != nil {
		return nil, err
	}
	parsedURL, err := url.Parse(downloadURL)
	if err != nil {
		return nil, errors.Wrap(err, "error while parsing url")
	}
	client := &http.Client{Timeout: time.Hour}
	response, err := client.Get(parsedURL.String())
	if err != nil {
		return nil, errors.Wrap(err, "unable to download the plugin")
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, errors.Errorf("received %d status code while downloading plugin from server", response.StatusCode)
	}
	manifest, err := p.Install(response.Body, replace)
	if err != nil {
		return nil, errors.Wrap(err, "unable to install plugin on server")
	}
	return manifest, nil
}
func (p *PluginService) Enable(id string) error {
	appErr := p.api.EnablePlugin(id)
	return normalizeAppErr(appErr)
}
func (p *PluginService) Disable(id string) error {
	appErr := p.api.DisablePlugin(id)
	return normalizeAppErr(appErr)
}
func (p *PluginService) Remove(id string) error {
	appErr := p.api.RemovePlugin(id)
	return normalizeAppErr(appErr)
}
func (p *PluginService) GetPluginStatus(id string) (*model.PluginStatus, error) {
	pluginStatus, appErr := p.api.GetPluginStatus(id)
	return pluginStatus, normalizeAppErr(appErr)
}
func (p *PluginService) HTTP(request *http.Request) *http.Response {
	return p.api.PluginHTTP(request)
}