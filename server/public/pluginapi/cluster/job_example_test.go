package cluster
import (
	"time"
	"github.com/mattermost/mattermost/server/public/plugin"
)
func ExampleSchedule() {
	pluginAPI := plugin.API(nil)
	callback := func() {
	}
	job, err := Schedule(pluginAPI, "key", MakeWaitForInterval(5*time.Minute), callback)
	if err != nil {
		panic("failed to schedule job")
	}
	defer job.Close()
}