package markdown
import (
	"regexp"
)
var (
	emojiRegex = regexp.MustCompile(`^:([a-z0-9_\-+]+):\B`)
)
func (p *inlineParser) parseEmoji() bool {
	if p.position > 1 {
		prevChar := p.raw[p.position-1]
		if isWordByte(prevChar) {
			return false
		}
	}
	remaining := p.raw[p.position:]
	loc := emojiRegex.FindStringIndex(remaining)
	if loc == nil {
		return false
	}
	p.inlines = append(p.inlines, &Emoji{
		Name: remaining[loc[0]+1 : loc[1]-1],
	})
	p.position += loc[1] - loc[0]
	return true
}