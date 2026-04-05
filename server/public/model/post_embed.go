package model
const (
	PostEmbedImage             PostEmbedType = "image"
	PostEmbedMessageAttachment PostEmbedType = "message_attachment"
	PostEmbedOpengraph         PostEmbedType = "opengraph"
	PostEmbedLink              PostEmbedType = "link"
	PostEmbedPermalink         PostEmbedType = "permalink"
	PostEmbedBoards            PostEmbedType = "boards"
)
type PostEmbedType string
type PostEmbed struct {
	Type PostEmbedType `json:"type"`
	URL string `json:"url,omitempty"`
	Data any `json:"data,omitempty"`
}
func (pe *PostEmbed) Auditable() map[string]any {
	return map[string]any{
		"type": pe.Type,
		"url":  pe.URL,
	}
}