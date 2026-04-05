package api4
import (
	"os"
	"testing"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/stretchr/testify/assert"
)
func TestEnvironmentVariableHandling(t *testing.T) {
	originalConsoleLevel := os.Getenv("MM_LOGSETTINGS_CONSOLELEVEL")
	defer func() {
		if originalConsoleLevel != "" {
			os.Setenv("MM_LOGSETTINGS_CONSOLELEVEL", originalConsoleLevel)
		} else {
			os.Unsetenv("MM_LOGSETTINGS_CONSOLELEVEL")
		}
	}()
	t.Run("MM_LOGSETTINGS_CONSOLELEVEL should be respected when set", func(t *testing.T) {
		os.Setenv("MM_LOGSETTINGS_CONSOLELEVEL", "ERROR")
		defer os.Unsetenv("MM_LOGSETTINGS_CONSOLELEVEL")
		th := SetupEnterprise(t)
		config := th.App.Config()
		assert.Equal(t, "ERROR", *config.LogSettings.ConsoleLevel)
	})
	t.Run("Only MM_LOGSETTINGS_CONSOLELEVEL is manually processed", func(t *testing.T) {
		os.Unsetenv("MM_LOGSETTINGS_CONSOLELEVEL")
		th1 := SetupEnterprise(t)
		config1 := th1.App.Config()
		defaultConsoleLevel := *config1.LogSettings.ConsoleLevel
		os.Setenv("MM_LOGSETTINGS_CONSOLELEVEL", "DEBUG")
		defer os.Unsetenv("MM_LOGSETTINGS_CONSOLELEVEL")
		th2 := SetupEnterprise(t)
		config2 := th2.App.Config()
		customConsoleLevel := *config2.LogSettings.ConsoleLevel
		assert.Equal(t, mlog.LvlStdLog.Name, defaultConsoleLevel, "Default should be stdlog")
		assert.Equal(t, "DEBUG", customConsoleLevel, "Environment variable should be respected")
		assert.NotEqual(t, defaultConsoleLevel, customConsoleLevel, "Values should be different")
	})
}