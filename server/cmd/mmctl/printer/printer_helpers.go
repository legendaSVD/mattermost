package printer
import (
	"regexp"
	"strings"
)
var (
	csiRegex = regexp.MustCompile(`\x1b\[[0-9;?]*[A-Za-z]`)
	oscRegex = regexp.MustCompile(`\x1b\]([^\x07\x1b]|\x1b[^\\])*(\x07|\x1b\\)`)
	dcsRegex = regexp.MustCompile(`\x1bP([^\x1b]|\x1b[^\\])*\x1b\\`)
	otherEscRegex = regexp.MustCompile(`\x1b[_^X]([^\x1b]|\x1b[^\\])*\x1b\\|\x1b[^\[\]P0-9]`)
)
func SanitizeForTerminal(s string) string {
	result := csiRegex.ReplaceAllString(s, "")
	result = oscRegex.ReplaceAllString(result, "")
	result = dcsRegex.ReplaceAllString(result, "")
	result = otherEscRegex.ReplaceAllString(result, "")
	var cleaned strings.Builder
	cleaned.Grow(len(result))
	for _, r := range result {
		switch {
		case r == '\t' || r == '\n' || r == '\r':
			cleaned.WriteRune(r)
		case r < 0x20 || r == 0x7F:
			continue
		default:
			cleaned.WriteRune(r)
		}
	}
	return cleaned.String()
}