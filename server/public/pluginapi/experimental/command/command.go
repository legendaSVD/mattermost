package command
import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"github.com/pkg/errors"
)
type PluginAPI interface {
	GetBundlePath() (string, error)
}
func GetIconData(api PluginAPI, iconPath string) (string, error) {
	bundlePath, err := api.GetBundlePath()
	if err != nil {
		return "", errors.Wrap(err, "couldn't get bundle path")
	}
	icon, err := os.ReadFile(filepath.Join(bundlePath, iconPath))
	if err != nil {
		return "", errors.Wrap(err, "failed to open icon")
	}
	return fmt.Sprintf("data:image/svg+xml;base64,%s", base64.StdEncoding.EncodeToString(icon)), nil
}