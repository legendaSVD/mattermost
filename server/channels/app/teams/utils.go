package teams
import (
	"slices"
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
)
func (ts *TeamService) DefaultChannelNames() []string {
	names := []string{"town-square"}
	if len(ts.config().TeamSettings.ExperimentalDefaultChannels) == 0 {
		names = append(names, "off-topic")
	} else {
		seenChannels := map[string]bool{"town-square": true}
		for _, channelName := range ts.config().TeamSettings.ExperimentalDefaultChannels {
			if !seenChannels[channelName] {
				names = append(names, channelName)
				seenChannels[channelName] = true
			}
		}
	}
	return names
}
func IsEmailAddressAllowed(email string, allowedDomains []string) bool {
	for _, restriction := range allowedDomains {
		domains := normalizeDomains(restriction)
		if len(domains) <= 0 {
			continue
		}
		matched := false
		for _, d := range domains {
			if strings.HasSuffix(email, "@"+d) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}
	return true
}
func (ts *TeamService) IsTeamEmailAllowed(user *model.User, team *model.Team) bool {
	if user.IsBot {
		return true
	}
	email := strings.ToLower(user.Email)
	allowedDomains := ts.GetAllowedDomains(user, team)
	return IsEmailAddressAllowed(email, allowedDomains)
}
func (ts *TeamService) GetAllowedDomains(user *model.User, team *model.Team) []string {
	if user.IsGuest() {
		return []string{*ts.config().GuestAccountsSettings.RestrictCreationToDomains}
	}
	return []string{team.AllowedDomains, *ts.config().TeamSettings.RestrictCreationToDomains}
}
func (ts *TeamService) checkValidDomains(team *model.Team) error {
	validDomains := normalizeDomains(*ts.config().TeamSettings.RestrictCreationToDomains)
	if len(validDomains) > 0 {
		for _, domain := range normalizeDomains(team.AllowedDomains) {
			matched := slices.Contains(validDomains, domain)
			if !matched {
				return &DomainError{Domain: domain}
			}
		}
	}
	return nil
}
func normalizeDomains(domains string) []string {
	return strings.Fields(strings.TrimSpace(strings.ToLower(strings.Replace(strings.Replace(domains, "@", " ", -1), ",", " ", -1))))
}
func (ts *TeamService) userIsInAdminRoleGroup(userID, syncableID string, syncableType model.GroupSyncableType) (bool, error) {
	groupIDs, err := ts.groupStore.AdminRoleGroupsForSyncableMember(userID, syncableID, syncableType)
	if err != nil {
		return false, err
	}
	if len(groupIDs) == 0 {
		return false, nil
	}
	return true, nil
}