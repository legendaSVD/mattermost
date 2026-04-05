package cluster
import (
	"log"
	"time"
	"github.com/mattermost/mattermost/server/public/plugin"
)
func HandleJobOnceCalls(key string, props any) {
	if key == "the key i'm watching for" {
		log.Println(props)
	}
}
func ExampleJobOnceScheduler_ScheduleOnce() {
	pluginAPI := plugin.API(nil)
	scheduler := GetJobOnceScheduler(pluginAPI)
	_ = scheduler.SetCallback(HandleJobOnceCalls)
	_ = scheduler.Start()
	_, _ = scheduler.ScheduleOnce("the key i'm watching for", time.Now().Add(2*time.Hour), struct{ foo string }{"aasd"})
	jobs, _ := scheduler.ListScheduledJobs()
	defer func() {
		for _, j := range jobs {
			scheduler.Cancel(j.Key)
		}
	}()
}