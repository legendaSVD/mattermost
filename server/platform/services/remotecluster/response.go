package remotecluster
import (
	"encoding/json"
)
type Response struct {
	Status  string          `json:"status"`
	Err     string          `json:"err"`
	Payload json.RawMessage `json:"payload"`
}
func (r *Response) IsSuccess() bool {
	return r.Status == ResponseStatusOK
}
func (r *Response) SetPayload(v any) error {
	raw, err := json.Marshal(v)
	if err != nil {
		return err
	}
	r.Payload = raw
	return nil
}