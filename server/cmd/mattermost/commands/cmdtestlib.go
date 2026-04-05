package commands
import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/api4"
	"github.com/mattermost/mattermost/server/v8/channels/store/storetest/mocks"
	"github.com/mattermost/mattermost/server/v8/channels/testlib"
)
var coverprofileCounters = make(map[string]int)
var mainHelper *testlib.MainHelper
type testHelper struct {
	*api4.TestHelper
	config            *model.Config
	tempDir           string
	configFilePath    string
	disableAutoConfig bool
}
func SetupWithStoreMock(tb testing.TB) *testHelper {
	dir, err := testlib.SetupTestResources()
	require.NoError(tb, err)
	tb.Cleanup(func() {
		err = os.RemoveAll(dir)
		require.NoError(tb, err)
	})
	api4TestHelper := api4.SetupWithStoreMock(tb)
	systemStore := mocks.SystemStore{}
	systemStore.On("Get").Return(make(model.StringMap), nil)
	licenseStore := mocks.LicenseStore{}
	licenseStore.On("Get", "").Return(&model.LicenseRecord{}, nil)
	api4TestHelper.App.Srv().Store().(*mocks.Store).On("System").Return(&systemStore)
	api4TestHelper.App.Srv().Store().(*mocks.Store).On("License").Return(&licenseStore)
	testHelper := &testHelper{
		TestHelper:     api4TestHelper,
		tempDir:        dir,
		configFilePath: filepath.Join(dir, "config-helper.json"),
	}
	config := &model.Config{}
	config.SetDefaults()
	testHelper.SetConfig(config)
	return testHelper
}
func (h *testHelper) InitBasic(tb testing.TB) *testHelper {
	h.TestHelper.InitBasic(tb)
	return h
}
func (h *testHelper) TemporaryDirectory() string {
	return h.tempDir
}
func (h *testHelper) Config() *model.Config {
	return h.config.Clone()
}
func (h *testHelper) ConfigPath() string {
	return h.configFilePath
}
func (h *testHelper) SetConfig(config *model.Config) {
	if !testing.Short() {
		config.SqlSettings = *mainHelper.GetSQLSettings()
	}
	*config.PasswordSettings.MinimumLength = 5
	*config.PasswordSettings.Lowercase = false
	*config.PasswordSettings.Uppercase = false
	*config.PasswordSettings.Symbol = false
	*config.PasswordSettings.Number = false
	h.config = config
	buf, err := json.Marshal(config)
	if err != nil {
		panic("failed to marshal config: " + err.Error())
	}
	if err := os.WriteFile(h.configFilePath, buf, 0600); err != nil {
		panic("failed to write file " + h.configFilePath + ": " + err.Error())
	}
}
func (h *testHelper) SetAutoConfig(autoConfig bool) {
	h.disableAutoConfig = !autoConfig
}
func (h *testHelper) execArgs(t *testing.T, args []string) []string {
	ret := []string{"-test.v", "-test.run", "ExecCommand"}
	if coverprofile := flag.Lookup("test.coverprofile").Value.String(); coverprofile != "" {
		dir := filepath.Dir(coverprofile)
		base := filepath.Base(coverprofile)
		baseParts := strings.SplitN(base, ".", 2)
		name := strings.Replace(t.Name(), "/", "_", -1)
		coverprofileCounters[name] = coverprofileCounters[name] + 1
		baseParts[0] = fmt.Sprintf("%v-%v-%v", baseParts[0], name, coverprofileCounters[name])
		ret = append(ret, "-test.coverprofile", filepath.Join(dir, strings.Join(baseParts, ".")))
	}
	ret = append(ret, "--")
	hasConfig := h.disableAutoConfig
	if slices.Contains(args, "--config") {
		hasConfig = true
	}
	if !hasConfig {
		ret = append(ret, "--config", h.configFilePath)
	}
	ret = append(ret, args...)
	return ret
}
func (h *testHelper) cmd(t *testing.T, args []string) *exec.Cmd {
	path, err := os.Executable()
	require.NoError(t, err)
	cmd := exec.Command(path, h.execArgs(t, args)...)
	cmd.Env = []string{}
	for _, env := range os.Environ() {
		if strings.HasPrefix(env, "MM_SQLSETTINGS_DATASOURCE=") {
			continue
		}
		cmd.Env = append(cmd.Env, env)
	}
	return cmd
}
func (h *testHelper) CheckCommand(t *testing.T, args ...string) string {
	output, err := h.cmd(t, args).CombinedOutput()
	require.NoError(t, err, string(output))
	return strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(string(output)), "PASS"))
}
func (h *testHelper) RunCommand(t *testing.T, args ...string) error {
	return h.cmd(t, args).Run()
}
func (h *testHelper) RunCommandWithOutput(t *testing.T, args ...string) (string, error) {
	cmd := h.cmd(t, args)
	var buf bytes.Buffer
	reader, writer := io.Pipe()
	cmd.Stdout = writer
	cmd.Stderr = writer
	done := make(chan bool)
	go func() {
		io.Copy(&buf, reader)
		close(done)
	}()
	err := cmd.Run()
	writer.Close()
	<-done
	return buf.String(), err
}