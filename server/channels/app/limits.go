package app
import (
	"net/http"
	"github.com/mattermost/mattermost/server/public/model"
)
const (
	maxUsersLimit     = 200
	maxUsersHardLimit = 250
)
func (a *App) GetServerLimits() (*model.ServerLimits, *model.AppError) {
	limits := &model.ServerLimits{}
	license := a.License()
	if license == nil && maxUsersLimit > 0 {
		limits.MaxUsersLimit = maxUsersLimit
		limits.MaxUsersHardLimit = maxUsersHardLimit
	} else if license != nil && license.IsSeatCountEnforced && license.Features != nil && license.Features.Users != nil {
		licenseUserLimit := int64(*license.Features.Users)
		limits.MaxUsersLimit = licenseUserLimit
		extraUsers := 0
		if license.ExtraUsers != nil {
			extraUsers = *license.ExtraUsers
		}
		limits.MaxUsersHardLimit = licenseUserLimit + int64(extraUsers)
	}
	if license != nil && license.Limits != nil && license.Limits.PostHistory > 0 {
		limits.PostHistoryLimit = license.Limits.PostHistory
		lastAccessibleTime, appErr := a.GetLastAccessiblePostTime()
		if appErr != nil {
			return nil, appErr
		}
		limits.LastAccessiblePostTime = lastAccessibleTime
	}
	activeUserCount, appErr := a.Srv().Store().User().Count(model.UserCountOptions{})
	if appErr != nil {
		return nil, model.NewAppError("GetServerLimits", "app.limits.get_app_limits.user_count.store_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
	}
	if a.shouldTrackSingleChannelGuests() {
		singleChannelGuestCount, err := a.Srv().Store().User().AnalyticsGetSingleChannelGuestCount()
		if err != nil {
			return nil, model.NewAppError("GetServerLimits", "app.limits.get_app_limits.single_channel_guest_count.store_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
		limits.ActiveUserCount = max(activeUserCount-singleChannelGuestCount, 0)
		limits.SingleChannelGuestCount = singleChannelGuestCount
		if license != nil && license.Features != nil && license.Features.Users != nil {
			limits.SingleChannelGuestLimit = int64(*license.Features.Users)
		}
	} else {
		limits.ActiveUserCount = activeUserCount
	}
	return limits, nil
}
func (a *App) shouldTrackSingleChannelGuests() bool {
	license := a.License()
	if license == nil {
		return false
	}
	if license.IsMattermostEntry() {
		return false
	}
	cfg := a.Config()
	if cfg == nil || cfg.GuestAccountsSettings.Enable == nil {
		return false
	}
	return *cfg.GuestAccountsSettings.Enable
}
func (a *App) GetPostHistoryLimit() int64 {
	license := a.License()
	if license == nil || license.Limits == nil || license.Limits.PostHistory == 0 {
		return 0
	}
	return license.Limits.PostHistory
}
func (a *App) isAtUserLimit() (bool, *model.AppError) {
	userLimits, appErr := a.GetServerLimits()
	if appErr != nil {
		return false, appErr
	}
	if userLimits.MaxUsersHardLimit == 0 {
		return false, nil
	}
	return userLimits.ActiveUserCount >= userLimits.MaxUsersHardLimit, appErr
}