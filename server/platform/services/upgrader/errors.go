package upgrader
import (
	"fmt"
)
type InvalidArch struct{}
func NewInvalidArch() *InvalidArch {
	return &InvalidArch{}
}
func (e *InvalidArch) Error() string {
	return "invalid operating system or processor architecture"
}
type InvalidSignature struct{}
func NewInvalidSignature() *InvalidSignature {
	return &InvalidSignature{}
}
func (e *InvalidSignature) Error() string {
	return "invalid file signature"
}
type InvalidPermissions struct {
	ErrType            string
	Path               string
	FileUsername       string
	MattermostUsername string
}
func NewInvalidPermissions(errType string, path string, mattermostUsername string, fileUsername string) *InvalidPermissions {
	return &InvalidPermissions{
		ErrType:            errType,
		Path:               path,
		FileUsername:       fileUsername,
		MattermostUsername: mattermostUsername,
	}
}
func (e *InvalidPermissions) Error() string {
	return fmt.Sprintf("the user %s is unable to update the %s file", e.MattermostUsername, e.Path)
}