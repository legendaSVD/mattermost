package model
import (
	"encoding/json"
	"maps"
)
type PostMetadata struct {
	Embeds []*PostEmbed `json:"embeds,omitempty"`
	Emojis []*Emoji `json:"emojis,omitempty"`
	Files []*FileInfo `json:"files,omitempty"`
	Images map[string]*PostImage `json:"images,omitempty"`
	Reactions []*Reaction `json:"reactions,omitempty"`
	Priority *PostPriority `json:"priority,omitempty"`
	Acknowledgements []*PostAcknowledgement `json:"acknowledgements,omitempty"`
	Translations map[string]*PostTranslation `json:"translations,omitempty"`
	ExpireAt   int64    `json:"expire_at,omitempty"`
	Recipients []string `json:"recipients,omitempty"`
}
type PostTranslation struct {
	Text       string          `json:"text,omitempty"`
	Object     json.RawMessage `json:"object,omitempty"`
	Type       string          `json:"type"`
	State      string          `json:"state"`
	SourceLang string          `json:"source_lang,omitempty"`
}
func (p *PostMetadata) Auditable() map[string]any {
	embeds := make([]map[string]any, 0, len(p.Embeds))
	for _, pe := range p.Embeds {
		embeds = append(embeds, pe.Auditable())
	}
	if len(embeds) == 0 {
		embeds = nil
	}
	return map[string]any{
		"embeds":           embeds,
		"emojis":           p.Emojis,
		"files":            p.Files,
		"images":           p.Images,
		"reactions":        p.Reactions,
		"priority":         p.Priority,
		"acknowledgements": p.Acknowledgements,
		"translations":     p.Translations,
	}
}
type PostImage struct {
	Width  int `json:"width"`
	Height int `json:"height"`
	Format string `json:"format"`
	FrameCount int `json:"frame_count"`
}
func (p *PostMetadata) Copy() *PostMetadata {
	embedsCopy := make([]*PostEmbed, len(p.Embeds))
	copy(embedsCopy, p.Embeds)
	emojisCopy := make([]*Emoji, len(p.Emojis))
	copy(emojisCopy, p.Emojis)
	filesCopy := make([]*FileInfo, len(p.Files))
	copy(filesCopy, p.Files)
	imagesCopy := map[string]*PostImage{}
	maps.Copy(imagesCopy, p.Images)
	reactionsCopy := make([]*Reaction, len(p.Reactions))
	copy(reactionsCopy, p.Reactions)
	acknowledgementsCopy := make([]*PostAcknowledgement, len(p.Acknowledgements))
	copy(acknowledgementsCopy, p.Acknowledgements)
	translationsCopy := map[string]*PostTranslation{}
	maps.Copy(translationsCopy, p.Translations)
	var postPriorityCopy *PostPriority
	if p.Priority != nil {
		postPriorityCopy = &PostPriority{
			Priority:                p.Priority.Priority,
			RequestedAck:            p.Priority.RequestedAck,
			PersistentNotifications: p.Priority.PersistentNotifications,
			PostId:                  p.Priority.PostId,
			ChannelId:               p.Priority.ChannelId,
		}
	}
	return &PostMetadata{
		Embeds:           embedsCopy,
		Emojis:           emojisCopy,
		Files:            filesCopy,
		Images:           imagesCopy,
		Reactions:        reactionsCopy,
		Priority:         postPriorityCopy,
		Acknowledgements: acknowledgementsCopy,
		Translations:     translationsCopy,
	}
}