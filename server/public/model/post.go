package model
import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"unicode/utf8"
	"github.com/hashicorp/go-multierror"
	"github.com/mattermost/mattermost/server/public/shared/markdown"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
type PostContextKey string
const (
	PostSystemMessagePrefix       = "system_"
	PostTypeDefault               = ""
	PostTypeMessageAttachment     = "slack_attachment"
	PostTypeSystemGeneric         = "system_generic"
	PostTypeJoinLeave             = "system_join_leave"
	PostTypeJoinChannel           = "system_join_channel"
	PostTypeGuestJoinChannel      = "system_guest_join_channel"
	PostTypeLeaveChannel          = "system_leave_channel"
	PostTypeJoinTeam              = "system_join_team"
	PostTypeLeaveTeam             = "system_leave_team"
	PostTypeAutoResponder         = "system_auto_responder"
	PostTypeAutotranslationChange = "system_autotranslation"
	PostTypeAddRemove             = "system_add_remove"
	PostTypeAddToChannel          = "system_add_to_channel"
	PostTypeAddGuestToChannel     = "system_add_guest_to_chan"
	PostTypeRemoveFromChannel     = "system_remove_from_channel"
	PostTypeMoveChannel           = "system_move_channel"
	PostTypeAddToTeam             = "system_add_to_team"
	PostTypeRemoveFromTeam        = "system_remove_from_team"
	PostTypeHeaderChange          = "system_header_change"
	PostTypeDisplaynameChange     = "system_displayname_change"
	PostTypeConvertChannel        = "system_convert_channel"
	PostTypePurposeChange         = "system_purpose_change"
	PostTypeChannelDeleted        = "system_channel_deleted"
	PostTypeChannelRestored       = "system_channel_restored"
	PostTypeEphemeral             = "system_ephemeral"
	PostTypeChangeChannelPrivacy  = "system_change_chan_privacy"
	PostTypeWrangler              = "system_wrangler"
	PostTypeGMConvertedToChannel  = "system_gm_to_channel"
	PostTypeAddBotTeamsChannels   = "add_bot_teams_channels"
	PostTypeMe                    = "me"
	PostCustomTypePrefix          = "custom_"
	PostTypeReminder              = "reminder"
	PostTypeBurnOnRead            = "burn_on_read"
	PostFileidsMaxRunes   = 300
	PostFilenamesMaxRunes = 4000
	PostHashtagsMaxRunes  = 1000
	PostMessageMaxRunesV1 = 4000
	PostMessageMaxBytesV2 = 65535
	PostMessageMaxRunesV2 = PostMessageMaxBytesV2 / 4
	MaxReportingPerPage        = 1000
	ReportingTimeFieldCreateAt = "create_at"
	ReportingTimeFieldUpdateAt = "update_at"
	ReportingSortDirectionAsc  = "asc"
	ReportingSortDirectionDesc = "desc"
	PostPropsMaxRunes          = 800000
	PostPropsMaxUserRunes      = PostPropsMaxRunes - 40000
	PropsAddChannelMember = "add_channel_member"
	PostPropsAddedUserId              = "addedUserId"
	PostPropsDeleteBy                 = "deleteBy"
	PostPropsOverrideIconURL          = "override_icon_url"
	PostPropsOverrideIconEmoji        = "override_icon_emoji"
	PostPropsOverrideUsername         = "override_username"
	PostPropsFromWebhook              = "from_webhook"
	PostPropsFromBot                  = "from_bot"
	PostPropsFromOAuthApp             = "from_oauth_app"
	PostPropsWebhookDisplayName       = "webhook_display_name"
	PostPropsAttachments              = "attachments"
	PostPropsFromPlugin               = "from_plugin"
	PostPropsMentionHighlightDisabled = "mentionHighlightDisabled"
	PostPropsGroupHighlightDisabled   = "disable_group_highlight"
	PostPropsPreviewedPost            = "previewed_post"
	PostPropsForceNotification        = "force_notification"
	PostPropsChannelMentions          = "channel_mentions"
	PostPropsCurrentTeamId            = "current_team_id"
	PostPropsUnsafeLinks              = "unsafe_links"
	PostPropsAIGeneratedByUserID      = "ai_generated_by"
	PostPropsAIGeneratedByUsername    = "ai_generated_by_username"
	PostPropsExpireAt                 = "expire_at"
	PostPropsReadDurationSeconds      = "read_duration"
	PostPriorityUrgent = "urgent"
	DefaultExpirySeconds       = 60 * 60 * 24 * 7
	DefaultReadDurationSeconds = 10 * 60
	PostContextKeyIsScheduledPost PostContextKey = "isScheduledPost"
)
type Post struct {
	Id         string `json:"id"`
	CreateAt   int64  `json:"create_at"`
	UpdateAt   int64  `json:"update_at"`
	EditAt     int64  `json:"edit_at"`
	DeleteAt   int64  `json:"delete_at"`
	IsPinned   bool   `json:"is_pinned"`
	UserId     string `json:"user_id"`
	ChannelId  string `json:"channel_id"`
	RootId     string `json:"root_id"`
	OriginalId string `json:"original_id"`
	Message string `json:"message"`
	MessageSource string `json:"message_source,omitempty"`
	Type          string          `json:"type"`
	propsMu       sync.RWMutex    `db:"-"`
	Props         StringInterface `json:"props"`
	Hashtags      string          `json:"hashtags"`
	Filenames     StringArray     `json:"-"`
	FileIds       StringArray     `json:"file_ids"`
	PendingPostId string          `json:"pending_post_id"`
	HasReactions  bool            `json:"has_reactions,omitempty"`
	RemoteId      *string         `json:"remote_id,omitempty"`
	ReplyCount   int64         `json:"reply_count"`
	LastReplyAt  int64         `json:"last_reply_at"`
	Participants []*User       `json:"participants"`
	IsFollowing  *bool         `json:"is_following,omitempty"`
	Metadata     *PostMetadata `json:"metadata,omitempty"`
}
func (o *Post) Auditable() map[string]any {
	var metaData map[string]any
	if o.Metadata != nil {
		metaData = o.Metadata.Auditable()
	}
	return map[string]any{
		"id":              o.Id,
		"create_at":       o.CreateAt,
		"update_at":       o.UpdateAt,
		"edit_at":         o.EditAt,
		"delete_at":       o.DeleteAt,
		"is_pinned":       o.IsPinned,
		"user_id":         o.UserId,
		"channel_id":      o.ChannelId,
		"root_id":         o.RootId,
		"original_id":     o.OriginalId,
		"type":            o.Type,
		"props":           o.GetProps(),
		"file_ids":        o.FileIds,
		"pending_post_id": o.PendingPostId,
		"remote_id":       o.RemoteId,
		"reply_count":     o.ReplyCount,
		"last_reply_at":   o.LastReplyAt,
		"is_following":    o.IsFollowing,
		"metadata":        metaData,
	}
}
func (o *Post) LogClone() any {
	return o.Auditable()
}
type PostEphemeral struct {
	UserID string `json:"user_id"`
	Post   *Post  `json:"post"`
}
type PostPatch struct {
	IsPinned     *bool            `json:"is_pinned"`
	Message      *string          `json:"message"`
	Props        *StringInterface `json:"props"`
	FileIds      *StringArray     `json:"file_ids"`
	HasReactions *bool            `json:"has_reactions"`
}
type PostReminder struct {
	TargetTime int64 `json:"target_time"`
	PostId string `json:",omitempty"`
	UserId string `json:",omitempty"`
}
type PostPriority struct {
	Priority                *string `json:"priority"`
	RequestedAck            *bool   `json:"requested_ack"`
	PersistentNotifications *bool   `json:"persistent_notifications"`
	PostId    string `json:",omitempty"`
	ChannelId string `json:",omitempty"`
}
type PostPersistentNotifications struct {
	PostId     string
	CreateAt   int64
	LastSentAt int64
	DeleteAt   int64
	SentCount  int16
}
type GetPersistentNotificationsPostsParams struct {
	MaxTime      int64
	MaxSentCount int16
	PerPage      int
}
type MoveThreadParams struct {
	ChannelId string `json:"channel_id"`
}
type SearchParameter struct {
	Terms                  *string `json:"terms"`
	IsOrSearch             *bool   `json:"is_or_search"`
	TimeZoneOffset         *int    `json:"time_zone_offset"`
	Page                   *int    `json:"page"`
	PerPage                *int    `json:"per_page"`
	IncludeDeletedChannels *bool   `json:"include_deleted_channels"`
}
func (sp SearchParameter) Auditable() map[string]any {
	return map[string]any{
		"terms":                    sp.Terms,
		"is_or_search":             sp.IsOrSearch,
		"time_zone_offset":         sp.TimeZoneOffset,
		"page":                     sp.Page,
		"per_page":                 sp.PerPage,
		"include_deleted_channels": sp.IncludeDeletedChannels,
	}
}
func (sp SearchParameter) LogClone() any {
	return sp.Auditable()
}
type AnalyticsPostCountsOptions struct {
	TeamId        string
	BotsOnly      bool
	YesterdayOnly bool
}
func (o *PostPatch) WithRewrittenImageURLs(f func(string) string) *PostPatch {
	pCopy := *o
	if pCopy.Message != nil {
		*pCopy.Message = RewriteImageURLs(*o.Message, f)
	}
	return &pCopy
}
func (o *PostPatch) Auditable() map[string]any {
	return map[string]any{
		"is_pinned":     o.IsPinned,
		"props":         o.Props,
		"file_ids":      o.FileIds,
		"has_reactions": o.HasReactions,
	}
}
type PostForExport struct {
	Post
	TeamName    string
	ChannelName string
	Username    string
	ReplyCount  int
	FlaggedBy   StringArray
}
type DirectPostForExport struct {
	Post
	User           string
	ChannelMembers *[]string
	FlaggedBy      StringArray
}
type ReplyForExport struct {
	Post
	Username  string
	FlaggedBy StringArray
}
type PostForIndexing struct {
	Post
	TeamId         string `json:"team_id"`
	ParentCreateAt *int64 `json:"parent_create_at"`
	ChannelType    string `json:"channel_type"`
}
type FileForIndexing struct {
	FileInfo
	ChannelId string `json:"channel_id"`
	Content   string `json:"content"`
}
func (file *FileForIndexing) ShouldIndex() bool {
	return file != nil && file.DeleteAt == 0 && (file.PostId != "" || file.CreatorId == BookmarkFileOwner)
}
func (o *Post) ShallowCopy(dst *Post) error {
	if dst == nil {
		return errors.New("dst cannot be nil")
	}
	o.propsMu.RLock()
	defer o.propsMu.RUnlock()
	dst.propsMu.Lock()
	defer dst.propsMu.Unlock()
	dst.Id = o.Id
	dst.CreateAt = o.CreateAt
	dst.UpdateAt = o.UpdateAt
	dst.EditAt = o.EditAt
	dst.DeleteAt = o.DeleteAt
	dst.IsPinned = o.IsPinned
	dst.UserId = o.UserId
	dst.ChannelId = o.ChannelId
	dst.RootId = o.RootId
	dst.OriginalId = o.OriginalId
	dst.Message = o.Message
	dst.MessageSource = o.MessageSource
	dst.Type = o.Type
	dst.Props = o.Props
	dst.Hashtags = o.Hashtags
	dst.Filenames = o.Filenames
	dst.FileIds = o.FileIds
	dst.PendingPostId = o.PendingPostId
	dst.HasReactions = o.HasReactions
	dst.ReplyCount = o.ReplyCount
	dst.Participants = o.Participants
	dst.LastReplyAt = o.LastReplyAt
	dst.Metadata = o.Metadata
	if o.IsFollowing != nil {
		dst.IsFollowing = NewPointer(*o.IsFollowing)
	}
	dst.RemoteId = o.RemoteId
	return nil
}
func (o *Post) Clone() *Post {
	pCopy := &Post{}
	o.ShallowCopy(pCopy)
	return pCopy
}
func (o *Post) ToJSON() (string, error) {
	pCopy := o.Clone()
	pCopy.StripActionIntegrations()
	b, err := json.Marshal(pCopy)
	return string(b), err
}
func (o *Post) EncodeJSON(w io.Writer) error {
	o.StripActionIntegrations()
	return json.NewEncoder(w).Encode(o)
}
type CreatePostFlags struct {
	TriggerWebhooks   bool
	SetOnline         bool
	ForceNotification bool
}
type GetPostsSinceOptions struct {
	UserId                   string
	ChannelId                string
	Time                     int64
	SkipFetchThreads         bool
	CollapsedThreads         bool
	CollapsedThreadsExtended bool
	SortAscending            bool
}
type GetPostsSinceForSyncCursor struct {
	LastPostUpdateAt int64
	LastPostUpdateID string
	LastPostCreateAt int64
	LastPostCreateID string
}
func (c GetPostsSinceForSyncCursor) IsEmpty() bool {
	return c.LastPostCreateAt == 0 && c.LastPostCreateID == "" && c.LastPostUpdateAt == 0 && c.LastPostUpdateID == ""
}
type GetPostsSinceForSyncOptions struct {
	ChannelId                         string
	ExcludeRemoteId                   string
	IncludeDeleted                    bool
	SinceCreateAt                     bool
	ExcludeChannelMetadataSystemPosts bool
}
type GetPostsOptions struct {
	UserId                   string
	ChannelId                string
	PostId                   string
	Page                     int
	PerPage                  int
	SkipFetchThreads         bool
	CollapsedThreads         bool
	CollapsedThreadsExtended bool
	FromPost                 string
	FromCreateAt             int64
	FromUpdateAt             int64
	Direction                string
	UpdatesOnly              bool
	IncludeDeleted           bool
	IncludePostPriority      bool
}
type PostCountOptions struct {
	TeamId             string
	MustHaveFile       bool
	MustHaveHashtag    bool
	ExcludeDeleted     bool
	ExcludeSystemPosts bool
	UsersPostsOnly     bool
	AllowFromCache bool
	SincePostID   string
	SinceUpdateAt int64
	UntilUpdateAt int64
}
func (o *Post) Etag() string {
	return Etag(o.Id, o.UpdateAt)
}
func (o *Post) IsValid(maxPostSize int) *AppError {
	if !IsValidId(o.Id) {
		return NewAppError("Post.IsValid", "model.post.is_valid.id.app_error", nil, "", http.StatusBadRequest)
	}
	if o.CreateAt == 0 {
		return NewAppError("Post.IsValid", "model.post.is_valid.create_at.app_error", nil, "id="+o.Id, http.StatusBadRequest)
	}
	if o.UpdateAt == 0 {
		return NewAppError("Post.IsValid", "model.post.is_valid.update_at.app_error", nil, "id="+o.Id, http.StatusBadRequest)
	}
	if !IsValidId(o.UserId) {
		return NewAppError("Post.IsValid", "model.post.is_valid.user_id.app_error", nil, "", http.StatusBadRequest)
	}
	if !IsValidId(o.ChannelId) {
		return NewAppError("Post.IsValid", "model.post.is_valid.channel_id.app_error", nil, "", http.StatusBadRequest)
	}
	if !(IsValidId(o.RootId) || o.RootId == "") {
		return NewAppError("Post.IsValid", "model.post.is_valid.root_id.app_error", nil, "", http.StatusBadRequest)
	}
	if !(len(o.OriginalId) == 26 || o.OriginalId == "") {
		return NewAppError("Post.IsValid", "model.post.is_valid.original_id.app_error", nil, "", http.StatusBadRequest)
	}
	if utf8.RuneCountInString(o.Message) > maxPostSize {
		return NewAppError("Post.IsValid", "model.post.is_valid.message_length.app_error",
			map[string]any{"Length": utf8.RuneCountInString(o.Message), "MaxLength": maxPostSize}, "id="+o.Id, http.StatusBadRequest)
	}
	if utf8.RuneCountInString(o.Hashtags) > PostHashtagsMaxRunes {
		return NewAppError("Post.IsValid", "model.post.is_valid.hashtags.app_error", nil, "id="+o.Id, http.StatusBadRequest)
	}
	switch o.Type {
	case
		PostTypeDefault,
		PostTypeSystemGeneric,
		PostTypeJoinLeave,
		PostTypeAutoResponder,
		PostTypeAddRemove,
		PostTypeJoinChannel,
		PostTypeGuestJoinChannel,
		PostTypeLeaveChannel,
		PostTypeJoinTeam,
		PostTypeLeaveTeam,
		PostTypeAddToChannel,
		PostTypeAddGuestToChannel,
		PostTypeRemoveFromChannel,
		PostTypeMoveChannel,
		PostTypeAddToTeam,
		PostTypeRemoveFromTeam,
		PostTypeMessageAttachment,
		PostTypeHeaderChange,
		PostTypePurposeChange,
		PostTypeDisplaynameChange,
		PostTypeConvertChannel,
		PostTypeChannelDeleted,
		PostTypeChannelRestored,
		PostTypeChangeChannelPrivacy,
		PostTypeAddBotTeamsChannels,
		PostTypeReminder,
		PostTypeMe,
		PostTypeWrangler,
		PostTypeGMConvertedToChannel,
		PostTypeAutotranslationChange,
		PostTypeBurnOnRead:
	default:
		if !strings.HasPrefix(o.Type, PostCustomTypePrefix) {
			return NewAppError("Post.IsValid", "model.post.is_valid.type.app_error", nil, "id="+o.Type, http.StatusBadRequest)
		}
	}
	if utf8.RuneCountInString(ArrayToJSON(o.Filenames)) > PostFilenamesMaxRunes {
		return NewAppError("Post.IsValid", "model.post.is_valid.filenames.app_error", nil, "id="+o.Id, http.StatusBadRequest)
	}
	if utf8.RuneCountInString(ArrayToJSON(o.FileIds)) > PostFileidsMaxRunes {
		return NewAppError("Post.IsValid", "model.post.is_valid.file_ids.app_error", nil, "id="+o.Id, http.StatusBadRequest)
	}
	if utf8.RuneCountInString(StringInterfaceToJSON(o.GetProps())) > PostPropsMaxRunes {
		return NewAppError("Post.IsValid", "model.post.is_valid.props.app_error", nil, "id="+o.Id, http.StatusBadRequest)
	}
	return nil
}
func (o *Post) SanitizeProps() {
	if o == nil {
		return
	}
	membersToSanitize := []string{
		PropsAddChannelMember,
		PostPropsForceNotification,
	}
	for _, member := range membersToSanitize {
		if _, ok := o.GetProps()[member]; ok {
			o.DelProp(member)
		}
	}
	for _, p := range o.Participants {
		p.Sanitize(map[string]bool{})
	}
}
func (o *Post) SanitizeInput() {
	o.DeleteAt = 0
	o.RemoteId = NewPointer("")
	if o.Metadata != nil {
		o.Metadata.Embeds = nil
	}
}
func (o *Post) ContainsIntegrationsReservedProps() []string {
	return ContainsIntegrationsReservedProps(o.GetProps())
}
func (o *PostPatch) ContainsIntegrationsReservedProps() []string {
	if o == nil || o.Props == nil {
		return nil
	}
	return ContainsIntegrationsReservedProps(*o.Props)
}
func ContainsIntegrationsReservedProps(props StringInterface) []string {
	foundProps := []string{}
	if props != nil {
		reservedProps := []string{
			PostPropsFromWebhook,
			PostPropsOverrideUsername,
			PostPropsWebhookDisplayName,
			PostPropsOverrideIconURL,
			PostPropsOverrideIconEmoji,
		}
		for _, key := range reservedProps {
			if _, ok := props[key]; ok {
				foundProps = append(foundProps, key)
			}
		}
	}
	return foundProps
}
func (o *Post) PreSave() {
	if o.Id == "" {
		o.Id = NewId()
	}
	o.OriginalId = ""
	if o.CreateAt == 0 {
		o.CreateAt = GetMillis()
	}
	o.UpdateAt = o.CreateAt
	o.PreCommit()
}
func (o *Post) PreCommit() {
	if o.GetProps() == nil {
		o.SetProps(make(map[string]any))
	}
	if o.Filenames == nil {
		o.Filenames = []string{}
	}
	if o.FileIds == nil {
		o.FileIds = []string{}
	}
	o.GenerateActionIds()
	o.FileIds = RemoveDuplicateStrings(o.FileIds)
}
func (o *Post) MakeNonNil() {
	if o.GetProps() == nil {
		o.SetProps(make(map[string]any))
	}
}
func (o *Post) DelProp(key string) {
	o.propsMu.Lock()
	defer o.propsMu.Unlock()
	propsCopy := make(map[string]any, len(o.Props)-1)
	maps.Copy(propsCopy, o.Props)
	delete(propsCopy, key)
	o.Props = propsCopy
}
func (o *Post) AddProp(key string, value any) {
	o.propsMu.Lock()
	defer o.propsMu.Unlock()
	propsCopy := make(map[string]any, len(o.Props)+1)
	maps.Copy(propsCopy, o.Props)
	propsCopy[key] = value
	o.Props = propsCopy
}
func (o *Post) GetProps() StringInterface {
	o.propsMu.RLock()
	defer o.propsMu.RUnlock()
	return o.Props
}
func (o *Post) SetProps(props StringInterface) {
	o.propsMu.Lock()
	defer o.propsMu.Unlock()
	o.Props = props
}
func (o *Post) GetProp(key string) any {
	o.propsMu.RLock()
	defer o.propsMu.RUnlock()
	return o.Props[key]
}
func (o *Post) ValidateProps(logger mlog.LoggerIFace) {
	if err := o.propsIsValid(); err != nil {
		logger.Warn(
			"Invalid post props. In a future version this will result in an error. Please update your integration to be compliant.",
			mlog.String("post_id", o.Id),
			mlog.Err(err),
		)
	}
}
func (o *Post) propsIsValid() error {
	var multiErr *multierror.Error
	props := o.GetProps()
	if props == nil {
		return nil
	}
	if props[PostPropsAddedUserId] != nil {
		if addedUserID, ok := props[PostPropsAddedUserId].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("added_user_id prop must be a string"))
		} else if !IsValidId(addedUserID) {
			multiErr = multierror.Append(multiErr, fmt.Errorf("added_user_id prop must be a valid user ID"))
		}
	}
	if props[PostPropsDeleteBy] != nil {
		if deleteByID, ok := props[PostPropsDeleteBy].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("delete_by prop must be a string"))
		} else if !IsValidId(deleteByID) {
			multiErr = multierror.Append(multiErr, fmt.Errorf("delete_by prop must be a valid user ID"))
		}
	}
	if props[PostPropsOverrideIconURL] != nil {
		if iconURL, ok := props[PostPropsOverrideIconURL].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("override_icon_url prop must be a string"))
		} else if iconURL == "" || !IsValidHTTPURL(iconURL) {
			multiErr = multierror.Append(multiErr, fmt.Errorf("override_icon_url prop must be a valid URL"))
		}
	}
	if props[PostPropsOverrideIconEmoji] != nil {
		if _, ok := props[PostPropsOverrideIconEmoji].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("override_icon_emoji prop must be a string"))
		}
	}
	if props[PostPropsOverrideUsername] != nil {
		if _, ok := props[PostPropsOverrideUsername].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("override_username prop must be a string"))
		}
	}
	if props[PostPropsFromWebhook] != nil {
		if fromWebhook, ok := props[PostPropsFromWebhook].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("from_webhook prop must be a string"))
		} else if fromWebhook != "true" {
			multiErr = multierror.Append(multiErr, fmt.Errorf("from_webhook prop must be \"true\""))
		}
	}
	if props[PostPropsFromBot] != nil {
		if fromBot, ok := props[PostPropsFromBot].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("from_bot prop must be a string"))
		} else if fromBot != "true" {
			multiErr = multierror.Append(multiErr, fmt.Errorf("from_bot prop must be \"true\""))
		}
	}
	if props[PostPropsFromOAuthApp] != nil {
		if fromOAuthApp, ok := props[PostPropsFromOAuthApp].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("from_oauth_app prop must be a string"))
		} else if fromOAuthApp != "true" {
			multiErr = multierror.Append(multiErr, fmt.Errorf("from_oauth_app prop must be \"true\""))
		}
	}
	if props[PostPropsFromPlugin] != nil {
		if fromPlugin, ok := props[PostPropsFromPlugin].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("from_plugin prop must be a string"))
		} else if fromPlugin != "true" {
			multiErr = multierror.Append(multiErr, fmt.Errorf("from_plugin prop must be \"true\""))
		}
	}
	if props[PostPropsUnsafeLinks] != nil {
		if unsafeLinks, ok := props[PostPropsUnsafeLinks].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("unsafe_links prop must be a string"))
		} else if unsafeLinks != "true" {
			multiErr = multierror.Append(multiErr, fmt.Errorf("unsafe_links prop must be \"true\""))
		}
	}
	if props[PostPropsWebhookDisplayName] != nil {
		if _, ok := props[PostPropsWebhookDisplayName].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("webhook_display_name prop must be a string"))
		}
	}
	if props[PostPropsMentionHighlightDisabled] != nil {
		if _, ok := props[PostPropsMentionHighlightDisabled].(bool); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("mention_highlight_disabled prop must be a boolean"))
		}
	}
	if props[PostPropsGroupHighlightDisabled] != nil {
		if _, ok := props[PostPropsGroupHighlightDisabled].(bool); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("disable_group_highlight prop must be a boolean"))
		}
	}
	if props[PostPropsPreviewedPost] != nil {
		if previewedPostID, ok := props[PostPropsPreviewedPost].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("previewed_post prop must be a string"))
		} else if !IsValidId(previewedPostID) {
			multiErr = multierror.Append(multiErr, fmt.Errorf("previewed_post prop must be a valid post ID"))
		}
	}
	if props[PostPropsForceNotification] != nil {
		if _, ok := props[PostPropsForceNotification].(bool); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("force_notification prop must be a boolean"))
		}
	}
	if props[PostPropsAIGeneratedByUserID] != nil {
		if aiGenUserID, ok := props[PostPropsAIGeneratedByUserID].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("ai_generated_by prop must be a string"))
		} else if !IsValidId(aiGenUserID) {
			multiErr = multierror.Append(multiErr, fmt.Errorf("ai_generated_by prop must be a valid user ID"))
		}
	}
	if props[PostPropsAIGeneratedByUsername] != nil {
		if _, ok := props[PostPropsAIGeneratedByUsername].(string); !ok {
			multiErr = multierror.Append(multiErr, fmt.Errorf("ai_generated_by_username prop must be a string"))
		}
	}
	for i, a := range o.Attachments() {
		if err := a.IsValid(); err != nil {
			multiErr = multierror.Append(multiErr, multierror.Prefix(err, fmt.Sprintf("message attachtment at index %d is invalid:", i)))
		}
	}
	return multiErr.ErrorOrNil()
}
func (o *Post) IsSystemMessage() bool {
	return len(o.Type) >= len(PostSystemMessagePrefix) && o.Type[:len(PostSystemMessagePrefix)] == PostSystemMessagePrefix
}
func (o *Post) IsRemote() bool {
	return o.RemoteId != nil && *o.RemoteId != ""
}
func (o *Post) GetRemoteID() string {
	if o.RemoteId != nil {
		return *o.RemoteId
	}
	return ""
}
func (o *Post) IsJoinLeaveMessage() bool {
	return o.Type == PostTypeJoinLeave ||
		o.Type == PostTypeAddRemove ||
		o.Type == PostTypeJoinChannel ||
		o.Type == PostTypeLeaveChannel ||
		o.Type == PostTypeJoinTeam ||
		o.Type == PostTypeLeaveTeam ||
		o.Type == PostTypeAddToChannel ||
		o.Type == PostTypeRemoveFromChannel ||
		o.Type == PostTypeAddToTeam ||
		o.Type == PostTypeRemoveFromTeam
}
func (o *Post) Patch(patch *PostPatch) {
	if patch.IsPinned != nil {
		o.IsPinned = *patch.IsPinned
	}
	if patch.Message != nil {
		o.Message = *patch.Message
	}
	if patch.Props != nil {
		newProps := *patch.Props
		o.SetProps(newProps)
	}
	if patch.FileIds != nil {
		o.FileIds = *patch.FileIds
	}
	if patch.HasReactions != nil {
		o.HasReactions = *patch.HasReactions
	}
}
func (o *Post) ChannelMentions() []string {
	return ChannelMentions(o.Message)
}
func (o *Post) ChannelMentionsAll() []string {
	messageMentions := ChannelMentions(o.Message)
	attachmentMentions := ChannelMentionsFromAttachments(o.Attachments())
	alreadyMentioned := make(map[string]bool)
	var allMentions []string
	for _, mention := range messageMentions {
		if !alreadyMentioned[mention] {
			allMentions = append(allMentions, mention)
			alreadyMentioned[mention] = true
		}
	}
	for _, mention := range attachmentMentions {
		if !alreadyMentioned[mention] {
			allMentions = append(allMentions, mention)
			alreadyMentioned[mention] = true
		}
	}
	return allMentions
}
func (o *Post) DisableMentionHighlights() string {
	mention, hasMentions := findAtChannelMention(o.Message)
	if hasMentions {
		o.AddProp(PostPropsMentionHighlightDisabled, true)
	}
	return mention
}
func (o *PostPatch) DisableMentionHighlights() {
	if o.Message == nil {
		return
	}
	if _, hasMentions := findAtChannelMention(*o.Message); hasMentions {
		if o.Props == nil {
			o.Props = &StringInterface{}
		}
		(*o.Props)[PostPropsMentionHighlightDisabled] = true
	}
}
func findAtChannelMention(message string) (mention string, found bool) {
	re := regexp.MustCompile(`(?i)\B@(channel|all|here)\b`)
	matched := re.FindStringSubmatch(message)
	if found = (len(matched) > 0); found {
		mention = strings.ToLower(matched[0])
	}
	return
}
func (o *Post) Attachments() []*MessageAttachment {
	if attachments, ok := o.GetProp(PostPropsAttachments).([]*MessageAttachment); ok {
		return attachments
	}
	var ret []*MessageAttachment
	if attachments, ok := o.GetProp(PostPropsAttachments).([]any); ok {
		for _, attachment := range attachments {
			if enc, err := json.Marshal(attachment); err == nil {
				var decoded MessageAttachment
				if json.Unmarshal(enc, &decoded) == nil {
					i := 0
					for _, action := range decoded.Actions {
						if action != nil {
							decoded.Actions[i] = action
							i++
						}
					}
					decoded.Actions = decoded.Actions[:i]
					i = 0
					for _, field := range decoded.Fields {
						if field != nil {
							decoded.Fields[i] = field
							i++
						}
					}
					decoded.Fields = decoded.Fields[:i]
					ret = append(ret, &decoded)
				}
			}
		}
	}
	return ret
}
func (o *Post) AttachmentsEqual(input *Post) bool {
	attachments := o.Attachments()
	inputAttachments := input.Attachments()
	if len(attachments) != len(inputAttachments) {
		return false
	}
	for i := range attachments {
		if !attachments[i].Equals(inputAttachments[i]) {
			return false
		}
	}
	return true
}
var markdownDestinationEscaper = strings.NewReplacer(
	`\`, `\\`,
	`<`, `\<`,
	`>`, `\>`,
	`(`, `\(`,
	`)`, `\)`,
)
func (o *Post) WithRewrittenImageURLs(f func(string) string) *Post {
	pCopy := o.Clone()
	pCopy.Message = RewriteImageURLs(o.Message, f)
	if pCopy.MessageSource == "" && pCopy.Message != o.Message {
		pCopy.MessageSource = o.Message
	}
	return pCopy
}
func RewriteImageURLs(message string, f func(string) string) string {
	if !strings.Contains(message, "![") {
		return message
	}
	var ranges []markdown.Range
	markdown.Inspect(message, func(blockOrInline any) bool {
		switch v := blockOrInline.(type) {
		case *markdown.ReferenceImage:
			ranges = append(ranges, v.ReferenceDefinition.RawDestination)
		case *markdown.InlineImage:
			ranges = append(ranges, v.RawDestination)
		default:
			return true
		}
		return true
	})
	if ranges == nil {
		return message
	}
	sort.Slice(ranges, func(i, j int) bool {
		return ranges[i].Position < ranges[j].Position
	})
	copyRanges := make([]markdown.Range, 0, len(ranges))
	urls := make([]string, 0, len(ranges))
	resultLength := len(message)
	start := 0
	for i, r := range ranges {
		switch {
		case i == 0:
		case r.Position != ranges[i-1].Position:
			start = ranges[i-1].End
		default:
			continue
		}
		original := message[r.Position:r.End]
		replacement := markdownDestinationEscaper.Replace(f(markdown.Unescape(original)))
		resultLength += len(replacement) - len(original)
		copyRanges = append(copyRanges, markdown.Range{Position: start, End: r.Position})
		urls = append(urls, replacement)
	}
	result := make([]byte, resultLength)
	offset := 0
	for i, r := range copyRanges {
		offset += copy(result[offset:], message[r.Position:r.End])
		offset += copy(result[offset:], urls[i])
	}
	copy(result[offset:], message[ranges[len(ranges)-1].End:])
	return string(result)
}
func (o *Post) IsFromOAuthBot() bool {
	props := o.GetProps()
	return props[PostPropsFromWebhook] == "true" && props[PostPropsOverrideUsername] != ""
}
func (o *Post) ToNilIfInvalid() *Post {
	if o.Id == "" {
		return nil
	}
	return o
}
func (o *Post) ForPlugin() *Post {
	p := o.Clone()
	p.Metadata = nil
	if p.Type == fmt.Sprintf("%sup_notification", PostCustomTypePrefix) {
		p.DelProp("requested_features")
	}
	return p
}
func (o *Post) GetPreviewPost() *PreviewPost {
	if o.Metadata == nil {
		return nil
	}
	for _, embed := range o.Metadata.Embeds {
		if embed != nil && embed.Type == PostEmbedPermalink {
			if previewPost, ok := embed.Data.(*PreviewPost); ok {
				return previewPost
			}
		}
	}
	return nil
}
func (o *Post) GetPreviewedPostProp() string {
	if val, ok := o.GetProp(PostPropsPreviewedPost).(string); ok {
		return val
	}
	return ""
}
func (o *Post) GetPriority() *PostPriority {
	if o.Metadata == nil {
		return nil
	}
	return o.Metadata.Priority
}
func (o *Post) GetPersistentNotification() *bool {
	priority := o.GetPriority()
	if priority == nil {
		return nil
	}
	return priority.PersistentNotifications
}
func (o *Post) GetRequestedAck() *bool {
	priority := o.GetPriority()
	if priority == nil {
		return nil
	}
	return priority.RequestedAck
}
func (o *Post) IsUrgent() bool {
	postPriority := o.GetPriority()
	if postPriority == nil {
		return false
	}
	if postPriority.Priority == nil {
		return false
	}
	return *postPriority.Priority == PostPriorityUrgent
}
func (o *Post) CleanPost() *Post {
	o.Id = ""
	o.CreateAt = 0
	o.UpdateAt = 0
	o.EditAt = 0
	return o
}
type UpdatePostOptions struct {
	SafeUpdate    bool
	IsRestorePost bool
}
func DefaultUpdatePostOptions() *UpdatePostOptions {
	return &UpdatePostOptions{
		SafeUpdate:    false,
		IsRestorePost: false,
	}
}
type PreparePostForClientOpts struct {
	IsNewPost       bool
	IsEditPost      bool
	IncludePriority bool
	RetainContent   bool
	IncludeDeleted  bool
}
type ReportPostOptions struct {
	ChannelId          string `json:"channel_id"`
	StartTime          int64  `json:"start_time,omitempty"`
	TimeField          string `json:"time_field,omitempty"`
	SortDirection      string `json:"sort_direction,omitempty"`
	PerPage            int    `json:"per_page,omitempty"`
	IncludeDeleted     bool   `json:"include_deleted,omitempty"`
	ExcludeSystemPosts bool   `json:"exclude_system_posts,omitempty"`
	IncludeMetadata    bool   `json:"include_metadata,omitempty"`
}
type RewriteAction string
const (
	RewriteActionCustom         RewriteAction = "custom"
	RewriteActionShorten        RewriteAction = "shorten"
	RewriteActionElaborate      RewriteAction = "elaborate"
	RewriteActionImproveWriting RewriteAction = "improve_writing"
	RewriteActionFixSpelling    RewriteAction = "fix_spelling"
	RewriteActionSimplify       RewriteAction = "simplify"
	RewriteActionSummarize      RewriteAction = "summarize"
)
type RewriteRequest struct {
	AgentID      string        `json:"agent_id"`
	Message      string        `json:"message"`
	Action       RewriteAction `json:"action"`
	CustomPrompt string        `json:"custom_prompt,omitempty"`
	RootID       string        `json:"root_id,omitempty"`
}
type RewriteResponse struct {
	RewrittenText string `json:"rewritten_text"`
}
const RewriteSystemPrompt = `You are a JSON API that rewrites text. Your response must be valid JSON only.
Return this exact format: {"rewritten_text":"content"}.
Do not use markdown, code blocks, or any formatting. Start with { and end with }.`
type ReportPostOptionsCursor struct {
	Cursor string `json:"cursor,omitempty"`
}
type ReportPostListResponse struct {
	Posts      []*Post                  `json:"posts"`
	NextCursor *ReportPostOptionsCursor `json:"next_cursor,omitempty"`
}
type ReportPostQueryParams struct {
	ChannelId          string
	CursorTime         int64
	CursorId           string
	TimeField          string
	SortDirection      string
	IncludeDeleted     bool
	ExcludeSystemPosts bool
	PerPage            int
}
func (q *ReportPostQueryParams) Validate() *AppError {
	if !IsValidId(q.ChannelId) {
		return NewAppError("ReportPostQueryParams.Validate", "model.post.query_params.invalid_channel_id", nil, "channel_id must be a valid 26-character ID", 400)
	}
	if q.TimeField != ReportingTimeFieldCreateAt && q.TimeField != ReportingTimeFieldUpdateAt {
		return NewAppError("ReportPostQueryParams.Validate", "model.post.query_params.invalid_time_field", nil, fmt.Sprintf("time_field must be %q or %q", ReportingTimeFieldCreateAt, ReportingTimeFieldUpdateAt), 400)
	}
	if q.SortDirection != ReportingSortDirectionAsc && q.SortDirection != ReportingSortDirectionDesc {
		return NewAppError("ReportPostQueryParams.Validate", "model.post.query_params.invalid_sort_direction", nil, fmt.Sprintf("sort_direction must be %q or %q", ReportingSortDirectionAsc, ReportingSortDirectionDesc), 400)
	}
	if q.CursorId != "" && !IsValidId(q.CursorId) {
		return NewAppError("ReportPostQueryParams.Validate", "model.post.query_params.invalid_cursor_id", nil, "cursor_id must be a valid 26-character ID", 400)
	}
	return nil
}
func EncodeReportPostCursor(channelId string, timeField string, includeDeleted bool, excludeSystemPosts bool, sortDirection string, timestamp int64, postId string) string {
	plainText := fmt.Sprintf("1:%s:%s:%t:%t:%s:%d:%s",
		channelId,
		timeField,
		includeDeleted,
		excludeSystemPosts,
		sortDirection,
		timestamp,
		postId)
	return base64.URLEncoding.EncodeToString([]byte(plainText))
}
func DecodeReportPostCursorV1(cursor string) (*ReportPostQueryParams, *AppError) {
	decoded, err := base64.URLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, NewAppError("DecodeReportPostCursorV1", "model.post.decode_cursor.invalid_base64", nil, err.Error(), 400)
	}
	parts := strings.Split(string(decoded), ":")
	if len(parts) != 8 {
		return nil, NewAppError("DecodeReportPostCursorV1", "model.post.decode_cursor.invalid_format", nil, fmt.Sprintf("expected 8 parts, got %d", len(parts)), 400)
	}
	version, err := strconv.Atoi(parts[0])
	if err != nil {
		return nil, NewAppError("DecodeReportPostCursorV1", "model.post.decode_cursor.invalid_version", nil, fmt.Sprintf("version must be an integer: %s", err.Error()), 400)
	}
	if version != 1 {
		return nil, NewAppError("DecodeReportPostCursorV1", "model.post.decode_cursor.unsupported_version", nil, fmt.Sprintf("version %d", version), 400)
	}
	includeDeleted, err := strconv.ParseBool(parts[3])
	if err != nil {
		return nil, NewAppError("DecodeReportPostCursorV1", "model.post.decode_cursor.invalid_include_deleted", nil, fmt.Sprintf("include_deleted must be a boolean: %s", err.Error()), 400)
	}
	excludeSystemPosts, err := strconv.ParseBool(parts[4])
	if err != nil {
		return nil, NewAppError("DecodeReportPostCursorV1", "model.post.decode_cursor.invalid_exclude_system_posts", nil, fmt.Sprintf("exclude_system_posts must be a boolean: %s", err.Error()), 400)
	}
	timestamp, err := strconv.ParseInt(parts[6], 10, 64)
	if err != nil {
		return nil, NewAppError("DecodeReportPostCursorV1", "model.post.decode_cursor.invalid_timestamp", nil, fmt.Sprintf("timestamp must be an integer: %s", err.Error()), 400)
	}
	return &ReportPostQueryParams{
		ChannelId:          parts[1],
		CursorTime:         timestamp,
		CursorId:           parts[7],
		TimeField:          parts[2],
		SortDirection:      parts[5],
		IncludeDeleted:     includeDeleted,
		ExcludeSystemPosts: excludeSystemPosts,
	}, nil
}