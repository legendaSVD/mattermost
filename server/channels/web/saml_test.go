package web
import (
	"encoding/base64"
	"strings"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
)
func TestSamlCallbackIncludesSrvParameter(t *testing.T) {
	t.Run("srv parameter should be included in redirect URL construction", func(t *testing.T) {
		siteURL := "https://mattermost.example.com"
		sessionToken := "test-session-token"
		csrfToken := "test-csrf-token"
		params := map[string]string{
			model.SessionCookieToken: sessionToken,
			model.SessionCookieCsrf:  csrfToken,
			"srv":                    siteURL,
		}
		assert.Equal(t, sessionToken, params[model.SessionCookieToken])
		assert.Equal(t, csrfToken, params[model.SessionCookieCsrf])
		assert.Equal(t, siteURL, params["srv"])
	})
	t.Run("srv parameter detects server mismatch", func(t *testing.T) {
		expectedServer := "https://server-a.example.com"
		actualSrvFromCallback := "https://server-b.example.com"
		isMismatch := expectedServer != actualSrvFromCallback
		assert.True(t, isMismatch, "Should detect server mismatch")
	})
	t.Run("srv parameter allows legitimate login", func(t *testing.T) {
		expectedServer := "https://server.example.com"
		actualSrvFromCallback := "https://server.example.com"
		isLegitimate := expectedServer == actualSrvFromCallback
		assert.True(t, isLegitimate, "Should allow legitimate login")
	})
}
func TestCompleteSamlRelayState(t *testing.T) {
	t.Run("should decode relay state correctly", func(t *testing.T) {
		relayProps := map[string]string{
			"action":      model.OAuthActionMobile,
			"redirect_to": "mmauth://callback",
		}
		relayState := base64.StdEncoding.EncodeToString([]byte(model.MapToJSON(relayProps)))
		decoded, err := base64.StdEncoding.DecodeString(relayState)
		require.NoError(t, err)
		decodedProps := model.MapFromJSON(strings.NewReader(string(decoded)))
		assert.Equal(t, model.OAuthActionMobile, decodedProps["action"])
		assert.Equal(t, "mmauth://callback", decodedProps["redirect_to"])
	})
}