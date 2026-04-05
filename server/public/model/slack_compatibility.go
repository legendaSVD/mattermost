package model
import (
	"fmt"
	"strings"
)
type SlackAttachment = MessageAttachment
type SlackAttachmentField = MessageAttachmentField
func ParseSlackAttachment(post *Post, attachments []*MessageAttachment) {
	ParseMessageAttachment(post, attachments)
}
func StringifySlackFieldValue(a []*MessageAttachment) []*MessageAttachment {
	return StringifyMessageAttachmentFieldValue(a)
}
type SlackCompatibleBool bool
func (b *SlackCompatibleBool) UnmarshalJSON(data []byte) error {
	value := strings.ToLower(string(data))
	switch value {
	case "true", `"true"`:
		*b = true
	case "false", `"false"`:
		*b = false
	default:
		return fmt.Errorf("unmarshal: unable to convert %s to bool", data)
	}
	return nil
}