package users
import (
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
)
func CheckUserDomain(user *model.User, domains string) bool {
	return CheckEmailDomain(user.Email, domains)
}
func CheckEmailDomain(email string, domains string) bool {
	if domains == "" {
		return true
	}
	domainArray := strings.FieldsSeq(strings.TrimSpace(strings.ToLower(strings.Replace(strings.Replace(domains, "@", " ", -1), ",", " ", -1))))
	for d := range domainArray {
		if strings.HasSuffix(strings.ToLower(email), "@"+d) {
			return true
		}
	}
	return false
}
func (us *UserService) sanitizeProfiles(users []*model.User, asAdmin bool) []*model.User {
	for _, u := range users {
		us.SanitizeProfile(u, asAdmin)
	}
	return users
}
func (us *UserService) SanitizeProfile(user *model.User, asAdmin bool) {
	options := us.GetSanitizeOptions(asAdmin)
	user.SanitizeProfile(options, asAdmin)
}
func (us *UserService) GetSanitizeOptions(asAdmin bool) map[string]bool {
	options := us.config().GetSanitizeOptions()
	if asAdmin {
		options["email"] = true
		options["fullname"] = true
		options["authservice"] = true
		options["authdata"] = true
	}
	return options
}
func (us *UserService) IsUsernameTaken(name string) bool {
	if !model.IsValidUsername(name) {
		return false
	}
	if _, err := us.store.GetByUsername(name); err != nil {
		return false
	}
	return true
}