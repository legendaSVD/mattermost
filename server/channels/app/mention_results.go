package app
const (
	NoMention MentionType = iota
	GMMention
	ThreadMention
	CommentMention
	ChannelMention
	DMMention
	KeywordMention
	GroupMention
)
type MentionType int
type MentionResults struct {
	Mentions map[string]MentionType
	GroupMentions map[string]MentionType
	OtherPotentialMentions []string
	HereMentioned bool
	AllMentioned bool
	ChannelMentioned bool
}
func (m *MentionResults) isUserMentioned(userID string) bool {
	if _, ok := m.Mentions[userID]; ok {
		return true
	}
	if _, ok := m.GroupMentions[userID]; ok {
		return true
	}
	return m.HereMentioned || m.AllMentioned || m.ChannelMentioned
}
func (m *MentionResults) addMention(userID string, mentionType MentionType) {
	if m.Mentions == nil {
		m.Mentions = make(map[string]MentionType)
	}
	if currentType, ok := m.Mentions[userID]; ok && currentType >= mentionType {
		return
	}
	m.Mentions[userID] = mentionType
}
func (m *MentionResults) removeMention(userID string) {
	delete(m.Mentions, userID)
}
func (m *MentionResults) addGroupMention(groupID string) {
	if m.GroupMentions == nil {
		m.GroupMentions = make(map[string]MentionType)
	}
	m.GroupMentions[groupID] = GroupMention
}