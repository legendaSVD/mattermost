package model
import (
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"
)
const (
	BotDisplayNameMaxRunes   = UserFirstNameMaxRunes
	BotDescriptionMaxRunes   = 1024
	BotCreatorIdMaxRunes     = KeyValuePluginIdMaxRunes
	BotWarnMetricBotUsername = "mattermost-advisor"
	BotSystemBotUsername     = "system-bot"
)
type Bot struct {
	UserId         string `json:"user_id"`
	Username       string `json:"username"`
	DisplayName    string `json:"display_name,omitempty"`
	Description    string `json:"description,omitempty"`
	OwnerId        string `json:"owner_id"`
	LastIconUpdate int64  `json:"last_icon_update,omitempty"`
	CreateAt       int64  `json:"create_at"`
	UpdateAt       int64  `json:"update_at"`
	DeleteAt       int64  `json:"delete_at"`
}
func (b *Bot) Auditable() map[string]any {
	return map[string]any{
		"user_id":          b.UserId,
		"username":         b.Username,
		"display_name":     b.DisplayName,
		"description":      b.Description,
		"owner_id":         b.OwnerId,
		"last_icon_update": b.LastIconUpdate,
		"create_at":        b.CreateAt,
		"update_at":        b.UpdateAt,
		"delete_at":        b.DeleteAt,
	}
}
type BotPatch struct {
	Username    *string `json:"username"`
	DisplayName *string `json:"display_name"`
	Description *string `json:"description"`
}
func (b *BotPatch) Auditable() map[string]any {
	return map[string]any{
		"username":     b.Username,
		"display_name": b.DisplayName,
		"description":  b.Description,
	}
}
type BotGetOptions struct {
	OwnerId        string
	IncludeDeleted bool
	OnlyOrphaned   bool
	Page           int
	PerPage        int
}
type BotList []*Bot
func (b *Bot) Trace() map[string]any {
	return map[string]any{"user_id": b.UserId}
}
func (b *Bot) Clone() *Bot {
	bCopy := *b
	return &bCopy
}
func (b *Bot) IsValidCreate() *AppError {
	if !IsValidUsername(b.Username) {
		return NewAppError("Bot.IsValid", "model.bot.is_valid.username.app_error", b.Trace(), "", http.StatusBadRequest)
	}
	if utf8.RuneCountInString(b.DisplayName) > BotDisplayNameMaxRunes {
		return NewAppError("Bot.IsValid", "model.bot.is_valid.user_id.app_error", b.Trace(), "", http.StatusBadRequest)
	}
	if utf8.RuneCountInString(b.Description) > BotDescriptionMaxRunes {
		return NewAppError("Bot.IsValid", "model.bot.is_valid.description.app_error", b.Trace(), "", http.StatusBadRequest)
	}
	if b.OwnerId == "" || utf8.RuneCountInString(b.OwnerId) > BotCreatorIdMaxRunes {
		return NewAppError("Bot.IsValid", "model.bot.is_valid.creator_id.app_error", b.Trace(), "", http.StatusBadRequest)
	}
	return nil
}
func (b *Bot) IsValid() *AppError {
	if !IsValidId(b.UserId) {
		return NewAppError("Bot.IsValid", "model.bot.is_valid.user_id.app_error", b.Trace(), "", http.StatusBadRequest)
	}
	if b.CreateAt == 0 {
		return NewAppError("Bot.IsValid", "model.bot.is_valid.create_at.app_error", b.Trace(), "", http.StatusBadRequest)
	}
	if b.UpdateAt == 0 {
		return NewAppError("Bot.IsValid", "model.bot.is_valid.update_at.app_error", b.Trace(), "", http.StatusBadRequest)
	}
	return b.IsValidCreate()
}
func (b *Bot) PreSave() {
	b.CreateAt = GetMillis()
	b.UpdateAt = b.CreateAt
	b.DeleteAt = 0
	b.Username = NormalizeUsername(b.Username)
}
func (b *Bot) PreUpdate() {
	b.UpdateAt = GetMillis()
}
func (b *Bot) Etag() string {
	return Etag(b.UserId, b.UpdateAt)
}
func (b *Bot) Patch(patch *BotPatch) {
	if patch.Username != nil {
		b.Username = *patch.Username
	}
	if patch.DisplayName != nil {
		b.DisplayName = *patch.DisplayName
	}
	if patch.Description != nil {
		b.Description = *patch.Description
	}
}
func (b *Bot) WouldPatch(patch *BotPatch) bool {
	if patch == nil {
		return false
	}
	if patch.Username != nil && *patch.Username != b.Username {
		return true
	}
	if patch.DisplayName != nil && *patch.DisplayName != b.DisplayName {
		return true
	}
	if patch.Description != nil && *patch.Description != b.Description {
		return true
	}
	return false
}
func UserFromBot(b *Bot) *User {
	return &User{
		Id:        b.UserId,
		Username:  b.Username,
		Email:     NormalizeEmail(fmt.Sprintf("%s@localhost", b.Username)),
		FirstName: b.DisplayName,
		Roles:     SystemUserRoleId,
	}
}
func BotFromUser(u *User) *Bot {
	return &Bot{
		OwnerId:     u.Id,
		UserId:      u.Id,
		Username:    u.Username,
		DisplayName: u.GetDisplayName(ShowUsername),
	}
}
func (l *BotList) Etag() string {
	id := "0"
	var t int64
	var delta int64
	for _, v := range *l {
		if v.UpdateAt > t {
			t = v.UpdateAt
			id = v.UserId
		}
	}
	return Etag(id, t, delta, len(*l))
}
func MakeBotNotFoundError(where, userId string) *AppError {
	return NewAppError(where, "store.sql_bot.get.missing.app_error", map[string]any{"user_id": userId}, "", http.StatusNotFound)
}
func IsBotDMChannel(channel *Channel, botUserID string) bool {
	if channel.Type != ChannelTypeDirect {
		return false
	}
	if !strings.HasPrefix(channel.Name, botUserID+"__") && !strings.HasSuffix(channel.Name, "__"+botUserID) {
		return false
	}
	return true
}