package utils
import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/utils/fileutils"
)
func getSubpathScript(subpath string) string {
	if subpath == "" {
		subpath = "/"
	}
	newPath := path.Join(subpath, "static") + "/"
	return fmt.Sprintf("window.publicPath='%s'", newPath)
}
func GetSubpathScriptHash(subpath string) string {
	if subpath == "" || subpath == "/" {
		return ""
	}
	scriptHash := sha256.Sum256([]byte(getSubpathScript(subpath)))
	return fmt.Sprintf(" 'sha256-%s'", base64.StdEncoding.EncodeToString(scriptHash[:]))
}
func UpdateAssetsSubpathInDir(subpath, directory string) error {
	if subpath == "" {
		subpath = "/"
	}
	staticDir, found := fileutils.FindDir(directory)
	if !found {
		return errors.New("failed to find client dir")
	}
	staticDir, err := filepath.EvalSymlinks(staticDir)
	if err != nil {
		return errors.Wrapf(err, "failed to resolve symlinks to %s", staticDir)
	}
	rootHTMLPath := filepath.Join(staticDir, "root.html")
	oldRootHTML, err := os.ReadFile(rootHTMLPath)
	if err != nil {
		return errors.Wrap(err, "failed to open root.html")
	}
	oldSubpath := "/"
	reWebpackPublicPathScript := regexp.MustCompile("window.publicPath='([^']+/)static/'")
	alreadyRewritten := false
	if matches := reWebpackPublicPathScript.FindStringSubmatch(string(oldRootHTML)); matches != nil {
		oldSubpath = matches[1]
		alreadyRewritten = true
	}
	pathToReplace := path.Join(oldSubpath, "static") + "/"
	newPath := path.Join(subpath, "static") + "/"
	if err := updateRootFile(string(oldRootHTML), rootHTMLPath, alreadyRewritten, pathToReplace, newPath, subpath); err != nil {
		return fmt.Errorf("failed to update root.html: %w", err)
	}
	if err := updateManifestAndCSSFiles(staticDir, pathToReplace, newPath, subpath); err != nil {
		return fmt.Errorf("failed to update manifest.json and *.css files: %w", err)
	}
	return nil
}
func updateRootFile(oldRootHTML string, rootHTMLPath string, alreadyRewritten bool, pathToReplace, newPath, subpath string) error {
	newRootHTML := oldRootHTML
	reCSP := regexp.MustCompile(`<meta http-equiv="Content-Security-Policy" content="script-src 'self'([^"]*)">`)
	if results := reCSP.FindAllString(newRootHTML, -1); len(results) == 0 {
		return fmt.Errorf("failed to find 'Content-Security-Policy' meta tag to rewrite")
	}
	newRootHTML = reCSP.ReplaceAllLiteralString(newRootHTML, fmt.Sprintf(
		`<meta http-equiv="Content-Security-Policy" content="script-src 'self'%s">`,
		GetSubpathScriptHash(subpath),
	))
	newRootHTML = strings.Replace(newRootHTML, pathToReplace, newPath, -1)
	publicPathInWindowsScriptRegex := regexp.MustCompile(`(?s)<script id="publicPathInWindowScript">(.*?)</script>`)
	if alreadyRewritten && subpath == "/" {
		newRootHTML = publicPathInWindowsScriptRegex.ReplaceAllLiteralString(newRootHTML, "<script id=\"publicPathInWindowScript\"></script>")
	} else if !alreadyRewritten && subpath != "/" {
		subpathScript := getSubpathScript(subpath)
		newRootHTML = publicPathInWindowsScriptRegex.ReplaceAllLiteralString(newRootHTML, fmt.Sprintf("<script id=\"publicPathInWindowScript\">%s</script>", subpathScript))
	}
	if newRootHTML == oldRootHTML {
		mlog.Debug("No need to rewrite unmodified root.html", mlog.String("from_subpath", pathToReplace), mlog.String("to_subpath", newPath))
		return nil
	}
	mlog.Debug("Rewriting root.html", mlog.String("from_subpath", pathToReplace), mlog.String("to_subpath", newPath))
	if err := os.WriteFile(rootHTMLPath, []byte(newRootHTML), 0); err != nil {
		return errors.Wrapf(err, "failed to update root.html with subpath %s", subpath)
	}
	return nil
}
func updateManifestAndCSSFiles(staticDir, pathToReplace, newPath, subpath string) error {
	if pathToReplace == newPath {
		mlog.Debug("No need to rewrite unmodified manifest.json and *.css files", mlog.String("from_subpath", pathToReplace), mlog.String("to_subpath", newPath))
		return nil
	}
	mlog.Debug("Rewriting manifest.json and *.css files", mlog.String("from_subpath", pathToReplace), mlog.String("to_subpath", newPath))
	err := filepath.Walk(staticDir, func(walkPath string, info os.FileInfo, err error) error {
		if filepath.Base(walkPath) == "manifest.json" || filepath.Ext(walkPath) == ".css" {
			old, err := os.ReadFile(walkPath)
			if err != nil {
				return errors.Wrapf(err, "failed to open %s", walkPath)
			}
			n := strings.Replace(string(old), pathToReplace, newPath, -1)
			if err = os.WriteFile(walkPath, []byte(n), 0); err != nil {
				return errors.Wrapf(err, "failed to update %s with subpath %s", walkPath, subpath)
			}
		}
		return nil
	})
	if err != nil {
		return errors.Wrapf(err, "error walking %s", staticDir)
	}
	return nil
}
func UpdateAssetsSubpath(subpath string) error {
	return UpdateAssetsSubpathInDir(subpath, model.ClientDir)
}
func UpdateAssetsSubpathFromConfig(config *model.Config) error {
	if model.BuildNumber == "dev" {
		mlog.Debug("Skipping update to assets subpath since dev build")
		return nil
	}
	if os.Getenv("IS_CI") == "true" || os.Getenv("IS_LOCAL_TESTING") == "true" {
		mlog.Debug("Skipping update to assets subpath since CI build")
		return nil
	}
	subpath, err := GetSubpathFromConfig(config)
	if err != nil {
		return err
	}
	return UpdateAssetsSubpath(subpath)
}
func GetSubpathFromConfig(config *model.Config) (string, error) {
	if config == nil {
		return "", errors.New("no config provided")
	} else if config.ServiceSettings.SiteURL == nil {
		return "/", nil
	}
	u, err := url.Parse(*config.ServiceSettings.SiteURL)
	if err != nil {
		return "", errors.Wrap(err, "failed to parse SiteURL from config")
	}
	if u.Path == "" {
		return "/", nil
	}
	return path.Clean(u.Path), nil
}