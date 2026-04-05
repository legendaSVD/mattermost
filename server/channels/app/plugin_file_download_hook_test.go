package app
import (
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/plugin/plugintest"
)
func TestHookFileWillBeDownloaded(t *testing.T) {
	mainHelper.Parallel(t)
	t.Run("rejected", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)
		var mockAPI plugintest.API
		mockAPI.On("LoadPluginConfiguration", mock.Anything).Return(nil).Maybe()
		mockAPI.On("LogInfo", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogWarn", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogWarn", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogWarn", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) FileWillBeDownloaded(c *plugin.Context, info *model.FileInfo, userID string, downloadType model.FileDownloadType) string {
				p.API.LogInfo("Rejecting file download", "file_id", info.Id, "user_id", userID)
				return "Download blocked by security policy"
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, func(*model.Manifest) plugin.API { return &mockAPI })
		defer tearDown()
		fileInfo, appErr := th.App.UploadFile(th.Context, []byte("test content"), th.BasicChannel.Id, "test.txt")
		require.Nil(t, appErr)
		require.NotNil(t, fileInfo)
		info, appErr := th.App.GetFileInfo(th.Context, fileInfo.Id)
		require.Nil(t, appErr)
		rejectionReason := th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypeFile)
		assert.NotEmpty(t, rejectionReason)
		assert.Contains(t, rejectionReason, "blocked by security policy")
		mockAPI.AssertExpectations(t)
	})
	t.Run("allowed", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)
		var mockAPI plugintest.API
		mockAPI.On("LoadPluginConfiguration", mock.Anything).Return(nil).Maybe()
		mockAPI.On("LogInfo", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) FileWillBeDownloaded(c *plugin.Context, info *model.FileInfo, userID string, downloadType model.FileDownloadType) string {
				p.API.LogInfo("Allowing file download", "file_id", info.Id, "user_id", userID)
				return ""
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, func(*model.Manifest) plugin.API { return &mockAPI })
		defer tearDown()
		fileInfo, appErr := th.App.UploadFile(th.Context, []byte("test content"), th.BasicChannel.Id, "test.txt")
		require.Nil(t, appErr)
		require.NotNil(t, fileInfo)
		info, appErr := th.App.GetFileInfo(th.Context, fileInfo.Id)
		require.Nil(t, appErr)
		rejectionReason := th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypeFile)
		assert.Empty(t, rejectionReason)
		mockAPI.AssertExpectations(t)
	})
	t.Run("multiple plugins - first rejects", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)
		var mockAPI1 plugintest.API
		mockAPI1.On("LoadPluginConfiguration", mock.Anything).Return(nil).Maybe()
		mockAPI1.On("LogInfo", mock.Anything).Maybe().Return(nil)
		mockAPI1.On("LogInfo", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI1.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI1.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI1.On("LogWarn", mock.Anything).Maybe().Return(nil)
		mockAPI1.On("LogWarn", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI1.On("LogWarn", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI1.On("LogWarn", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		var mockAPI2 plugintest.API
		mockAPI2.On("LoadPluginConfiguration", mock.Anything).Return(nil).Maybe()
		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) FileWillBeDownloaded(c *plugin.Context, info *model.FileInfo, userID string, downloadType model.FileDownloadType) string {
				p.API.LogWarn("First plugin rejecting", "file_id", info.Id)
				return "Rejected by first plugin"
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
			`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) FileWillBeDownloaded(c *plugin.Context, info *model.FileInfo, userID string, downloadType model.FileDownloadType) string {
				p.API.LogInfo("Second plugin should not be called")
				return ""
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, func(*model.Manifest) plugin.API {
			return &mockAPI1
		})
		defer tearDown()
		fileInfo, appErr := th.App.UploadFile(th.Context, []byte("test content"), th.BasicChannel.Id, "test.txt")
		require.Nil(t, appErr)
		info, appErr := th.App.GetFileInfo(th.Context, fileInfo.Id)
		require.Nil(t, appErr)
		rejectionReason := th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypeFile)
		assert.NotEmpty(t, rejectionReason)
		assert.Contains(t, rejectionReason, "Rejected by first plugin")
		mockAPI1.AssertExpectations(t)
	})
	t.Run("no plugins installed", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)
		fileInfo, appErr := th.App.UploadFile(th.Context, []byte("test content"), th.BasicChannel.Id, "test.txt")
		require.Nil(t, appErr)
		info, appErr := th.App.GetFileInfo(th.Context, fileInfo.Id)
		require.Nil(t, appErr)
		rejectionReason := th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypeFile)
		assert.Empty(t, rejectionReason)
	})
}
func TestHookFileWillBeDownloadedHeadRequests(t *testing.T) {
	mainHelper.Parallel(t)
	t.Run("HEAD request to file endpoint triggers hook - rejection", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)
		var mockAPI plugintest.API
		mockAPI.On("LoadPluginConfiguration", mock.Anything).Return(nil).Maybe()
		mockAPI.On("LogInfo", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogWarn", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogWarn", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) FileWillBeDownloaded(c *plugin.Context, info *model.FileInfo, userID string, downloadType model.FileDownloadType) string {
				p.API.LogInfo("Blocking file download", "file_id", info.Id, "download_type", string(downloadType))
				return "File download blocked by security policy"
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, func(*model.Manifest) plugin.API { return &mockAPI })
		defer tearDown()
		fileInfo, appErr := th.App.UploadFile(th.Context, []byte("test content"), th.BasicChannel.Id, "test.txt")
		require.Nil(t, appErr)
		require.NotNil(t, fileInfo)
		info, appErr := th.App.GetFileInfo(th.Context, fileInfo.Id)
		require.Nil(t, appErr)
		rejectionReason := th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypeFile)
		assert.NotEmpty(t, rejectionReason)
		assert.Contains(t, rejectionReason, "blocked by security policy")
		mockAPI.AssertExpectations(t)
	})
	t.Run("HEAD request to thumbnail endpoint triggers hook - rejection", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)
		var mockAPI plugintest.API
		mockAPI.On("LoadPluginConfiguration", mock.Anything).Return(nil).Maybe()
		mockAPI.On("LogInfo", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogWarn", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogWarn", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) FileWillBeDownloaded(c *plugin.Context, info *model.FileInfo, userID string, downloadType model.FileDownloadType) string {
				if downloadType == model.FileDownloadTypeThumbnail {
					p.API.LogInfo("Blocking thumbnail download", "file_id", info.Id)
					return "Thumbnail download blocked"
				}
				return ""
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, func(*model.Manifest) plugin.API { return &mockAPI })
		defer tearDown()
		fileInfo, appErr := th.App.UploadFile(th.Context, []byte("test content"), th.BasicChannel.Id, "test.txt")
		require.Nil(t, appErr)
		require.NotNil(t, fileInfo)
		info, appErr := th.App.GetFileInfo(th.Context, fileInfo.Id)
		require.Nil(t, appErr)
		rejectionReason := th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypeThumbnail)
		assert.NotEmpty(t, rejectionReason)
		assert.Contains(t, rejectionReason, "Thumbnail download blocked")
		mockAPI.AssertExpectations(t)
	})
	t.Run("HEAD request to preview endpoint triggers hook - rejection", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)
		var mockAPI plugintest.API
		mockAPI.On("LoadPluginConfiguration", mock.Anything).Return(nil).Maybe()
		mockAPI.On("LogInfo", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogWarn", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogWarn", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) FileWillBeDownloaded(c *plugin.Context, info *model.FileInfo, userID string, downloadType model.FileDownloadType) string {
				if downloadType == model.FileDownloadTypePreview {
					p.API.LogInfo("Blocking preview download", "file_id", info.Id)
					return "Preview download blocked"
				}
				return ""
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, func(*model.Manifest) plugin.API { return &mockAPI })
		defer tearDown()
		fileInfo, appErr := th.App.UploadFile(th.Context, []byte("test content"), th.BasicChannel.Id, "test.txt")
		require.Nil(t, appErr)
		require.NotNil(t, fileInfo)
		info, appErr := th.App.GetFileInfo(th.Context, fileInfo.Id)
		require.Nil(t, appErr)
		rejectionReason := th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypePreview)
		assert.NotEmpty(t, rejectionReason)
		assert.Contains(t, rejectionReason, "Preview download blocked")
		mockAPI.AssertExpectations(t)
	})
	t.Run("HEAD request to file endpoint triggers hook - allowed", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)
		var mockAPI plugintest.API
		mockAPI.On("LoadPluginConfiguration", mock.Anything).Return(nil).Maybe()
		mockAPI.On("LogInfo", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) FileWillBeDownloaded(c *plugin.Context, info *model.FileInfo, userID string, downloadType model.FileDownloadType) string {
				p.API.LogInfo("Allowing file download", "file_id", info.Id, "download_type", string(downloadType))
				return ""
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, func(*model.Manifest) plugin.API { return &mockAPI })
		defer tearDown()
		fileInfo, appErr := th.App.UploadFile(th.Context, []byte("test content"), th.BasicChannel.Id, "test.txt")
		require.Nil(t, appErr)
		require.NotNil(t, fileInfo)
		info, appErr := th.App.GetFileInfo(th.Context, fileInfo.Id)
		require.Nil(t, appErr)
		rejectionReason := th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypeFile)
		assert.Empty(t, rejectionReason)
		mockAPI.AssertExpectations(t)
	})
	t.Run("HEAD and GET with different download types", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)
		downloadTypesReceived := []model.FileDownloadType{}
		var mockAPI plugintest.API
		mockAPI.On("LoadPluginConfiguration", mock.Anything).Return(nil).Maybe()
		mockAPI.On("LogInfo", mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
			if args.String(0) == "Hook called" {
				downloadType := args.String(2)
				downloadTypesReceived = append(downloadTypesReceived, model.FileDownloadType(downloadType))
			}
		}).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		mockAPI.On("LogInfo", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Maybe().Return(nil)
		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main
			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)
			type MyPlugin struct {
				plugin.MattermostPlugin
			}
			func (p *MyPlugin) FileWillBeDownloaded(c *plugin.Context, info *model.FileInfo, userID string, downloadType model.FileDownloadType) string {
				p.API.LogInfo("Hook called", "download_type", string(downloadType))
				return ""
			}
			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, func(*model.Manifest) plugin.API { return &mockAPI })
		defer tearDown()
		fileInfo, appErr := th.App.UploadFile(th.Context, []byte("test content"), th.BasicChannel.Id, "test.txt")
		require.Nil(t, appErr)
		info, appErr := th.App.GetFileInfo(th.Context, fileInfo.Id)
		require.Nil(t, appErr)
		th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypeFile)
		th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypeThumbnail)
		th.App.RunFileWillBeDownloadedHook(th.Context, info, th.BasicUser.Id, "", model.FileDownloadTypePreview)
		assert.Len(t, downloadTypesReceived, 3)
		assert.Contains(t, downloadTypesReceived, model.FileDownloadTypeFile)
		assert.Contains(t, downloadTypesReceived, model.FileDownloadTypeThumbnail)
		assert.Contains(t, downloadTypesReceived, model.FileDownloadTypePreview)
		mockAPI.AssertExpectations(t)
	})
}