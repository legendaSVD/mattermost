package model
import (
	"regexp"
	"strings"
)
var channelMentionRegexp = regexp.MustCompile(`\B~[a-zA-Z0-9\-_]+`)
func ChannelMentions(message string) []string {
	var names []string
	if strings.Contains(message, "~") {
		alreadyMentioned := make(map[string]bool)
		for _, match := range channelMentionRegexp.FindAllString(message, -1) {
			name := match[1:]
			if !alreadyMentioned[name] {
				names = append(names, name)
				alreadyMentioned[name] = true
			}
		}
	}
	return names
}
func ChannelMentionsFromAttachments(attachments []*MessageAttachment) []string {
	alreadyMentioned := make(map[string]bool)
	var names []string
	for _, attachment := range attachments {
		if attachment == nil {
			continue
		}
		for _, match := range channelMentionRegexp.FindAllString(attachment.Pretext, -1) {
			name := match[1:]
			if !alreadyMentioned[name] {
				names = append(names, name)
				alreadyMentioned[name] = true
			}
		}
		for _, match := range channelMentionRegexp.FindAllString(attachment.Text, -1) {
			name := match[1:]
			if !alreadyMentioned[name] {
				names = append(names, name)
				alreadyMentioned[name] = true
			}
		}
		for _, field := range attachment.Fields {
			if field == nil {
				continue
			}
			var valueStr string
			switch v := field.Value.(type) {
			case string:
				valueStr = v
			default:
				continue
			}
			for _, match := range channelMentionRegexp.FindAllString(valueStr, -1) {
				name := match[1:]
				if !alreadyMentioned[name] {
					names = append(names, name)
					alreadyMentioned[name] = true
				}
			}
		}
	}
	return names
}