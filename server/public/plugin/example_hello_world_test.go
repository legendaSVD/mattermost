package plugin_test
import (
	"fmt"
	"net/http"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type HelloWorldPlugin struct {
	plugin.MattermostPlugin
}
func (p *HelloWorldPlugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Hello, world!")
}
func Example_helloWorld() {
	plugin.ClientMain(&HelloWorldPlugin{})
}