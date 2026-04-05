package commands
import (
	"fmt"
	"net/http"
	"github.com/mattermost/mattermost/server/public/model"
)
type ErrEntityNotFound struct {
	Type string
	ID   string
}
func (e ErrEntityNotFound) Error() string {
	return fmt.Sprintf("%s %s not found", e.Type, e.ID)
}
type NotFoundError struct {
	Msg string
}
func (e *NotFoundError) Error() string {
	return e.Msg
}
type BadRequestError struct {
	Msg string
}
func (e *BadRequestError) Error() string {
	return e.Msg
}
func ExtractErrorFromResponse(r *model.Response, err error) error {
	switch r.StatusCode {
	case http.StatusNotFound:
		return &NotFoundError{Msg: err.Error()}
	case http.StatusBadRequest:
		return &BadRequestError{Msg: err.Error()}
	default:
		return err
	}
}