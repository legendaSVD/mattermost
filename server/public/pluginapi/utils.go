package pluginapi
import (
	"time"
)
var backoffTimeouts = []time.Duration{
	50 * time.Millisecond,
	100 * time.Millisecond,
	200 * time.Millisecond,
	200 * time.Millisecond,
	400 * time.Millisecond,
	400 * time.Millisecond,
}
func progressiveRetry(operation func() error) error {
	var err error
	for attempts := range backoffTimeouts {
		err = operation()
		if err == nil {
			return nil
		}
		time.Sleep(backoffTimeouts[attempts])
	}
	return err
}