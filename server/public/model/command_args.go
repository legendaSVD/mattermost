package model
import (
	"github.com/mattermost/mattermost/server/public/shared/i18n"
)
type CommandArgs struct {
	UserId          string             `json:"user_id"`
	ChannelId       string             `json:"channel_id"`
	TeamId          string             `json:"team_id"`
	RootId          string             `json:"root_id"`
	ParentId        string             `json:"parent_id"`
	TriggerId       string             `json:"trigger_id,omitempty"`
	Command         string             `json:"command"`
	SiteURL         string             `json:"-"`
	T               i18n.TranslateFunc `json:"-"`
	UserMentions    UserMentionMap     `json:"-"`
	ChannelMentions ChannelMentionMap  `json:"-"`
}
func (o *CommandArgs) Auditable() map[string]any {
	return map[string]any{
		"user_id":    o.UserId,
		"channel_id": o.ChannelId,
		"team_id":    o.TeamId,
		"root_id":    o.RootId,
		"parent_id":  o.ParentId,
		"trigger_id": o.TriggerId,
		"command":    o.Command,
		"site_url":   o.SiteURL,
	}
}
func (o *CommandArgs) AddUserMention(username, userId string) {
	if o.UserMentions == nil {
		o.UserMentions = make(UserMentionMap)
	}
	o.UserMentions[username] = userId
}
func (o *CommandArgs) AddChannelMention(channelName, channelId string) {
	if o.ChannelMentions == nil {
		o.ChannelMentions = make(ChannelMentionMap)
	}
	o.ChannelMentions[channelName] = channelId
}