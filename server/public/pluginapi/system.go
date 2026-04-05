package pluginapi
import (
	"net/url"
	"os"
	"path"
	filePath "path"
	"time"
	"github.com/Masterminds/semver/v3"
	"github.com/goccy/go-yaml"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type SystemService struct {
	api plugin.API
}
func (s *SystemService) GetManifest() (*model.Manifest, error) {
	p, err := s.api.GetBundlePath()
	if err != nil {
		return nil, err
	}
	m, _, err := model.FindManifest(p)
	if err != nil {
		return nil, errors.Wrap(err, "failed to find and open manifest")
	}
	return m, nil
}
func (s *SystemService) GetBundlePath() (string, error) {
	return s.api.GetBundlePath()
}
func (s *SystemService) GetPluginAssetURL(pluginID, asset string) (string, error) {
	if pluginID == "" {
		return "", errors.New("empty pluginID provided")
	}
	if asset == "" {
		return "", errors.New("empty asset name provided")
	}
	siteURL := *s.api.GetConfig().ServiceSettings.SiteURL
	if siteURL == "" {
		return "", errors.New("no SiteURL configured by the server")
	}
	u, err := url.Parse(siteURL + path.Join("/", pluginID, asset))
	if err != nil {
		return "", err
	}
	return u.String(), nil
}
func (s *SystemService) GetLicense() *model.License {
	return s.api.GetLicense()
}
func (s *SystemService) GetServerVersion() string {
	return s.api.GetServerVersion()
}
func (s *SystemService) IsEnterpriseReady() bool {
	return s.api.IsEnterpriseReady()
}
func (s *SystemService) GetSystemInstallDate() (time.Time, error) {
	installDateMS, appErr := s.api.GetSystemInstallDate()
	installDate := time.Unix(0, installDateMS*int64(time.Millisecond))
	return installDate, normalizeAppErr(appErr)
}
func (s *SystemService) GetDiagnosticID() string {
	return s.api.GetDiagnosticId()
}
func (s *SystemService) GetTelemetryID() string {
	return s.api.GetTelemetryId()
}
func (s *SystemService) RequestTrialLicense(requesterID string, users int, termsAccepted, receiveEmailsAccepted bool) error {
	currentVersion := semver.MustParse(s.api.GetServerVersion())
	requiredVersion := semver.MustParse("5.36.0")
	if currentVersion.LessThan(requiredVersion) {
		return errors.Errorf("current server version is lower than 5.36")
	}
	err := s.api.RequestTrialLicense(requesterID, users, termsAccepted, receiveEmailsAccepted)
	return normalizeAppErr(err)
}
func (s *SystemService) GeneratePacketMetadata(path string, pluginMeta map[string]any) (string, error) {
	manifest, err := s.GetManifest()
	if err != nil {
		return "", errors.Wrap(err, "failed to get manifest")
	}
	license := s.GetLicense()
	serverID := s.GetTelemetryID()
	if pluginMeta == nil {
		pluginMeta = make(map[string]any)
	}
	pluginMeta["plugin_id"] = manifest.Id
	pluginMeta["plugin_version"] = manifest.Version
	md, err := model.GeneratePacketMetadata(model.PluginPacketType, serverID, license, pluginMeta)
	if err != nil {
		return "", errors.Wrap(err, "failed to get packet metadata")
	}
	filePath := filePath.Join(path, model.PacketMetadataFileName)
	f, err := os.Create(filePath)
	if err != nil {
		return "", errors.Wrap(err, "failed to create packet metadata file")
	}
	defer f.Close()
	err = yaml.NewEncoder(f).Encode(md)
	if err != nil {
		return "", errors.Wrap(err, "failed to create packet metadata file")
	}
	return filePath, nil
}