package model
import (
	"encoding/json"
	"net/http"
	"unicode/utf8"
	"github.com/pkg/errors"
)
const (
	UserPropsKeyRemoteUsername   = "RemoteUsername"
	UserPropsKeyRemoteEmail      = "RemoteEmail"
	UserPropsKeyOriginalRemoteId = "OriginalRemoteId"
	UserOriginalRemoteIdUnknown  = "UNKNOWN"
)
var (
	ErrChannelAlreadyShared = errors.New("channel is already shared")
	ErrChannelHomedOnRemote = errors.New("channel is homed on a remote cluster")
	ErrChannelAlreadyExists = errors.New("channel already exists")
)
type SharedChannel struct {
	ChannelId        string      `json:"id"`
	TeamId           string      `json:"team_id"`
	Home             bool        `json:"home"`
	ReadOnly         bool        `json:"readonly"`
	ShareName        string      `json:"name"`
	ShareDisplayName string      `json:"display_name"`
	SharePurpose     string      `json:"purpose"`
	ShareHeader      string      `json:"header"`
	CreatorId        string      `json:"creator_id"`
	CreateAt         int64       `json:"create_at"`
	UpdateAt         int64       `json:"update_at"`
	RemoteId         string      `json:"remote_id,omitempty"`
	Type             ChannelType `db:"-"`
}
func (sc *SharedChannel) IsValid() *AppError {
	if !IsValidId(sc.ChannelId) {
		return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.id.app_error", nil, "ChannelId="+sc.ChannelId, http.StatusBadRequest)
	}
	if sc.Type != ChannelTypeDirect && sc.Type != ChannelTypeGroup && !IsValidId(sc.TeamId) {
		return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.id.app_error", nil, "TeamId="+sc.TeamId, http.StatusBadRequest)
	}
	if sc.CreateAt == 0 {
		return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.create_at.app_error", nil, "id="+sc.ChannelId, http.StatusBadRequest)
	}
	if sc.UpdateAt == 0 {
		return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.update_at.app_error", nil, "id="+sc.ChannelId, http.StatusBadRequest)
	}
	if utf8.RuneCountInString(sc.ShareDisplayName) > ChannelDisplayNameMaxRunes {
		return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.display_name.app_error", nil, "id="+sc.ChannelId, http.StatusBadRequest)
	}
	if !IsValidChannelIdentifier(sc.ShareName) {
		return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.1_or_more.app_error", nil, "id="+sc.ChannelId, http.StatusBadRequest)
	}
	if utf8.RuneCountInString(sc.ShareHeader) > ChannelHeaderMaxRunes {
		return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.header.app_error", nil, "id="+sc.ChannelId, http.StatusBadRequest)
	}
	if utf8.RuneCountInString(sc.SharePurpose) > ChannelPurposeMaxRunes {
		return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.purpose.app_error", nil, "id="+sc.ChannelId, http.StatusBadRequest)
	}
	if !IsValidId(sc.CreatorId) {
		return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.creator_id.app_error", nil, "CreatorId="+sc.CreatorId, http.StatusBadRequest)
	}
	if !sc.Home {
		if !IsValidId(sc.RemoteId) {
			return NewAppError("SharedChannel.IsValid", "model.channel.is_valid.id.app_error", nil, "RemoteId="+sc.RemoteId, http.StatusBadRequest)
		}
	}
	return nil
}
func (sc *SharedChannel) PreSave() {
	sc.ShareName = SanitizeUnicode(sc.ShareName)
	sc.ShareDisplayName = SanitizeUnicode(sc.ShareDisplayName)
	sc.CreateAt = GetMillis()
	sc.UpdateAt = sc.CreateAt
}
func (sc *SharedChannel) PreUpdate() {
	sc.UpdateAt = GetMillis()
	sc.ShareName = SanitizeUnicode(sc.ShareName)
	sc.ShareDisplayName = SanitizeUnicode(sc.ShareDisplayName)
}
type SharedChannelRemote struct {
	Id                string `json:"id"`
	ChannelId         string `json:"channel_id"`
	CreatorId         string `json:"creator_id"`
	CreateAt          int64  `json:"create_at"`
	UpdateAt          int64  `json:"update_at"`
	DeleteAt          int64  `json:"delete_at"`
	IsInviteAccepted  bool   `json:"is_invite_accepted"`
	IsInviteConfirmed bool   `json:"is_invite_confirmed"`
	RemoteId          string `json:"remote_id"`
	LastPostUpdateAt  int64  `json:"last_post_update_at"`
	LastPostUpdateID  string `json:"last_post_id"`
	LastPostCreateAt  int64  `json:"last_post_create_at"`
	LastPostCreateID  string `json:"last_post_create_id"`
	LastMembersSyncAt int64  `json:"last_members_sync_at"`
}
func (sc *SharedChannelRemote) IsValid() *AppError {
	if !IsValidId(sc.Id) {
		return NewAppError("SharedChannelRemote.IsValid", "model.channel.is_valid.id.app_error", nil, "Id="+sc.Id, http.StatusBadRequest)
	}
	if !IsValidId(sc.ChannelId) {
		return NewAppError("SharedChannelRemote.IsValid", "model.channel.is_valid.id.app_error", nil, "ChannelId="+sc.ChannelId, http.StatusBadRequest)
	}
	if sc.CreateAt == 0 {
		return NewAppError("SharedChannelRemote.IsValid", "model.channel.is_valid.create_at.app_error", nil, "id="+sc.ChannelId, http.StatusBadRequest)
	}
	if sc.UpdateAt == 0 {
		return NewAppError("SharedChannelRemote.IsValid", "model.channel.is_valid.update_at.app_error", nil, "id="+sc.ChannelId, http.StatusBadRequest)
	}
	if !IsValidId(sc.CreatorId) {
		return NewAppError("SharedChannelRemote.IsValid", "model.channel.is_valid.creator_id.app_error", nil, "id="+sc.CreatorId, http.StatusBadRequest)
	}
	return nil
}
func (sc *SharedChannelRemote) PreSave() {
	if sc.Id == "" {
		sc.Id = NewId()
	}
	sc.CreateAt = GetMillis()
	sc.UpdateAt = sc.CreateAt
}
func (sc *SharedChannelRemote) PreUpdate() {
	sc.UpdateAt = GetMillis()
}
type SharedChannelRemoteStatus struct {
	ChannelId        string `json:"channel_id"`
	DisplayName      string `json:"display_name"`
	SiteURL          string `json:"site_url"`
	LastPingAt       int64  `json:"last_ping_at"`
	NextSyncAt       int64  `json:"next_sync_at"`
	ReadOnly         bool   `json:"readonly"`
	IsInviteAccepted bool   `json:"is_invite_accepted"`
	Token            string `json:"token"`
}
type SharedChannelUser struct {
	Id         string `json:"id"`
	UserId     string `json:"user_id"`
	ChannelId  string `json:"channel_id"`
	RemoteId   string `json:"remote_id"`
	CreateAt   int64  `json:"create_at"`
	LastSyncAt int64  `json:"last_sync_at"`
}
func (scu *SharedChannelUser) PreSave() {
	scu.Id = NewId()
	scu.CreateAt = GetMillis()
}
func (scu *SharedChannelUser) IsValid() *AppError {
	if !IsValidId(scu.Id) {
		return NewAppError("SharedChannelUser.IsValid", "model.channel.is_valid.id.app_error", nil, "Id="+scu.Id, http.StatusBadRequest)
	}
	if !IsValidId(scu.UserId) {
		return NewAppError("SharedChannelUser.IsValid", "model.channel.is_valid.id.app_error", nil, "UserId="+scu.UserId, http.StatusBadRequest)
	}
	if !IsValidId(scu.ChannelId) {
		return NewAppError("SharedChannelUser.IsValid", "model.channel.is_valid.id.app_error", nil, "ChannelId="+scu.ChannelId, http.StatusBadRequest)
	}
	if !IsValidId(scu.RemoteId) {
		return NewAppError("SharedChannelUser.IsValid", "model.channel.is_valid.id.app_error", nil, "RemoteId="+scu.RemoteId, http.StatusBadRequest)
	}
	if scu.CreateAt == 0 {
		return NewAppError("SharedChannelUser.IsValid", "model.channel.is_valid.create_at.app_error", nil, "", http.StatusBadRequest)
	}
	return nil
}
type GetUsersForSyncFilter struct {
	CheckProfileImage bool
	ChannelID         string
	Limit             uint64
}
type SharedChannelAttachment struct {
	Id         string `json:"id"`
	FileId     string `json:"file_id"`
	RemoteId   string `json:"remote_id"`
	CreateAt   int64  `json:"create_at"`
	LastSyncAt int64  `json:"last_sync_at"`
}
func (scf *SharedChannelAttachment) PreSave() {
	if scf.Id == "" {
		scf.Id = NewId()
	}
	if scf.CreateAt == 0 {
		scf.CreateAt = GetMillis()
		scf.LastSyncAt = scf.CreateAt
	} else {
		scf.LastSyncAt = GetMillis()
	}
}
func (scf *SharedChannelAttachment) IsValid() *AppError {
	if !IsValidId(scf.Id) {
		return NewAppError("SharedChannelAttachment.IsValid", "model.channel.is_valid.id.app_error", nil, "Id="+scf.Id, http.StatusBadRequest)
	}
	if !IsValidId(scf.FileId) {
		return NewAppError("SharedChannelAttachment.IsValid", "model.channel.is_valid.id.app_error", nil, "FileId="+scf.FileId, http.StatusBadRequest)
	}
	if !IsValidId(scf.RemoteId) {
		return NewAppError("SharedChannelAttachment.IsValid", "model.channel.is_valid.id.app_error", nil, "RemoteId="+scf.RemoteId, http.StatusBadRequest)
	}
	if scf.CreateAt == 0 {
		return NewAppError("SharedChannelAttachment.IsValid", "model.channel.is_valid.create_at.app_error", nil, "", http.StatusBadRequest)
	}
	return nil
}
type SharedChannelFilterOpts struct {
	TeamId        string
	CreatorId     string
	MemberId      string
	ExcludeHome   bool
	ExcludeRemote bool
}
type SharedChannelRemoteFilterOpts struct {
	ChannelId          string
	RemoteId           string
	IncludeUnconfirmed bool
	ExcludeConfirmed   bool
	ExcludeHome        bool
	ExcludeRemote      bool
	IncludeDeleted     bool
}
type MembershipChangeMsg struct {
	ChannelId  string `json:"channel_id"`
	UserId     string `json:"user_id"`
	IsAdd      bool   `json:"is_add"`
	RemoteId   string `json:"remote_id"`
	ChangeTime int64  `json:"change_time"`
}
type SyncMsg struct {
	Id                string                 `json:"id"`
	ChannelId         string                 `json:"channel_id"`
	Users             map[string]*User       `json:"users,omitempty"`
	Posts             []*Post                `json:"posts,omitempty"`
	Reactions         []*Reaction            `json:"reactions,omitempty"`
	Statuses          []*Status              `json:"statuses,omitempty"`
	MembershipChanges []*MembershipChangeMsg `json:"membership_changes,omitempty"`
	Acknowledgements  []*PostAcknowledgement `json:"acknowledgements,omitempty"`
	MentionTransforms map[string]string      `json:"mention_transforms,omitempty"`
}
func NewSyncMsg(channelID string) *SyncMsg {
	return &SyncMsg{
		Id:        NewId(),
		ChannelId: channelID,
	}
}
func (sm *SyncMsg) ToJSON() ([]byte, error) {
	b, err := json.Marshal(sm)
	if err != nil {
		return nil, err
	}
	return b, nil
}
func (sm *SyncMsg) String() string {
	json, err := sm.ToJSON()
	if err != nil {
		return ""
	}
	return string(json)
}
type SyncResponse struct {
	UsersLastUpdateAt int64    `json:"users_last_update_at"`
	UserErrors        []string `json:"user_errors"`
	UsersSyncd        []string `json:"users_syncd"`
	PostsLastUpdateAt int64    `json:"posts_last_update_at"`
	PostErrors        []string `json:"post_errors"`
	ReactionsLastUpdateAt int64    `json:"reactions_last_update_at"`
	ReactionErrors        []string `json:"reaction_errors"`
	AcknowledgementsLastUpdateAt int64    `json:"acknowledgements_last_update_at"`
	AcknowledgementErrors        []string `json:"acknowledgement_errors"`
	StatusErrors []string `json:"status_errors"`
	MembershipErrors []string `json:"membership_errors,omitempty"`
}
type RegisterPluginOpts struct {
	Displayname  string
	PluginID     string
	CreatorID    string
	AutoShareDMs bool
	AutoInvited  bool
}
func (po RegisterPluginOpts) GetOptionFlags() Bitmask {
	var flags Bitmask
	if po.AutoShareDMs {
		flags |= BitflagOptionAutoShareDMs
	}
	if po.AutoInvited {
		flags |= BitflagOptionAutoInvited
	}
	return flags
}