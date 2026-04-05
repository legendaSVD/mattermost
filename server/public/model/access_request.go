package model
type Subject struct {
	ID string `json:"id"`
	Type string `json:"type"`
	Attributes map[string]any `json:"attributes"`
}
type SubjectSearchOptions struct {
	Term   string `json:"term"`
	TeamID string `json:"team_id"`
	Query         string        `json:"query"`
	Args          []any         `json:"args"`
	Limit         int           `json:"limit"`
	Cursor        SubjectCursor `json:"cursor"`
	AllowInactive bool          `json:"allow_inactive"`
	IgnoreCount   bool          `json:"ignore_count"`
	ExcludeChannelMembers string `json:"exclude_members"`
	SubjectID string `json:"subject_id"`
}
type SubjectCursor struct {
	TargetID string `json:"target_id"`
}
type Resource struct {
	ID string `json:"id"`
	Type string `json:"type"`
}
type AccessRequest struct {
	Subject  Subject        `json:"subject"`
	Resource Resource       `json:"resource"`
	Action   string         `json:"action"`
	Context  map[string]any `json:"context,omitempty"`
}
type AccessDecision struct {
	Decision bool           `json:"decision"`
	Context  map[string]any `json:"context,omitempty"`
}
type QueryExpressionParams struct {
	Expression string `json:"expression"`
	Term       string `json:"term"`
	Limit      int    `json:"limit"`
	After      string `json:"after"`
	ChannelId  string `json:"channelId,omitempty"`
}