package model
type ServerLimits struct {
	MaxUsersLimit           int64 `json:"maxUsersLimit"`
	MaxUsersHardLimit       int64 `json:"maxUsersHardLimit"`
	ActiveUserCount         int64 `json:"activeUserCount"`
	SingleChannelGuestCount int64 `json:"singleChannelGuestCount"`
	SingleChannelGuestLimit int64 `json:"singleChannelGuestLimit"`
	PostHistoryLimit        int64 `json:"postHistoryLimit"`
	LastAccessiblePostTime  int64 `json:"lastAccessiblePostTime"`
}