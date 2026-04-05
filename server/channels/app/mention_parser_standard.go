package app
import (
	"strings"
	"unicode"
	"unicode/utf8"
)
var _ MentionParser = &StandardMentionParser{}
type StandardMentionParser struct {
	keywords MentionKeywords
	results *MentionResults
}
func makeStandardMentionParser(keywords MentionKeywords) *StandardMentionParser {
	return &StandardMentionParser{
		keywords: keywords,
		results: &MentionResults{},
	}
}
func (p *StandardMentionParser) ProcessText(text string) {
	systemMentions := map[string]bool{"@here": true, "@channel": true, "@all": true}
	for _, word := range strings.FieldsFunc(text, func(c rune) bool {
		return !(c == ':' || c == '.' || c == '-' || c == '_' || c == '@' || unicode.IsLetter(c) || unicode.IsNumber(c))
	}) {
		if word[0] == ':' && word[len(word)-1] == ':' {
			continue
		}
		word = strings.TrimLeft(word, ":.-_")
		if p.checkForMention(word) {
			continue
		}
		foundWithoutSuffix := false
		wordWithoutSuffix := word
		for wordWithoutSuffix != "" && strings.LastIndexAny(wordWithoutSuffix, ".-:_") == (len(wordWithoutSuffix)-1) {
			wordWithoutSuffix = wordWithoutSuffix[0 : len(wordWithoutSuffix)-1]
			if p.checkForMention(wordWithoutSuffix) {
				foundWithoutSuffix = true
				break
			}
		}
		if foundWithoutSuffix {
			continue
		}
		if _, ok := systemMentions[word]; !ok && strings.HasPrefix(word, "@") {
			last := word[len(word)-1]
			switch last {
			case '.', '-', ':':
				word = word[:len(word)-1]
			}
			p.results.OtherPotentialMentions = append(p.results.OtherPotentialMentions, word[1:])
		} else if strings.ContainsAny(word, ".-:") {
			splitWords := strings.FieldsFunc(word, func(c rune) bool {
				return c == '.' || c == '-' || c == ':'
			})
			for _, splitWord := range splitWords {
				if p.checkForMention(splitWord) {
					continue
				}
				if _, ok := systemMentions[splitWord]; !ok && strings.HasPrefix(splitWord, "@") {
					p.results.OtherPotentialMentions = append(p.results.OtherPotentialMentions, splitWord[1:])
				}
			}
		}
		if ids, match := isKeywordMultibyte(p.keywords, word); match {
			p.addMentions(ids, KeywordMention)
		}
	}
}
func (p *StandardMentionParser) Results() *MentionResults {
	return p.results
}
func (p *StandardMentionParser) checkForMention(word string) bool {
	var mentionType MentionType
	switch strings.ToLower(word) {
	case "@here":
		p.results.HereMentioned = true
		mentionType = ChannelMention
	case "@channel":
		p.results.ChannelMentioned = true
		mentionType = ChannelMention
	case "@all":
		p.results.AllMentioned = true
		mentionType = ChannelMention
	default:
		mentionType = KeywordMention
	}
	if ids, match := p.keywords[strings.ToLower(word)]; match {
		p.addMentions(ids, mentionType)
		return true
	}
	if ids, match := p.keywords[word]; match {
		p.addMentions(ids, mentionType)
		return true
	}
	return false
}
func (p *StandardMentionParser) addMentions(ids []MentionableID, mentionType MentionType) {
	for _, id := range ids {
		if userID, ok := id.AsUserID(); ok {
			p.results.addMention(userID, mentionType)
		} else if groupID, ok := id.AsGroupID(); ok {
			p.results.addGroupMention(groupID)
		}
	}
}
func isKeywordMultibyte(keywords MentionKeywords, word string) ([]MentionableID, bool) {
	ids := []MentionableID{}
	match := false
	var multibyteKeywords []string
	for keyword := range keywords {
		if len(keyword) != utf8.RuneCountInString(keyword) {
			multibyteKeywords = append(multibyteKeywords, keyword)
		}
	}
	if len(word) != utf8.RuneCountInString(word) {
		for _, key := range multibyteKeywords {
			if strings.Contains(word, key) {
				ids, match = keywords[key]
			}
		}
	}
	return ids, match
}