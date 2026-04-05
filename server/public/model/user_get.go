package model
type UserGetOptions struct {
	InTeamId string
	NotInTeamId string
	InChannelId string
	NotInChannelId string
	InGroupId string
	NotInGroupId string
	GroupConstrained bool
	WithoutTeam bool
	Inactive bool
	Active bool
	Role string
	Roles []string
	ChannelRoles []string
	TeamRoles []string
	Sort string
	ViewRestrictions *ViewUsersRestrictions
	Page int
	PerPage int
	UpdatedAfter int64
}
type UserGetByIdsOptions struct {
	Since int64
}