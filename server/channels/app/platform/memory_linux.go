package platform
import (
	"syscall"
)
func getTotalMemory() (uint64, error) {
	var info syscall.Sysinfo_t
	err := syscall.Sysinfo(&info)
	if err != nil {
		return 0, err
	}
	return info.Totalram * uint64(info.Unit), nil
}