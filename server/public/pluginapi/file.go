package pluginapi
import (
	"bytes"
	"io"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type FileService struct {
	api plugin.API
}
func (f *FileService) Get(id string) (io.Reader, error) {
	contentBytes, appErr := f.api.GetFile(id)
	if appErr != nil {
		return nil, normalizeAppErr(appErr)
	}
	return bytes.NewReader(contentBytes), nil
}
func (f *FileService) GetByPath(path string) (io.Reader, error) {
	contentBytes, appErr := f.api.ReadFile(path)
	if appErr != nil {
		return nil, normalizeAppErr(appErr)
	}
	return bytes.NewReader(contentBytes), nil
}
func (f *FileService) GetInfo(id string) (*model.FileInfo, error) {
	info, appErr := f.api.GetFileInfo(id)
	return info, normalizeAppErr(appErr)
}
func (f *FileService) SetSearchableContent(id string, content string) error {
	appErr := f.api.SetFileSearchableContent(id, content)
	return normalizeAppErr(appErr)
}
func (f *FileService) GetLink(id string) (string, error) {
	link, appErr := f.api.GetFileLink(id)
	return link, normalizeAppErr(appErr)
}
func (f *FileService) Upload(content io.Reader, fileName, channelID string) (*model.FileInfo, error) {
	contentBytes, err := io.ReadAll(content)
	if err != nil {
		return nil, err
	}
	info, appErr := f.api.UploadFile(contentBytes, channelID, fileName)
	return info, normalizeAppErr(appErr)
}
func (f *FileService) CopyInfos(ids []string, userID string) ([]string, error) {
	newIDs, appErr := f.api.CopyFileInfos(userID, ids)
	return newIDs, normalizeAppErr(appErr)
}