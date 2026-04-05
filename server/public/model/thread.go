package model
import "net/http"
type Thread struct {
	PostId string `json:"id"`
	ChannelId string `json:"channel_id"`
	ReplyCount int64 `json:"reply_count"`
	LastReplyAt int64 `json:"last_reply_at"`
	Participants StringArray `json:"participants"`
	DeleteAt int64 `json:"delete_at"`
	TeamId string `json:"team_id"`
}
type ThreadResponse struct {
	PostId         string  `json:"id"`
	ReplyCount     int64   `json:"reply_count"`
	LastReplyAt    int64   `json:"last_reply_at"`
	LastViewedAt   int64   `json:"last_viewed_at"`
	Participants   []*User `json:"participants"`
	Post           *Post   `json:"post"`
	UnreadReplies  int64   `json:"unread_replies"`
	UnreadMentions int64   `json:"unread_mentions"`
	IsUrgent       bool    `json:"is_urgent"`
	DeleteAt       int64   `json:"delete_at"`
}
type Threads struct {
	Total                     int64             `json:"total"`
	TotalUnreadThreads        int64             `json:"total_unread_threads"`
	TotalUnreadMentions       int64             `json:"total_unread_mentions"`
	TotalUnreadUrgentMentions int64             `json:"total_unread_urgent_mentions"`
	Threads                   []*ThreadResponse `json:"threads"`
}
type GetUserThreadsOpts struct {
	PageSize uint64
	Extended bool
	Deleted bool
	Since uint64
	Before string
	After string
	Unread bool
	TotalsOnly bool
	ThreadsOnly bool
	TeamOnly bool
	IncludeIsUrgent bool
	ExcludeDirect bool
}
func (o *Thread) Etag() string {
	return Etag(o.PostId, o.LastReplyAt)
}
type ThreadMembership struct {
	PostId string `json:"post_id"`
	UserId string `json:"user_id"`
	Following bool `json:"following"`
	LastUpdated int64 `json:"last_update_at"`
	LastViewed int64 `json:"last_view_at"`
	UnreadMentions int64 `json:"unread_mentions"`
}
func (o *ThreadMembership) IsValid() *AppError {
	if !IsValidId(o.PostId) {
		return NewAppError("ThreadMembership.IsValid", "model.thread.is_valid.post_id.app_error", nil, "", http.StatusBadRequest)
	}
	if !IsValidId(o.UserId) {
		return NewAppError("ThreadMembership.IsValid", "model.thread.is_valid.user_id.app_error", nil, "", http.StatusBadRequest)
	}
	return nil
}
type ThreadMembershipForExport struct {
	Username       string `json:"user_name"`
	LastViewed     int64  `json:"last_viewed"`
	UnreadMentions int64  `json:"unread_mentions"`
}