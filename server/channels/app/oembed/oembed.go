package oembed
import (
	"encoding/json"
	"fmt"
	"io"
)
type OEmbedResponse struct {
	Type string `json:"type"`
	Version         string `json:"version"`
	Title           string `json:"title,omitempty"`
	AuthorName      string `json:"author_name,omitempty"`
	AuthorURL       string `json:"author_url,omitempty"`
	ProviderName    string `json:"provider_name,omitempty"`
	ProviderURL     string `json:"provider_url,omitempty"`
	CacheAge        string `json:"cache_age,omitempty"`
	ThumbnailURL    string `json:"thumbnail_url,omitempty"`
	ThumbnailWidth  int    `json:"thumbnail_width,omitempty"`
	ThumbnailHeight int    `json:"thumbnail_height,omitempty"`
	URL string `json:"url"`
	HTML string `json:"html"`
	Width  int `json:"width"`
	Height int `json:"height"`
}
func ResponseFromJSON(r io.Reader) (*OEmbedResponse, error) {
	var response OEmbedResponse
	err := json.NewDecoder(r).Decode(&response)
	if err != nil {
		return nil, err
	}
	if response.Version != "1.0" {
		return nil, fmt.Errorf("ResponseFromJson: Received unsupported response version %s", response.Version)
	}
	if response.Type != "photo" && response.Type != "video" && response.Type != "link" && response.Type != "rich" {
		return nil, fmt.Errorf("ResponseFromJson: Received unsupported response type %s", response.Type)
	}
	return &response, nil
}