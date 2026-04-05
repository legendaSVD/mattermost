package platform
import "errors"
var ErrMemoryUnsupportedPlatform = errors.New("total memory detection not supported on this platform")
func getTotalMemory() (uint64, error) {
	return 0, ErrMemoryUnsupportedPlatform
}