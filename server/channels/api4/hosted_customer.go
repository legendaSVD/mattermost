package api4
import (
	"net/http"
	"github.com/mattermost/mattermost/server/public/model"
)
func (api *API) InitHostedCustomer() {
	api.BaseRoutes.HostedCustomer.Handle("/signup_available", api.APISessionRequired(handleSignupAvailable)).Methods(http.MethodGet)
}
func handleSignupAvailable(c *Context, w http.ResponseWriter, r *http.Request) {
	const where = "Api4.handleSignupAvailable"
	c.Err = model.NewAppError(where, "api.server.hosted_signup_unavailable.error", nil, "", http.StatusNotImplemented)
}