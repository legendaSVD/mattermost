package platform
import (
	"golang.org/x/sys/unix"
)
func getTotalMemory() (uint64, error) {
	mem, err := unix.SysctlUint64("hw.memsize")
	if err != nil {
		return 0, err
	}
	return mem, nil
}