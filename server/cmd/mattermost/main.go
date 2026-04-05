package main
import (
	"os"
	"github.com/mattermost/mattermost/server/v8/cmd/mattermost/commands"
	_ "github.com/mattermost/mattermost/server/v8/channels/app/slashcommands"
	_ "github.com/mattermost/mattermost/server/v8/channels/app/oauthproviders/gitlab"
	_ "github.com/mattermost/mattermost/server/v8/enterprise"
)
func main() {
	if err := commands.Run(os.Args[1:]); err != nil {
		os.Exit(1)
	}
}