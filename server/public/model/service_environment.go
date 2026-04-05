package model
import (
	"os"
	"strings"
)
const (
	ServiceEnvironmentProduction = "production"
	ServiceEnvironmentTest = "test"
	ServiceEnvironmentDev = "dev"
)
func GetServiceEnvironment() string {
	externalServiceEnvironment := strings.TrimSpace(strings.ToLower(os.Getenv("MM_SERVICEENVIRONMENT")))
	switch externalServiceEnvironment {
	case ServiceEnvironmentProduction, ServiceEnvironmentTest, ServiceEnvironmentDev:
		return externalServiceEnvironment
	}
	return getDefaultServiceEnvironment()
}