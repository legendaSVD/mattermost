package commands
import (
	"github.com/spf13/cobra"
)
type Command = cobra.Command
func Run(args []string) error {
	RootCmd.SetArgs(args)
	return RootCmd.Execute()
}
var RootCmd = &cobra.Command{
	Use:   "mmgotool",
	Short: "Mattermost dev utils cli",
	Long:  `Mattermost cli to help in the development process`,
}