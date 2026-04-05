package cluster
import (
	"math/rand"
	"time"
)
const (
	minWaitInterval = 1 * time.Second
	maxWaitInterval = 5 * time.Minute
	pollWaitInterval = 1 * time.Second
	jitterWaitInterval = minWaitInterval / 2
)
func nextWaitInterval(lastWaitInterval time.Duration, err error) time.Duration {
	nextWaitInterval := lastWaitInterval
	if nextWaitInterval <= 0 {
		nextWaitInterval = minWaitInterval
	}
	if err != nil {
		nextWaitInterval *= 2
		if nextWaitInterval > maxWaitInterval {
			nextWaitInterval = maxWaitInterval
		}
	} else {
		nextWaitInterval = pollWaitInterval
	}
	nextWaitInterval += time.Duration(rand.Int63n(int64(jitterWaitInterval)) - int64(jitterWaitInterval)/2)
	return nextWaitInterval
}