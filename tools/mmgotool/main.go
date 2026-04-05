package main
import (
	"os"
	"github.com/mattermost/mattermost/tools/mmgotool/commands"
)
func main() {
	if err := commands.Run(os.Args[1:]); err != nil {
		os.Exit(1)
	}
}