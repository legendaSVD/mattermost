package model
import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/url"
	"strconv"
	"github.com/pkg/errors"
)
type BaseMarketplacePlugin struct {
	HomepageURL     string             `json:"homepage_url"`
	IconData        string             `json:"icon_data"`
	DownloadURL     string             `json:"download_url"`
	ReleaseNotesURL string             `json:"release_notes_url"`
	Labels          []MarketplaceLabel `json:"labels,omitempty"`
	Hosting         string             `json:"hosting"`
	AuthorType      string             `json:"author_type"`
	ReleaseStage    string             `json:"release_stage"`
	Enterprise      bool               `json:"enterprise"`
	Signature       string             `json:"signature"`
	Manifest        *Manifest          `json:"manifest"`
}
type MarketplaceLabel struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	URL         string `json:"url"`
	Color       string `json:"color"`
}
type MarketplacePlugin struct {
	*BaseMarketplacePlugin
	InstalledVersion string `json:"installed_version"`
}
func BaseMarketplacePluginsFromReader(reader io.Reader) ([]*BaseMarketplacePlugin, error) {
	plugins := []*BaseMarketplacePlugin{}
	decoder := json.NewDecoder(reader)
	if err := decoder.Decode(&plugins); err != nil && err != io.EOF {
		return nil, err
	}
	return plugins, nil
}
func MarketplacePluginsFromReader(reader io.Reader) ([]*MarketplacePlugin, error) {
	plugins := []*MarketplacePlugin{}
	decoder := json.NewDecoder(reader)
	if err := decoder.Decode(&plugins); err != nil && err != io.EOF {
		return nil, err
	}
	return plugins, nil
}
func (plugin *BaseMarketplacePlugin) DecodeSignature() (io.ReadSeeker, error) {
	signatureBytes, err := base64.StdEncoding.DecodeString(plugin.Signature)
	if err != nil {
		return nil, errors.Wrap(err, "Unable to decode base64 signature.")
	}
	return bytes.NewReader(signatureBytes), nil
}
type MarketplacePluginFilter struct {
	Page                 int
	PerPage              int
	Filter               string
	ServerVersion        string
	BuildEnterpriseReady bool
	EnterprisePlugins    bool
	Cloud                bool
	LocalOnly            bool
	Platform             string
	PluginId             string
	ReturnAllVersions    bool
	RemoteOnly           bool
}
func (filter *MarketplacePluginFilter) ApplyToURL(u *url.URL) {
	u.RawQuery = filter.ToValues().Encode()
}
func (filter *MarketplacePluginFilter) ToValues() url.Values {
	q := url.Values{}
	q.Add("page", strconv.Itoa(filter.Page))
	if filter.PerPage > 0 {
		q.Add("per_page", strconv.Itoa(filter.PerPage))
	}
	q.Add("filter", filter.Filter)
	q.Add("server_version", filter.ServerVersion)
	q.Add("build_enterprise_ready", strconv.FormatBool(filter.BuildEnterpriseReady))
	q.Add("enterprise_plugins", strconv.FormatBool(filter.EnterprisePlugins))
	q.Add("cloud", strconv.FormatBool(filter.Cloud))
	q.Add("local_only", strconv.FormatBool(filter.LocalOnly))
	q.Add("remote_only", strconv.FormatBool(filter.RemoteOnly))
	q.Add("platform", filter.Platform)
	q.Add("plugin_id", filter.PluginId)
	q.Add("return_all_versions", strconv.FormatBool(filter.ReturnAllVersions))
	return q
}
type InstallMarketplacePluginRequest struct {
	Id      string `json:"id"`
	Version string `json:"version"`
}
func PluginRequestFromReader(reader io.Reader) (*InstallMarketplacePluginRequest, error) {
	var r *InstallMarketplacePluginRequest
	err := json.NewDecoder(reader).Decode(&r)
	if err != nil {
		return nil, err
	}
	return r, nil
}