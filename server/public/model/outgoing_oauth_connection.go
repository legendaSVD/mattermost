package model
import (
	"fmt"
	"net/http"
	"net/url"
	"unicode/utf8"
)
type OutgoingOAuthConnectionGrantType string
func (gt OutgoingOAuthConnectionGrantType) IsValid() bool {
	return gt == OutgoingOAuthConnectionGrantTypeClientCredentials || gt == OutgoingOAuthConnectionGrantTypePassword
}
const (
	OutgoingOAuthConnectionGrantTypeClientCredentials OutgoingOAuthConnectionGrantType = "client_credentials"
	OutgoingOAuthConnectionGrantTypePassword          OutgoingOAuthConnectionGrantType = "password"
	defaultGetConnectionsLimit = 50
)
type OutgoingOAuthConnection struct {
	Id                  string                           `json:"id"`
	CreatorId           string                           `json:"creator_id"`
	CreateAt            int64                            `json:"create_at"`
	UpdateAt            int64                            `json:"update_at"`
	Name                string                           `json:"name"`
	ClientId            string                           `json:"client_id,omitempty"`
	ClientSecret        string                           `json:"client_secret,omitempty"`
	CredentialsUsername *string                          `json:"credentials_username,omitempty"`
	CredentialsPassword *string                          `json:"credentials_password,omitempty"`
	OAuthTokenURL       string                           `json:"oauth_token_url"`
	GrantType           OutgoingOAuthConnectionGrantType `json:"grant_type"`
	Audiences           StringArray                      `json:"audiences"`
}
func (oa *OutgoingOAuthConnection) Auditable() map[string]any {
	return map[string]any{
		"id":         oa.Id,
		"creator_id": oa.CreatorId,
		"create_at":  oa.CreateAt,
		"update_at":  oa.UpdateAt,
		"name":       oa.Name,
		"grant_type": oa.GrantType,
	}
}
func (oa *OutgoingOAuthConnection) Sanitize() {
	oa.ClientSecret = ""
	oa.CredentialsPassword = nil
}
func (oa *OutgoingOAuthConnection) Patch(conn *OutgoingOAuthConnection) {
	if conn == nil {
		return
	}
	if conn.Name != "" {
		oa.Name = conn.Name
	}
	if conn.ClientId != "" {
		oa.ClientId = conn.ClientId
	}
	if conn.ClientSecret != "" {
		oa.ClientSecret = conn.ClientSecret
	}
	if conn.OAuthTokenURL != "" {
		oa.OAuthTokenURL = conn.OAuthTokenURL
	}
	if conn.GrantType != "" {
		oa.GrantType = conn.GrantType
	}
	if len(conn.Audiences) > 0 {
		oa.Audiences = conn.Audiences
	}
	if conn.CredentialsUsername != nil {
		oa.CredentialsUsername = conn.CredentialsUsername
	}
	if conn.CredentialsPassword != nil {
		oa.CredentialsPassword = conn.CredentialsPassword
	}
}
func (oa *OutgoingOAuthConnection) IsValid() *AppError {
	if !IsValidId(oa.Id) {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.id.error", nil, "", http.StatusBadRequest)
	}
	if oa.CreateAt == 0 {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.create_at.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if oa.UpdateAt == 0 {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.update_at.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if !IsValidId(oa.CreatorId) {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.creator_id.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if oa.Name == "" || utf8.RuneCountInString(oa.Name) > 64 {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.name.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if oa.ClientId == "" || utf8.RuneCountInString(oa.ClientId) > 255 {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.client_id.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if oa.ClientSecret == "" || utf8.RuneCountInString(oa.ClientSecret) > 255 {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.client_secret.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if !IsValidHTTPURL(oa.OAuthTokenURL) || utf8.RuneCountInString(oa.OAuthTokenURL) > 256 {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.oauth_token_url.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if err := oa.HasValidGrantType(); err != nil {
		return err
	}
	if len(oa.Audiences) == 0 {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.audience.empty", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if len(oa.Audiences) > 0 {
		for _, audience := range oa.Audiences {
			if !IsValidHTTPURL(audience) {
				return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.audience.error", map[string]any{"Url": audience}, "id="+oa.Id, http.StatusBadRequest)
			}
		}
	}
	return nil
}
func (oa *OutgoingOAuthConnection) HasValidGrantType() *AppError {
	if !oa.GrantType.IsValid() {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.grant_type.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if oa.GrantType == OutgoingOAuthConnectionGrantTypePassword && (oa.CredentialsUsername == nil || oa.CredentialsPassword == nil) {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.password_credentials.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	if oa.GrantType == OutgoingOAuthConnectionGrantTypePassword && (*oa.CredentialsUsername == "" || *oa.CredentialsPassword == "") {
		return NewAppError("OutgoingOAuthConnection.IsValid", "model.outgoing_oauth_connection.is_valid.password_credentials.error", nil, "id="+oa.Id, http.StatusBadRequest)
	}
	return nil
}
func (oa *OutgoingOAuthConnection) PreSave() {
	if oa.Id == "" {
		oa.Id = NewId()
	}
	oa.CreateAt = GetMillis()
	oa.UpdateAt = oa.CreateAt
}
func (oa *OutgoingOAuthConnection) PreUpdate() {
	oa.UpdateAt = GetMillis()
}
func (oa *OutgoingOAuthConnection) Etag() string {
	return Etag(oa.Id, oa.UpdateAt)
}
type OutgoingOAuthConnectionGetConnectionsFilter struct {
	OffsetId string
	Limit    int
	Audience string
	TeamId string
}
func (oaf *OutgoingOAuthConnectionGetConnectionsFilter) SetDefaults() {
	if oaf.Limit == 0 {
		oaf.Limit = defaultGetConnectionsLimit
	}
}
func (oaf *OutgoingOAuthConnectionGetConnectionsFilter) ToURLValues() url.Values {
	v := url.Values{}
	if oaf.Limit > 0 {
		v.Set("limit", fmt.Sprintf("%d", oaf.Limit))
	}
	if oaf.OffsetId != "" {
		v.Set("offset_id", oaf.OffsetId)
	}
	if oaf.Audience != "" {
		v.Set("audience", oaf.Audience)
	}
	if oaf.TeamId != "" {
		v.Set("team_id", oaf.TeamId)
	}
	return v
}
type OutgoingOAuthConnectionToken struct {
	AccessToken string
	TokenType   string
}
func (ooct *OutgoingOAuthConnectionToken) AsHeaderValue() string {
	return ooct.TokenType + " " + ooct.AccessToken
}