package model
import (
	"fmt"
	"net/http"
)
type UploadType string
const (
	UploadTypeAttachment   UploadType = "attachment"
	UploadTypeImport       UploadType = "import"
	IncompleteUploadSuffix            = ".tmp"
)
const UploadNoUserID = "nouser"
type UploadSession struct {
	Id string `json:"id"`
	Type UploadType `json:"type"`
	CreateAt int64 `json:"create_at"`
	UserId string `json:"user_id"`
	ChannelId string `json:"channel_id,omitempty"`
	Filename string `json:"filename"`
	Path string `json:"-"`
	FileSize int64 `json:"file_size"`
	FileOffset int64 `json:"file_offset"`
	RemoteId string `json:"remote_id"`
	ReqFileId string `json:"req_file_id"`
}
func (us *UploadSession) Auditable() map[string]any {
	return map[string]any{
		"id":         us.Id,
		"type":       us.Type,
		"user_id":    us.UserId,
		"channel_id": us.ChannelId,
		"filename":   us.Filename,
		"file_size":  us.FileSize,
		"remote_id":  us.RemoteId,
		"ReqFileId":  us.ReqFileId,
	}
}
func (us *UploadSession) PreSave() {
	if us.Id == "" {
		us.Id = NewId()
	}
	if us.CreateAt == 0 {
		us.CreateAt = GetMillis()
	}
}
func (t UploadType) IsValid() error {
	switch t {
	case UploadTypeAttachment:
		return nil
	case UploadTypeImport:
		return nil
	default:
	}
	return fmt.Errorf("invalid UploadType %s", t)
}
func (us *UploadSession) IsValid() *AppError {
	if !IsValidId(us.Id) {
		return NewAppError("UploadSession.IsValid", "model.upload_session.is_valid.id.app_error", nil, "", http.StatusBadRequest)
	}
	if err := us.Type.IsValid(); err != nil {
		return NewAppError("UploadSession.IsValid", "model.upload_session.is_valid.type.app_error", nil, "", http.StatusBadRequest).Wrap(err)
	}
	if !IsValidId(us.UserId) && us.UserId != UploadNoUserID {
		return NewAppError("UploadSession.IsValid", "model.upload_session.is_valid.user_id.app_error", nil, "id="+us.Id, http.StatusBadRequest)
	}
	if us.Type == UploadTypeAttachment && !IsValidId(us.ChannelId) {
		return NewAppError("UploadSession.IsValid", "model.upload_session.is_valid.channel_id.app_error", nil, "id="+us.Id, http.StatusBadRequest)
	}
	if us.CreateAt == 0 {
		return NewAppError("UploadSession.IsValid", "model.upload_session.is_valid.create_at.app_error", nil, "id="+us.Id, http.StatusBadRequest)
	}
	if us.Filename == "" {
		return NewAppError("UploadSession.IsValid", "model.upload_session.is_valid.filename.app_error", nil, "id="+us.Id, http.StatusBadRequest)
	}
	if us.FileSize <= 0 {
		return NewAppError("UploadSession.IsValid", "model.upload_session.is_valid.file_size.app_error", nil, "id="+us.Id, http.StatusBadRequest)
	}
	if us.FileOffset < 0 || us.FileOffset > us.FileSize {
		return NewAppError("UploadSession.IsValid", "model.upload_session.is_valid.file_offset.app_error", nil, "id="+us.Id, http.StatusBadRequest)
	}
	if us.Path == "" {
		return NewAppError("UploadSession.IsValid", "model.upload_session.is_valid.path.app_error", nil, "id="+us.Id, http.StatusBadRequest)
	}
	return nil
}