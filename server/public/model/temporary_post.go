package model
import "errors"
type TemporaryPost struct {
	ID       string      `json:"id"`
	Type     string      `json:"type"`
	ExpireAt int64       `json:"expire_at"`
	Message  string      `json:"message"`
	FileIDs  StringArray `json:"file_ids"`
}
func (o *TemporaryPost) IsValid() error {
	if o.ID == "" {
		return errors.New("id is required")
	}
	return nil
}
func CreateTemporaryPost(post *Post, expireAt int64) (*TemporaryPost, *Post, error) {
	temporaryPost := &TemporaryPost{
		ID:       post.Id,
		Type:     post.Type,
		ExpireAt: expireAt,
		Message:  post.Message,
		FileIDs:  post.FileIds,
	}
	post.FileIds = []string{}
	post.Message = ""
	return temporaryPost, post, nil
}