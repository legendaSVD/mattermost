package model
const UserSearchMaxLimit = 1000
const UserSearchDefaultLimit = 100
type UserSearch struct {
	Term             string   `json:"term"`
	TeamId           string   `json:"team_id"`
	NotInTeamId      string   `json:"not_in_team_id"`
	InChannelId      string   `json:"in_channel_id"`
	NotInChannelId   string   `json:"not_in_channel_id"`
	InGroupId        string   `json:"in_group_id"`
	GroupConstrained bool     `json:"group_constrained"`
	AllowInactive    bool     `json:"allow_inactive"`
	WithoutTeam      bool     `json:"without_team"`
	Limit            int      `json:"limit"`
	Role             string   `json:"role"`
	Roles            []string `json:"roles"`
	ChannelRoles     []string `json:"channel_roles"`
	TeamRoles        []string `json:"team_roles"`
	NotInGroupId     string   `json:"not_in_group_id"`
}
type UserSearchOptions struct {
	IsAdmin bool
	AllowEmails bool
	AllowFullNames bool
	AllowInactive bool
	GroupConstrained bool
	Limit int
	Role string
	Roles []string
	ChannelRoles []string
	TeamRoles []string
	ViewRestrictions *ViewUsersRestrictions
	ListOfAllowedChannels []string
}