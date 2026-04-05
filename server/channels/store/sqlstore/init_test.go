package sqlstore
import (
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
var enableFullyParallelTests bool
func InitTest(logger mlog.LoggerIFace, parallelism int) {
	enableFullyParallelTests = parallelism > 1
	initStores(logger, parallelism)
}
func TearDownTest() {
	tearDownStores()
}