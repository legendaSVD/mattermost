package model
import "time"
const (
	MaxImageSize = int64(6048 * 4032)
)
type FileUploadResponse struct {
	FileInfos []*FileInfo `json:"file_infos"`
	ClientIds []string    `json:"client_ids"`
}
type PresignURLResponse struct {
	URL        string        `json:"url"`
	Expiration time.Duration `json:"expiration"`
}