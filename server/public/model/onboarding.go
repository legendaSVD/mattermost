package model
import (
	"encoding/json"
	"io"
)
type CompleteOnboardingRequest struct {
	Organization   string   `json:"organization"`
	InstallPlugins []string `json:"install_plugins"`
}
func (r *CompleteOnboardingRequest) Auditable() map[string]any {
	return map[string]any{
		"install_plugins": r.InstallPlugins,
	}
}
func CompleteOnboardingRequestFromReader(reader io.Reader) (*CompleteOnboardingRequest, error) {
	var r *CompleteOnboardingRequest
	err := json.NewDecoder(reader).Decode(&r)
	if err != nil {
		return nil, err
	}
	return r, nil
}