package model
import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"github.com/Masterminds/semver/v3"
	"github.com/goccy/go-yaml"
	"github.com/pkg/errors"
)
type PluginOption struct {
	DisplayName string `json:"display_name" yaml:"display_name"`
	Value string `json:"value" yaml:"value"`
}
type PluginSettingType int
const (
	Bool PluginSettingType = iota
	Dropdown
	Generated
	Radio
	Text
	LongText
	Number
	Username
	Custom
)
type PluginSetting struct {
	Key string `json:"key" yaml:"key"`
	DisplayName string `json:"display_name" yaml:"display_name"`
	Type string `json:"type" yaml:"type"`
	HelpText string `json:"help_text" yaml:"help_text"`
	RegenerateHelpText string `json:"regenerate_help_text,omitempty" yaml:"regenerate_help_text,omitempty"`
	Placeholder string `json:"placeholder" yaml:"placeholder"`
	Default any `json:"default" yaml:"default"`
	Options []*PluginOption `json:"options,omitempty" yaml:"options,omitempty"`
	Hosting string `json:"hosting"`
	Secret bool `json:"secret"`
}
type PluginSettingsSection struct {
	Key string `json:"key" yaml:"key"`
	Title string `json:"title" yaml:"title"`
	Subtitle string `json:"subtitle" yaml:"subtitle"`
	Settings []*PluginSetting `json:"settings" yaml:"settings"`
	Header string `json:"header" yaml:"header"`
	Footer string `json:"footer" yaml:"footer"`
	Custom bool `json:"custom" yaml:"custom"`
	Fallback bool `json:"fallback" yaml:"fallback"`
}
type PluginSettingsSchema struct {
	Header string `json:"header" yaml:"header"`
	Footer string `json:"footer" yaml:"footer"`
	Settings []*PluginSetting `json:"settings" yaml:"settings"`
	Sections []*PluginSettingsSection `json:"sections" yaml:"sections"`
}
type Manifest struct {
	Id string `json:"id" yaml:"id"`
	Name string `json:"name" yaml:"name"`
	Description string `json:"description,omitempty" yaml:"description,omitempty"`
	HomepageURL string `json:"homepage_url,omitempty" yaml:"homepage_url,omitempty"`
	SupportURL string `json:"support_url,omitempty" yaml:"support_url,omitempty"`
	ReleaseNotesURL string `json:"release_notes_url,omitempty" yaml:"release_notes_url,omitempty"`
	IconPath string `json:"icon_path,omitempty" yaml:"icon_path,omitempty"`
	Version string `json:"version" yaml:"version"`
	MinServerVersion string `json:"min_server_version,omitempty" yaml:"min_server_version,omitempty"`
	Server *ManifestServer `json:"server,omitempty" yaml:"server,omitempty"`
	Webapp *ManifestWebapp `json:"webapp,omitempty" yaml:"webapp,omitempty"`
	SettingsSchema *PluginSettingsSchema `json:"settings_schema,omitempty" yaml:"settings_schema,omitempty"`
	Props map[string]any `json:"props,omitempty" yaml:"props,omitempty"`
}
type ManifestServer struct {
	Executables map[string]string `json:"executables,omitempty" yaml:"executables,omitempty"`
	Executable string `json:"executable" yaml:"executable"`
}
type ManifestWebapp struct {
	BundlePath string `json:"bundle_path" yaml:"bundle_path"`
	BundleHash []byte `json:"-"`
}
func (m *Manifest) HasClient() bool {
	return m.Webapp != nil
}
func (m *Manifest) ClientManifest() *Manifest {
	cm := new(Manifest)
	*cm = *m
	cm.Name = m.Name
	cm.Description = ""
	cm.Server = nil
	if cm.Webapp != nil {
		cm.Webapp = new(ManifestWebapp)
		*cm.Webapp = *m.Webapp
		cm.Webapp.BundlePath = "/static/" + m.Id + "/" + fmt.Sprintf("%s_%x_bundle.js", m.Id, m.Webapp.BundleHash)
	}
	return cm
}
func (m *Manifest) GetExecutableForRuntime(goOs, goArch string) string {
	server := m.Server
	if server == nil {
		return ""
	}
	var executable string
	if len(server.Executables) > 0 {
		osArch := fmt.Sprintf("%s-%s", goOs, goArch)
		executable = server.Executables[osArch]
	}
	if executable == "" {
		executable = server.Executable
	}
	return executable
}
func (m *Manifest) HasServer() bool {
	return m.Server != nil
}
func (m *Manifest) HasWebapp() bool {
	return m.Webapp != nil
}
func (m *Manifest) MeetMinServerVersion(serverVersion string) (bool, error) {
	minServerVersion, err := semver.StrictNewVersion(m.MinServerVersion)
	if err != nil {
		return false, errors.New("failed to parse MinServerVersion")
	}
	sv := semver.MustParse(serverVersion)
	if sv.LessThan(minServerVersion) {
		return false, nil
	}
	return true, nil
}
func (m *Manifest) IsValid() error {
	if !IsValidPluginId(m.Id) {
		return errors.New("invalid plugin ID")
	}
	if strings.TrimSpace(m.Name) == "" {
		return errors.New("a plugin name is needed")
	}
	if m.HomepageURL != "" && !IsValidHTTPURL(m.HomepageURL) {
		return errors.New("invalid HomepageURL")
	}
	if m.SupportURL != "" && !IsValidHTTPURL(m.SupportURL) {
		return errors.New("invalid SupportURL")
	}
	if m.ReleaseNotesURL != "" && !IsValidHTTPURL(m.ReleaseNotesURL) {
		return errors.New("invalid ReleaseNotesURL")
	}
	if m.Version != "" {
		_, err := semver.StrictNewVersion(m.Version)
		if err != nil {
			return errors.Wrap(err, "failed to parse Version")
		}
	}
	if m.MinServerVersion != "" {
		_, err := semver.StrictNewVersion(m.MinServerVersion)
		if err != nil {
			return errors.Wrap(err, "failed to parse MinServerVersion")
		}
	}
	if m.SettingsSchema != nil {
		err := m.SettingsSchema.isValid()
		if err != nil {
			return errors.Wrap(err, "invalid settings schema")
		}
	}
	return nil
}
func (s *PluginSettingsSchema) isValid() error {
	for _, setting := range s.Settings {
		err := setting.isValid()
		if err != nil {
			return err
		}
	}
	for _, section := range s.Sections {
		if err := section.IsValid(); err != nil {
			return err
		}
	}
	return nil
}
func (s *PluginSettingsSection) IsValid() error {
	if s.Key == "" {
		return errors.New("invalid empty Key")
	}
	for _, setting := range s.Settings {
		err := setting.isValid()
		if err != nil {
			return err
		}
	}
	return nil
}
func (s *PluginSetting) isValid() error {
	pluginSettingType, err := convertTypeToPluginSettingType(s.Type)
	if err != nil {
		return err
	}
	if s.RegenerateHelpText != "" && pluginSettingType != Generated {
		return errors.New("should not set RegenerateHelpText for setting type that is not generated")
	}
	if s.Placeholder != "" && !(pluginSettingType == Generated ||
		pluginSettingType == Text ||
		pluginSettingType == LongText ||
		pluginSettingType == Number ||
		pluginSettingType == Username ||
		pluginSettingType == Custom) {
		return errors.New("should not set Placeholder for setting type not in text, generated, number, username, or custom")
	}
	if s.Options != nil {
		if pluginSettingType != Radio && pluginSettingType != Dropdown {
			return errors.New("should not set Options for setting type not in radio or dropdown")
		}
		for _, option := range s.Options {
			if option.DisplayName == "" || option.Value == "" {
				return errors.New("should not have empty Displayname or Value for any option")
			}
		}
	}
	return nil
}
func convertTypeToPluginSettingType(t string) (PluginSettingType, error) {
	var settingType PluginSettingType
	switch t {
	case "bool":
		return Bool, nil
	case "dropdown":
		return Dropdown, nil
	case "generated":
		return Generated, nil
	case "radio":
		return Radio, nil
	case "text":
		return Text, nil
	case "number":
		return Number, nil
	case "longtext":
		return LongText, nil
	case "username":
		return Username, nil
	case "custom":
		return Custom, nil
	default:
		return settingType, errors.New("invalid setting type: " + t)
	}
}
func FindManifest(dir string) (manifest *Manifest, path string, err error) {
	for _, name := range []string{"plugin.yml", "plugin.yaml"} {
		path = filepath.Join(dir, name)
		f, ferr := os.Open(path)
		if ferr != nil {
			if !os.IsNotExist(ferr) {
				return nil, "", ferr
			}
			continue
		}
		b, ioerr := io.ReadAll(f)
		f.Close()
		if ioerr != nil {
			return nil, path, ioerr
		}
		var parsed Manifest
		err = yaml.Unmarshal(b, &parsed)
		if err != nil {
			return nil, path, err
		}
		manifest = &parsed
		manifest.Id = strings.ToLower(manifest.Id)
		return manifest, path, nil
	}
	path = filepath.Join(dir, "plugin.json")
	f, ferr := os.Open(path)
	if ferr != nil {
		if os.IsNotExist(ferr) {
			path = ""
		}
		return nil, path, ferr
	}
	defer f.Close()
	var parsed Manifest
	err = json.NewDecoder(f).Decode(&parsed)
	if err != nil {
		return nil, path, err
	}
	manifest = &parsed
	manifest.Id = strings.ToLower(manifest.Id)
	return manifest, path, nil
}