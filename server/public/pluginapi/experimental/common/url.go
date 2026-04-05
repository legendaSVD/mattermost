package common
import (
	"net/url"
	"strings"
	"github.com/mattermost/mattermost/server/public/pluginapi"
)
func GetPluginURL(client *pluginapi.Client) string {
	mattermostSiteURL := client.Configuration.GetConfig().ServiceSettings.SiteURL
	if mattermostSiteURL == nil {
		return ""
	}
	_, err := url.Parse(*mattermostSiteURL)
	if err != nil {
		return ""
	}
	manifest, err := client.System.GetManifest()
	if err != nil {
		return ""
	}
	pluginURLPath := "/plugins/" + manifest.Id
	return strings.TrimRight(*mattermostSiteURL, "/") + pluginURLPath
}