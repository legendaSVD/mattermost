package model
import (
	"fmt"
	"net/http"
	"strings"
)
const (
	USERNAME = "Username"
)
type TeamMember struct {
	TeamId        string `json:"team_id"`
	UserId        string `json:"user_id"`
	Roles         string `json:"roles"`
	DeleteAt      int64  `json:"delete_at"`
	SchemeGuest   bool   `json:"scheme_guest"`
	SchemeUser    bool   `json:"scheme_user"`
	SchemeAdmin   bool   `json:"scheme_admin"`
	ExplicitRoles string `json:"explicit_roles"`
	CreateAt      int64  `json:"-"`
}
func (o *TeamMember) Auditable() map[string]any {
	return map[string]any{
		"team_id":        o.TeamId,
		"user_id":        o.UserId,
		"roles":          o.Roles,
		"delete_at":      o.DeleteAt,
		"scheme_guest":   o.SchemeGuest,
		"scheme_user":    o.SchemeUser,
		"scheme_admin":   o.SchemeAdmin,
		"explicit_roles": o.ExplicitRoles,
		"create_at":      o.CreateAt,
	}
}
type TeamUnread struct {
	TeamId                   string `json:"team_id"`
	MsgCount                 int64  `json:"msg_count"`
	MentionCount             int64  `json:"mention_count"`
	MentionCountRoot         int64  `json:"mention_count_root"`
	MsgCountRoot             int64  `json:"msg_count_root"`
	ThreadCount              int64  `json:"thread_count"`
	ThreadMentionCount       int64  `json:"thread_mention_count"`
	ThreadUrgentMentionCount int64  `json:"thread_urgent_mention_count"`
}
type TeamMemberForExport struct {
	TeamMember
	TeamName string
}
type TeamMemberWithError struct {
	UserId string      `json:"user_id"`
	Member *TeamMember `json:"member"`
	Error  *AppError   `json:"error"`
}
type EmailInviteWithError struct {
	Email string    `json:"email"`
	Error *AppError `json:"error"`
}
type TeamMembersGetOptions struct {
	Sort string
	ExcludeDeletedUsers bool
	ViewRestrictions *ViewUsersRestrictions
}
type TeamInviteReminderData struct {
	Interval string
}
func EmailInviteWithErrorToEmails(o []*EmailInviteWithError) []string {
	var ret []string
	for _, o := range o {
		if o.Error == nil {
			ret = append(ret, o.Email)
		}
	}
	return ret
}
func EmailInviteWithErrorToString(o *EmailInviteWithError) string {
	return fmt.Sprintf("%s:%s", o.Email, o.Error.Error())
}
func TeamMembersWithErrorToTeamMembers(o []*TeamMemberWithError) []*TeamMember {
	var ret []*TeamMember
	for _, o := range o {
		if o.Error == nil {
			ret = append(ret, o.Member)
		}
	}
	return ret
}
func TeamMemberWithErrorToString(o *TeamMemberWithError) string {
	return fmt.Sprintf("%s:%s", o.UserId, o.Error.Error())
}
func (o *TeamMember) IsValid() *AppError {
	if !IsValidId(o.TeamId) {
		return NewAppError("TeamMember.IsValid", "model.team_member.is_valid.team_id.app_error", nil, "", http.StatusBadRequest)
	}
	if !IsValidId(o.UserId) {
		return NewAppError("TeamMember.IsValid", "model.team_member.is_valid.user_id.app_error", nil, "", http.StatusBadRequest)
	}
	if len(o.Roles) > UserRolesMaxLength {
		return NewAppError("TeamMember.IsValid", "model.team_member.is_valid.roles_limit.app_error",
			map[string]any{"Limit": UserRolesMaxLength}, "", http.StatusBadRequest)
	}
	return nil
}
func (o *TeamMember) PreUpdate() {
}
func (o *TeamMember) GetRoles() []string {
	return strings.Fields(o.Roles)
}