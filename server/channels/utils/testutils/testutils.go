package testutils
import (
	"bytes"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"time"
	"github.com/mattermost/mattermost/server/v8/channels/utils"
	"github.com/stretchr/testify/assert"
	"github.com/mattermost/mattermost/server/v8/channels/utils/fileutils"
)
type CollectTWithLogf struct {
	*assert.CollectT
}
func (*CollectTWithLogf) Logf(string, ...any) {
}
func ReadTestFile(name string) ([]byte, error) {
	path, _ := fileutils.FindDir("tests")
	file, err := os.Open(filepath.Join(path, name))
	if err != nil {
		return nil, err
	}
	defer file.Close()
	data := &bytes.Buffer{}
	if _, err := io.Copy(data, file); err != nil {
		return nil, err
	}
	return data.Bytes(), nil
}
func GetInterface(port int) string {
	dial := func(iface string, port int) bool {
		c, err := net.DialTimeout("tcp", iface+":"+strconv.Itoa(port), time.Second)
		if err != nil {
			return false
		}
		c.Close()
		return true
	}
	iface := "dockerhost"
	if ok := dial(iface, port); ok {
		return iface
	}
	iface = "localhost"
	if ok := dial(iface, port); ok {
		return iface
	}
	cmdStr := ""
	switch runtime.GOOS {
	case "linux":
		cmdStr = `ip address | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | grep -v 127.0.0.1 | awk '{ print $2 }' | cut -f2 -d: | cut -f1 -d/ | head -n1`
	case "darwin":
		cmdStr = `ifconfig | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}" | grep -v 127.0.0.1 | awk '{ print $2 }' | cut -f2 -d: | head -n1`
	default:
		return ""
	}
	cmd := exec.Command("bash", "-c", cmdStr)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return ""
	}
	return string(out)
}
func ResetLicenseValidator() {
	utils.LicenseValidator = &utils.LicenseValidatorImpl{}
}