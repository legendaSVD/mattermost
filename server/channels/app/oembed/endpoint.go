package oembed
import (
	"net/url"
	"regexp"
)
type ProviderEndpoint struct {
	URL      string
	Patterns []*regexp.Regexp
}
func (e *ProviderEndpoint) GetProviderURL(requestURL string) string {
	url, _ := url.Parse(e.URL)
	query := url.Query()
	query.Add("format", "json")
	query.Add("url", requestURL)
	url.RawQuery = query.Encode()
	return url.String()
}
func FindEndpointForURL(requestURL string) *ProviderEndpoint {
	for _, provider := range providers {
		for _, pattern := range provider.Patterns {
			if pattern.MatchString(requestURL) {
				return provider
			}
		}
	}
	return nil
}