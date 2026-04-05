package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/model"
)
func IsEnterpriseLicensedOrDevelopment(config *model.Config, license *model.License) bool {
	if license != nil {
		return true
	}
	return IsConfiguredForDevelopment(config)
}
func isValidSkuShortName(license *model.License) bool {
	if license == nil {
		return false
	}
	switch license.SkuShortName {
	case model.LicenseShortSkuE10, model.LicenseShortSkuE20, model.LicenseShortSkuProfessional, model.LicenseShortSkuEnterprise, model.LicenseShortSkuEnterpriseAdvanced:
		return true
	default:
		return false
	}
}
func IsE10LicensedOrDevelopment(config *model.Config, license *model.License) bool {
	if model.MinimumProfessionalLicense(license) {
		return true
	}
	if !isValidSkuShortName(license) {
		if license != nil &&
			license.Features != nil &&
			license.Features.LDAP != nil &&
			*license.Features.LDAP {
			return true
		}
	}
	return IsConfiguredForDevelopment(config)
}
func IsE20LicensedOrDevelopment(config *model.Config, license *model.License) bool {
	if model.MinimumEnterpriseLicense(license) {
		return true
	}
	if !isValidSkuShortName(license) {
		if license != nil &&
			license.Features != nil &&
			license.Features.FutureFeatures != nil &&
			*license.Features.FutureFeatures {
			return true
		}
	}
	return IsConfiguredForDevelopment(config)
}
func IsEnterpriseAdvancedLicensedOrDevelopment(config *model.Config, license *model.License) bool {
	if license != nil && license.SkuShortName == model.LicenseShortSkuEnterpriseAdvanced {
		return true
	}
	return IsConfiguredForDevelopment(config)
}
func IsConfiguredForDevelopment(config *model.Config) bool {
	if config != nil &&
		config.ServiceSettings.EnableTesting != nil &&
		*config.ServiceSettings.EnableTesting &&
		config.ServiceSettings.EnableDeveloper != nil &&
		*config.ServiceSettings.EnableDeveloper {
		return true
	}
	return false
}
func IsCloud(license *model.License) bool {
	if license == nil || license.Features == nil || license.Features.Cloud == nil {
		return false
	}
	return *license.Features.Cloud
}