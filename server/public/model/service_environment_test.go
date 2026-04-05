package model_test
import (
	"os"
	"testing"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/require"
)
func TestGetServiceEnvironment(t *testing.T) {
	t.Run("no env defaults to dev (without production tag)", func(t *testing.T) {
		require.Equal(t, model.ServiceEnvironmentDev, model.GetServiceEnvironment())
	})
	t.Run("empty string defaults to dev (without production tag)", func(t *testing.T) {
		os.Setenv("MM_SERVICEENVIRONMENT", "")
		defer os.Unsetenv("MM_SERVICEENVIRONMENT")
		require.Equal(t, model.ServiceEnvironmentDev, model.GetServiceEnvironment())
	})
	t.Run("production", func(t *testing.T) {
		os.Setenv("MM_SERVICEENVIRONMENT", "production")
		defer os.Unsetenv("MM_SERVICEENVIRONMENT")
		require.Equal(t, model.ServiceEnvironmentProduction, model.GetServiceEnvironment())
	})
	t.Run("test", func(t *testing.T) {
		os.Setenv("MM_SERVICEENVIRONMENT", "test")
		defer os.Unsetenv("MM_SERVICEENVIRONMENT")
		require.Equal(t, model.ServiceEnvironmentTest, model.GetServiceEnvironment())
	})
	t.Run("dev", func(t *testing.T) {
		os.Setenv("MM_SERVICEENVIRONMENT", "dev")
		defer os.Unsetenv("MM_SERVICEENVIRONMENT")
		require.Equal(t, model.ServiceEnvironmentDev, model.GetServiceEnvironment())
	})
	t.Run("whitespace and case insensitive", func(t *testing.T) {
		os.Setenv("MM_SERVICEENVIRONMENT", "   Test  ")
		defer os.Unsetenv("MM_SERVICEENVIRONMENT")
		require.Equal(t, model.ServiceEnvironmentTest, model.GetServiceEnvironment())
	})
}