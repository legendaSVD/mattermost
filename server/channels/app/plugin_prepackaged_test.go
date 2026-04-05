package app
import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/channels/utils/fileutils"
)
func TestBuildPrepackagedPlugin(t *testing.T) {
	mainHelper.Parallel(t)
	testsPath, found := fileutils.FindDir("tests")
	require.True(t, found, "tests directory not found")
	publicKeyData, err := os.ReadFile(filepath.Join(testsPath, "development-public-key.asc"))
	require.NoError(t, err)
	t.Run("valid plugin with signature and icon data", func(t *testing.T) {
		th := Setup(t)
		appErr := th.App.AddPublicKey("development-public-key.asc", bytes.NewBuffer(publicKeyData))
		require.Nil(t, appErr)
		pluginPath := &pluginSignaturePath{
			pluginID:      "testplugin",
			bundlePath:    filepath.Join(testsPath, "testplugin.tar.gz"),
			signaturePath: filepath.Join(testsPath, "testplugin.tar.gz.sig"),
		}
		pluginFile, err := os.Open(pluginPath.bundlePath)
		require.NoError(t, err)
		defer pluginFile.Close()
		logger := mlog.CreateConsoleTestLogger(t)
		plugin, pluginDir, err := th.App.ch.buildPrepackagedPlugin(logger, pluginPath, pluginFile, t.TempDir())
		require.NoError(t, err)
		require.NotNil(t, plugin)
		require.NotEmpty(t, pluginDir)
		assert.NotNil(t, plugin.Manifest)
		assert.Equal(t, pluginPath.bundlePath, plugin.Path)
		assert.Equal(t, pluginPath.signaturePath, plugin.SignaturePath)
		assert.Equal(t, "testplugin", plugin.Manifest.Id)
		assert.Equal(t, "assets/icon.svg", plugin.Manifest.IconPath)
		assert.NotEmpty(t, plugin.IconData, "Plugin should have icon data loaded")
	})
	t.Run("missing signature file", func(t *testing.T) {
		th := Setup(t)
		pluginPath := &pluginSignaturePath{
			pluginID:      "testplugin",
			bundlePath:    filepath.Join(testsPath, "testplugin.tar.gz"),
			signaturePath: "",
		}
		pluginFile, err := os.Open(pluginPath.bundlePath)
		require.NoError(t, err)
		defer pluginFile.Close()
		logger := mlog.CreateConsoleTestLogger(t)
		plugin, pluginDir, err := th.App.ch.buildPrepackagedPlugin(logger, pluginPath, pluginFile, t.TempDir())
		require.Error(t, err)
		require.Nil(t, plugin)
		require.Empty(t, pluginDir)
		assert.Contains(t, err.Error(), "Prepackaged plugin missing required signature file")
	})
	t.Run("nonexistent signature file", func(t *testing.T) {
		th := Setup(t)
		pluginPath := &pluginSignaturePath{
			pluginID:      "testplugin",
			bundlePath:    filepath.Join(testsPath, "testplugin.tar.gz"),
			signaturePath: "/nonexistent/signature.sig",
		}
		pluginFile, err := os.Open(pluginPath.bundlePath)
		require.NoError(t, err)
		defer pluginFile.Close()
		logger := mlog.CreateConsoleTestLogger(t)
		plugin, pluginDir, err := th.App.ch.buildPrepackagedPlugin(logger, pluginPath, pluginFile, t.TempDir())
		require.Error(t, err)
		require.Nil(t, plugin)
		require.Empty(t, pluginDir)
		assert.Contains(t, err.Error(), "Failed to open prepackaged plugin signature")
	})
	t.Run("empty signature file", func(t *testing.T) {
		th := Setup(t)
		appErr := th.App.AddPublicKey("development-public-key.asc", bytes.NewBuffer(publicKeyData))
		require.Nil(t, appErr)
		tmpSig, err := os.CreateTemp("", "*.sig")
		require.NoError(t, err)
		tmpSig.Close()
		defer os.Remove(tmpSig.Name())
		pluginPath := &pluginSignaturePath{
			pluginID:      "testplugin",
			bundlePath:    filepath.Join(testsPath, "testplugin.tar.gz"),
			signaturePath: tmpSig.Name(),
		}
		pluginFile, err := os.Open(pluginPath.bundlePath)
		require.NoError(t, err)
		defer pluginFile.Close()
		logger := mlog.CreateConsoleTestLogger(t)
		plugin, pluginDir, err := th.App.ch.buildPrepackagedPlugin(logger, pluginPath, pluginFile, t.TempDir())
		require.Error(t, err)
		require.Nil(t, plugin)
		require.Empty(t, pluginDir)
		assert.Contains(t, err.Error(), "Prepackaged plugin signature verification failed")
	})
	t.Run("signature verification failure", func(t *testing.T) {
		th := Setup(t)
		pluginPath := &pluginSignaturePath{
			pluginID:      "testplugin",
			bundlePath:    filepath.Join(testsPath, "testplugin.tar.gz"),
			signaturePath: filepath.Join(testsPath, "testplugin2.tar.gz.sig"),
		}
		pluginFile, err := os.Open(pluginPath.bundlePath)
		require.NoError(t, err)
		defer pluginFile.Close()
		logger := mlog.CreateConsoleTestLogger(t)
		plugin, pluginDir, err := th.App.ch.buildPrepackagedPlugin(logger, pluginPath, pluginFile, t.TempDir())
		require.Error(t, err)
		require.Nil(t, plugin)
		require.Empty(t, pluginDir)
		assert.Contains(t, err.Error(), "Prepackaged plugin signature verification failed")
	})
}