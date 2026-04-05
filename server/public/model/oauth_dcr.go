package model
import (
	"net/http"
	"strings"
)
type ClientRegistrationRequest struct {
	RedirectURIs            []string `json:"redirect_uris"`
	TokenEndpointAuthMethod *string  `json:"token_endpoint_auth_method,omitempty"`
	ClientName              *string  `json:"client_name,omitempty"`
	ClientURI               *string  `json:"client_uri,omitempty"`
}
type ClientRegistrationResponse struct {
	ClientID                string   `json:"client_id"`
	ClientSecret            *string  `json:"client_secret,omitempty"`
	RedirectURIs            []string `json:"redirect_uris"`
	TokenEndpointAuthMethod string   `json:"token_endpoint_auth_method"`
	GrantTypes              []string `json:"grant_types"`
	ResponseTypes           []string `json:"response_types"`
	Scope                   string   `json:"scope,omitempty"`
	ClientName              *string  `json:"client_name,omitempty"`
	ClientURI               *string  `json:"client_uri,omitempty"`
}
const (
	DCRErrorInvalidRedirectURI    = "invalid_redirect_uri"
	DCRErrorInvalidClientMetadata = "invalid_client_metadata"
	DCRErrorUnsupportedOperation  = "unsupported_operation"
)
type DCRError struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description,omitempty"`
}
func (r *ClientRegistrationRequest) IsValid() *AppError {
	if len(r.RedirectURIs) == 0 {
		return NewAppError("ClientRegistrationRequest.IsValid", "model.dcr.is_valid.redirect_uris.app_error", nil, "", http.StatusBadRequest)
	}
	for _, uri := range r.RedirectURIs {
		if !IsValidHTTPURL(uri) {
			return NewAppError("ClientRegistrationRequest.IsValid", "model.dcr.is_valid.redirect_uri_format.app_error", nil, "uri="+uri, http.StatusBadRequest)
		}
	}
	if r.ClientName != nil && len(*r.ClientName) > 64 {
		return NewAppError("ClientRegistrationRequest.IsValid", "model.dcr.is_valid.client_name.app_error", nil, "", http.StatusBadRequest)
	}
	if r.ClientURI != nil {
		if !IsValidHTTPURL(*r.ClientURI) {
			return NewAppError("ClientRegistrationRequest.IsValid", "model.dcr.is_valid.client_uri_format.app_error", nil, "uri="+*r.ClientURI, http.StatusBadRequest)
		}
		if len(*r.ClientURI) > 256 {
			return NewAppError("ClientRegistrationRequest.IsValid", "model.dcr.is_valid.client_uri_length.app_error", nil, "", http.StatusBadRequest)
		}
	}
	if r.TokenEndpointAuthMethod != nil && *r.TokenEndpointAuthMethod != ClientAuthMethodClientSecretPost && *r.TokenEndpointAuthMethod != ClientAuthMethodNone {
		return NewAppError("ClientRegistrationRequest.IsValid", "model.dcr.is_valid.unsupported_auth_method.app_error", nil, "method="+*r.TokenEndpointAuthMethod, http.StatusBadRequest)
	}
	return nil
}
func NewDCRError(errorType, description string) *DCRError {
	return &DCRError{
		Error:            errorType,
		ErrorDescription: description,
	}
}
func GetDefaultGrantTypes() []string {
	return []string{GrantTypeAuthorizationCode, GrantTypeRefreshToken}
}
func GetDefaultResponseTypes() []string {
	return []string{ResponseTypeCode}
}
func IsValidDCRRedirectURIPattern(pattern string) bool {
	if strings.HasPrefix(pattern, "https://") {
		if len(pattern) < 9 {
			return false
		}
	} else if strings.HasPrefix(pattern, "http://") {
		if len(pattern) < 8 {
			return false
		}
	} else {
		return false
	}
	for _, r := range pattern {
		if r < 0x20 || r == 0x7f {
			return false
		}
	}
	if strings.Contains(pattern, "***") {
		return false
	}
	normalized := strings.ReplaceAll(pattern, "**", "mmdoublewildcard")
	normalized = strings.ReplaceAll(normalized, "*", "mmsinglewildcard")
	normalized = strings.ReplaceAll(normalized, "mmdoublewildcard", "1")
	normalized = strings.ReplaceAll(normalized, "mmsinglewildcard", "1")
	return IsValidHTTPURL(normalized)
}
func RedirectURIMatchesGlob(uri, pattern string) bool {
	return redirectURIMatchesGlobRecur(uri, pattern, 0, 0)
}
func redirectURIMatchesGlobRecur(uri, pattern string, ui, pi int) bool {
	for pi < len(pattern) {
		if pattern[pi] == '*' {
			if pi+1 < len(pattern) && pattern[pi+1] == '*' {
				pi += 2
				if pi >= len(pattern) {
					return true
				}
				for ui <= len(uri) {
					if redirectURIMatchesGlobRecur(uri, pattern, ui, pi) {
						return true
					}
					ui++
				}
				return false
			}
			if redirectURIMatchesGlobRecur(uri, pattern, ui, pi+1) {
				return true
			}
			for ui < len(uri) && uri[ui] != '/' {
				ui++
				if redirectURIMatchesGlobRecur(uri, pattern, ui, pi+1) {
					return true
				}
			}
			return false
		}
		if ui >= len(uri) || uri[ui] != pattern[pi] {
			return false
		}
		ui++
		pi++
	}
	return ui == len(uri)
}
func RedirectURIMatchesAllowlist(uri string, allowlist []string) bool {
	if len(allowlist) == 0 {
		return true
	}
	for _, p := range allowlist {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" && RedirectURIMatchesGlob(uri, trimmed) {
			return true
		}
	}
	return false
}