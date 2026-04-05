package model
import (
	"regexp"
	"unicode/utf8"
)
const (
	MinIdLength  = 3
	MaxIdLength  = 190
	ValidIdRegex = `^[a-zA-Z0-9-_\.]+$`
)
var validId *regexp.Regexp
func init() {
	validId = regexp.MustCompile(ValidIdRegex)
}
func IsValidPluginId(id string) bool {
	if utf8.RuneCountInString(id) < MinIdLength {
		return false
	}
	if utf8.RuneCountInString(id) > MaxIdLength {
		return false
	}
	return validId.MatchString(id)
}