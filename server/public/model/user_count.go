package model
type UserCountOptions struct {
	IncludeBotAccounts bool
	IncludeDeleted bool
	IncludeRemoteUsers bool
	ExcludeRegularUsers bool
	TeamId string
	ChannelId string
	ViewRestrictions *ViewUsersRestrictions
	Roles []string
	ChannelRoles []string
	TeamRoles []string
}