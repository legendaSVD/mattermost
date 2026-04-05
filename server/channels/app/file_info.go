package app
import (
	"image"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/utils/imgutils"
)
func getInfoForBytes(name string, data io.ReadSeeker, size int) (*model.FileInfo, *model.AppError) {
	info := &model.FileInfo{
		Name: name,
		Size: int64(size),
	}
	var err *model.AppError
	extension := strings.ToLower(filepath.Ext(name))
	info.MimeType = mime.TypeByExtension(extension)
	if extension != "" {
		info.Extension = extension[1:]
	} else {
		info.Extension = extension
	}
	if info.IsImage() {
		if config, _, err := image.DecodeConfig(data); err == nil {
			info.Width = config.Width
			info.Height = config.Height
			if info.MimeType == "image/gif" {
				if _, err := data.Seek(0, io.SeekStart); err != nil {
					return info, model.NewAppError("getInfoForBytes", "app.file_info.seek.gif.app_error", nil, "", http.StatusBadRequest).Wrap(err)
				}
				frameCount, err := imgutils.CountGIFFrames(data)
				if err != nil {
					info.HasPreviewImage = true
					return info, model.NewAppError("getInfoForBytes", "app.file_info.get.gif.app_error", nil, "", http.StatusBadRequest).Wrap(err)
				}
				info.HasPreviewImage = frameCount == 1
			} else {
				info.HasPreviewImage = true
			}
		}
	}
	return info, err
}