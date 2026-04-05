package app
import (
	"fmt"
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
)
const (
	mentionableUserPrefix  = "user:"
	mentionableGroupPrefix = "group:"
)
type MentionableID string
func mentionableUserID(userID string) MentionableID {
	return MentionableID(fmt.Sprint(mentionableUserPrefix, userID))
}
func mentionableGroupID(groupID string) MentionableID {
	return MentionableID(fmt.Sprint(mentionableGroupPrefix, groupID))
}
func (id MentionableID) AsUserID() (userID string, ok bool) {
	idString := string(id)
	if !strings.HasPrefix(idString, mentionableUserPrefix) {
		return "", false
	}
	return idString[len(mentionableUserPrefix):], true
}
func (id MentionableID) AsGroupID() (groupID string, ok bool) {
	idString := string(id)
	if !strings.HasPrefix(idString, mentionableGroupPrefix) {
		return "", false
	}
	return idString[len(mentionableGroupPrefix):], true
}
type MentionKeywords map[string][]MentionableID
func (k MentionKeywords) AddUser(profile *model.User, channelNotifyProps map[string]string, status *model.Status, allowChannelMentions bool) MentionKeywords {
	mentionableID := mentionableUserID(profile.Id)
	userMention := "@" + strings.ToLower(profile.Username)
	k[userMention] = append(k[userMention], mentionableID)
	for _, mentionKey := range profile.GetMentionKeys() {
		if mentionKey != "" {
			mentionKey = strings.ToLower(mentionKey)
			k[mentionKey] = append(k[mentionKey], mentionableID)
		}
	}
	if profile.NotifyProps[model.FirstNameNotifyProp] == "true" && profile.FirstName != "" {
		k[profile.FirstName] = append(k[profile.FirstName], mentionableID)
	}
	if allowChannelMentions {
		ignoreChannelMentions := channelNotifyProps[model.IgnoreChannelMentionsNotifyProp] == model.IgnoreChannelMentionsOn || (channelNotifyProps[model.MarkUnreadNotifyProp] == model.UserNotifyMention && channelNotifyProps[model.IgnoreChannelMentionsNotifyProp] == model.IgnoreChannelMentionsDefault)
		if profile.NotifyProps[model.ChannelMentionsNotifyProp] == "true" && !ignoreChannelMentions {
			k["@channel"] = append(k["@channel"], mentionableID)
			k["@all"] = append(k["@all"], mentionableID)
			if status != nil && status.Status == model.StatusOnline {
				k["@here"] = append(k["@here"], mentionableID)
			}
		}
	}
	return k
}
func (k MentionKeywords) AddUserKeyword(userID string, keyword string) MentionKeywords {
	k[keyword] = append(k[keyword], mentionableUserID(userID))
	return k
}
func (k MentionKeywords) AddGroup(group *model.Group) MentionKeywords {
	if group.Name != nil {
		keyword := "@" + *group.Name
		k[keyword] = append(k[keyword], mentionableGroupID(group.Id))
	}
	return k
}
func (k MentionKeywords) AddGroupsMap(groups map[string]*model.Group) MentionKeywords {
	for _, group := range groups {
		k.AddGroup(group)
	}
	return k
}