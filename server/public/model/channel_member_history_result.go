package model
type ChannelMemberHistoryResult struct {
	ChannelId string
	UserId    string
	JoinTime  int64
	LeaveTime *int64
	UserEmail    string `db:"Email"`
	Username     string
	IsBot        bool
	UserDeleteAt int64
}