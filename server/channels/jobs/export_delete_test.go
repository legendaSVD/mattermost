package jobs_test
import (
	"os"
	"path/filepath"
	"testing"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestExportDelete(t *testing.T) {
	mainHelper.Parallel(t)
	fileSettingsDir, err := os.MkdirTemp("", "")
	require.NoError(t, err)
	relExportDir := "./export"
	exportDir := filepath.Join(fileSettingsDir, relExportDir)
	t.Cleanup(func() {
		err = os.RemoveAll(fileSettingsDir)
		assert.NoError(t, err)
	})
	retentionDays := 1
	updateConfig := func(cfg *model.Config) {
		*cfg.FileSettings.DriverName = model.ImageDriverLocal
		*cfg.FileSettings.Directory = fileSettingsDir
		*cfg.ExportSettings.Directory = relExportDir
		*cfg.ExportSettings.RetentionDays = retentionDays
	}
	th := SetupWithUpdateCfg(t, updateConfig)
	files := []string{
		"old_export.zip",
		"recent_export.zip",
		"normal.txt",
		"test_export.zip",
		"data.json",
	}
	dirs := []string{
		"data",
		"data/subfolder",
	}
	for _, dir := range dirs {
		err = os.MkdirAll(filepath.Join(exportDir, dir), 0755)
		require.NoError(t, err)
		err = os.WriteFile(filepath.Join(exportDir, dir, "file.txt"), []byte("test"), 0644)
		require.NoError(t, err)
	}
	for _, file := range files {
		err = os.WriteFile(filepath.Join(exportDir, file), []byte("test"), 0644)
		require.NoError(t, err)
	}
	oldTime := time.Now().Add(-(time.Duration(retentionDays) * 24 * time.Hour) - 1*time.Hour)
	err = os.Chtimes(filepath.Join(exportDir, "old_export.zip"), oldTime, oldTime)
	require.NoError(t, err)
	err = os.Chtimes(filepath.Join(exportDir, "test_export.zip"), oldTime, oldTime)
	require.NoError(t, err)
	th.SetupWorkers(t)
	th.RunJob(t, model.JobTypeExportDelete, nil)
	for _, name := range []string{
		"recent_export.zip",
		"normal.txt",
		"data.json",
		"data/file.txt",
		"data/subfolder/file.txt",
	} {
		_, err := os.Stat(filepath.Join(exportDir, name))
		require.NoError(t, err, "Expected file/directory to exist: %s", name)
	}
	for _, name := range []string{
		"old_export.zip",
		"test_export.zip",
	} {
		_, err := os.Stat(filepath.Join(exportDir, name))
		require.True(t, os.IsNotExist(err), "Expected file to be deleted: %s", name)
	}
}