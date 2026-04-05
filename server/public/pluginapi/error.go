package pluginapi
import (
	"net/http"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
)
var ErrNotFound = errors.New("not found")
func normalizeAppErr(appErr *model.AppError) error {
	if appErr == nil {
		return nil
	}
	if appErr.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}
	return appErr
}