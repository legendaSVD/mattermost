package markdown
import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)
var (
	DefaultURLSchemes = []string{"http", "https", "ftp", "mailto", "tel"}
	wwwAutoLinkRegex  = regexp.MustCompile(`^www\d{0,3}\.`)
)
func parseWWWAutolink(data string, position int) (Range, bool) {
	if position > 1 {
		prevChar := data[position-1]
		if !isWhitespaceByte(prevChar) && !isAllowedBeforeWWWLink(prevChar) {
			return Range{}, false
		}
	}
	if len(data)-position < 4 || !wwwAutoLinkRegex.MatchString(data[position:]) {
		return Range{}, false
	}
	end := checkDomain(data[position:], false)
	if end == 0 {
		return Range{}, false
	}
	end += position
	for end < len(data) && !isWhitespaceByte(data[end]) {
		end += 1
	}
	end = trimTrailingCharactersFromLink(data, position, end)
	if position == end {
		return Range{}, false
	}
	return Range{position, end}, true
}
func isAllowedBeforeWWWLink(c byte) bool {
	switch c {
	case '*', '_', '~', ')', '<', '(', '>':
		return true
	}
	return false
}
func parseURLAutolink(data string, position int) (Range, bool) {
	if len(data)-position < 4 || data[position+1] != '/' || data[position+2] != '/' {
		return Range{}, false
	}
	start := position - 1
	for start > 0 && isAlphanumericByte(data[start-1]) {
		start -= 1
	}
	if start < 0 || position >= len(data) {
		return Range{}, false
	}
	scheme := data[start:position]
	if !isSchemeAllowed(scheme) || !isValidHostCharacter(data[position+3:]) {
		return Range{}, false
	}
	end := checkDomain(data[position+3:], true)
	if end == 0 {
		return Range{}, false
	}
	end += position
	for end < len(data) && !isWhitespaceByte(data[end]) {
		end += 1
	}
	end = trimTrailingCharactersFromLink(data, start, end)
	if start == end {
		return Range{}, false
	}
	return Range{start, end}, true
}
func isSchemeAllowed(scheme string) bool {
	for _, allowed := range DefaultURLSchemes {
		if strings.EqualFold(allowed, scheme) {
			return true
		}
	}
	return false
}
func checkDomain(data string, allowShort bool) int {
	foundUnderscore := false
	foundPeriod := false
	i := 1
	for ; i < len(data)-1; i++ {
		if data[i] == '_' {
			foundUnderscore = true
			break
		} else if data[i] == '.' {
			foundPeriod = true
		} else if !isValidHostCharacter(data[i:]) && data[i] != '-' {
			break
		}
	}
	if foundUnderscore {
		return 0
	}
	if allowShort {
		return i
	}
	if foundPeriod {
		return i
	}
	return 0
}
func isValidHostCharacter(link string) bool {
	c, _ := utf8.DecodeRuneInString(link)
	if c == utf8.RuneError {
		return false
	}
	return !unicode.IsSpace(c) && !unicode.IsPunct(c)
}
func trimTrailingCharactersFromLink(markdown string, start int, end int) int {
	runes := []rune(markdown[start:end])
	linkEnd := len(runes)
	for i, c := range runes {
		if c == '<' || c == '>' {
			linkEnd = i
			break
		}
	}
	for linkEnd > 0 {
		c := runes[linkEnd-1]
		if !canEndAutolink(c) {
			linkEnd = linkEnd - 1
		} else if c == ';' {
			newEnd := linkEnd - 2
			for newEnd > 0 && ((runes[newEnd] >= 'a' && runes[newEnd] <= 'z') || (runes[newEnd] >= 'A' && runes[newEnd] <= 'Z')) {
				newEnd -= 1
			}
			if newEnd < linkEnd-2 && runes[newEnd] == '&' {
				linkEnd = newEnd
			} else {
				linkEnd = linkEnd - 1
			}
		} else if c == ')' {
			numClosing := 0
			numOpening := 0
			for i := 0; i < linkEnd; i++ {
				if runes[i] == '(' {
					numOpening += 1
				} else if runes[i] == ')' {
					numClosing += 1
				}
			}
			if numClosing <= numOpening {
				break
			}
			linkEnd -= 1
		} else {
			break
		}
	}
	return start + len(string(runes[:linkEnd]))
}
func canEndAutolink(c rune) bool {
	switch c {
	case '?', '!', '.', ',', ':', '*', '_', '~', '\'', '"':
		return false
	}
	return true
}