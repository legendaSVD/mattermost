package platform
import (
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/testlib"
)
func TestIsLeader(t *testing.T) {
	mainHelper.Parallel(t)
	t.Run("no license returns true", func(t *testing.T) {
		th := Setup(t)
		th.Service.SetLicense(nil)
		assert.True(t, th.Service.IsLeader())
	})
	t.Run("license with cluster enabled and cluster interface returns cluster leader", func(t *testing.T) {
		fakeCluster := &testlib.FakeClusterInterface{}
		th := SetupWithCluster(t, fakeCluster)
		th.Service.UpdateConfig(func(cfg *model.Config) {
			*cfg.ClusterSettings.Enable = true
		})
		assert.False(t, th.Service.IsLeader())
	})
	t.Run("license without cluster feature but cluster enabled returns true", func(t *testing.T) {
		fakeCluster := &testlib.FakeClusterInterface{}
		th := SetupWithCluster(t, fakeCluster)
		license := model.NewTestLicenseWithFalseDefaults("cluster")
		th.Service.SetLicense(license)
		th.Service.UpdateConfig(func(cfg *model.Config) {
			*cfg.ClusterSettings.Enable = true
		})
		assert.True(t, th.Service.IsLeader())
	})
	t.Run("cluster settings disabled returns true", func(t *testing.T) {
		fakeCluster := &testlib.FakeClusterInterface{}
		th := SetupWithCluster(t, fakeCluster)
		th.Service.UpdateConfig(func(cfg *model.Config) {
			*cfg.ClusterSettings.Enable = false
		})
		assert.True(t, th.Service.IsLeader())
	})
}