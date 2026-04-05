package model
import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)
const (
	PreferenceCategoryDirectChannelShow = "direct_channel_show"
	PreferenceCategoryGroupChannelShow  = "group_channel_show"
	PreferenceCategoryTutorialSteps = "tutorial_step"
	PreferenceCategoryAdvancedSettings = "advanced_settings"
	PreferenceCategoryFlaggedPost = "flagged_post"
	PreferenceCategoryFavoriteChannel = "favorite_channel"
	PreferenceCategorySidebarSettings = "sidebar_settings"
	PreferenceCategoryDisplaySettings = "display_settings"
	PreferenceCategorySystemNotice = "system_notice"
	PreferenceCategoryLast = "last"
	PreferenceCategoryCustomStatus = "custom_status"
	PreferenceCategoryNotifications = "notifications"
	PreferenceRecommendedNextSteps         = PreferenceCategoryRecommendedNextSteps
	PreferenceCategoryRecommendedNextSteps = "recommended_next_steps"
	PreferenceCategoryTheme = "theme"
	PreferenceNameCollapsedThreadsEnabled = "collapsed_reply_threads"
	PreferenceNameChannelDisplayMode      = "channel_display_mode"
	PreferenceNameCollapseSetting         = "collapse_previews"
	PreferenceNameMessageDisplay          = "message_display"
	PreferenceNameCollapseConsecutive     = "collapse_consecutive_messages"
	PreferenceNameColorizeUsernames       = "colorize_usernames"
	PreferenceNameNameFormat              = "name_format"
	PreferenceNameUseMilitaryTime         = "use_military_time"
	PreferenceNameShowUnreadSection = "show_unread_section"
	PreferenceLimitVisibleDmsGms    = "limit_visible_dms_gms"
	PreferenceMaxLimitVisibleDmsGmsValue = 40
	MaxPreferenceValueLength             = 20000
	PreferenceCategoryAuthorizedOAuthApp = "oauth_app"
	PreferenceNameLastChannel = "channel"
	PreferenceNameLastTeam = "team"
	PreferenceNameRecentCustomStatuses      = "recent_custom_statuses"
	PreferenceNameCustomStatusTutorialState = "custom_status_tutorial_state"
	PreferenceCustomStatusModalViewed       = "custom_status_modal_viewed"
	PreferenceNameEmailInterval = "email_interval"
	PreferenceEmailIntervalNoBatchingSeconds = "30"
	PreferenceEmailIntervalBatchingSeconds   = "900"
	PreferenceEmailIntervalImmediately       = "immediately"
	PreferenceEmailIntervalFifteen           = "fifteen"
	PreferenceEmailIntervalFifteenAsSeconds  = "900"
	PreferenceEmailIntervalHour              = "hour"
	PreferenceEmailIntervalHourAsSeconds     = "3600"
	PreferenceCloudUserEphemeralInfo         = "cloud_user_ephemeral_info"
	PreferenceNameRecommendedNextStepsHide = "hide"
)
type Preference struct {
	UserId   string `json:"user_id"`
	Category string `json:"category"`
	Name     string `json:"name"`
	Value    string `json:"value"`
}
type Preferences []Preference
func (o *Preference) IsValid() *AppError {
	if !IsValidId(o.UserId) {
		return NewAppError("Preference.IsValid", "model.preference.is_valid.id.app_error", nil, "user_id="+o.UserId, http.StatusBadRequest)
	}
	if o.Category == "" || len(o.Category) > 32 {
		return NewAppError("Preference.IsValid", "model.preference.is_valid.category.app_error", nil, "category="+o.Category, http.StatusBadRequest)
	}
	if len(o.Name) > 32 {
		return NewAppError("Preference.IsValid", "model.preference.is_valid.name.app_error", nil, "name="+o.Name, http.StatusBadRequest)
	}
	if utf8.RuneCountInString(o.Value) > MaxPreferenceValueLength {
		return NewAppError("Preference.IsValid", "model.preference.is_valid.value.app_error", nil, "value="+o.Value, http.StatusBadRequest)
	}
	if o.Category == PreferenceCategoryTheme {
		var unused map[string]string
		if err := json.NewDecoder(strings.NewReader(o.Value)).Decode(&unused); err != nil {
			return NewAppError("Preference.IsValid", "model.preference.is_valid.theme.app_error", nil, "value="+o.Value, http.StatusBadRequest).Wrap(err)
		}
	}
	if o.Category == PreferenceCategorySidebarSettings && o.Name == PreferenceLimitVisibleDmsGms {
		visibleDmsGmsValue, convErr := strconv.Atoi(o.Value)
		if convErr != nil || visibleDmsGmsValue < 1 || visibleDmsGmsValue > PreferenceMaxLimitVisibleDmsGmsValue {
			return NewAppError("Preference.IsValid", "model.preference.is_valid.limit_visible_dms_gms.app_error", nil, "value="+o.Value, http.StatusBadRequest)
		}
	}
	return nil
}
var preUpdateColorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$`)
func (o *Preference) PreUpdate() {
	if o.Category == PreferenceCategoryTheme {
		var props map[string]string
		json.NewDecoder(strings.NewReader(o.Value)).Decode(&props)
		for name, value := range props {
			if name == "image" || name == "type" || name == "codeTheme" {
				continue
			}
			if !preUpdateColorPattern.MatchString(value) {
				props[name] = "#ffffff"
			}
		}
		if b, err := json.Marshal(props); err == nil {
			o.Value = string(b)
		}
	}
}