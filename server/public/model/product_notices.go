package model
import (
	"encoding/json"
	"io"
	"github.com/pkg/errors"
)
type ProductNotices []ProductNotice
func (r *ProductNotices) Marshal() ([]byte, error) {
	return json.Marshal(r)
}
func UnmarshalProductNotices(data []byte) (ProductNotices, error) {
	var r ProductNotices
	err := json.Unmarshal(data, &r)
	return r, err
}
type ProductNotice struct {
	Conditions        Conditions                       `json:"conditions"`
	ID                string                           `json:"id"`
	LocalizedMessages map[string]NoticeMessageInternal `json:"localizedMessages"`
	Repeatable        *bool                            `json:"repeatable,omitempty"`
}
func (n *ProductNotice) SysAdminOnly() bool {
	return n.Conditions.Audience != nil && *n.Conditions.Audience == NoticeAudienceSysadmin
}
func (n *ProductNotice) TeamAdminOnly() bool {
	return n.Conditions.Audience != nil && *n.Conditions.Audience == NoticeAudienceTeamAdmin
}
type Conditions struct {
	Audience              *NoticeAudience     `json:"audience,omitempty"`
	ClientType            *NoticeClientType   `json:"clientType,omitempty"`
	DesktopVersion        []string            `json:"desktopVersion,omitempty"`
	DisplayDate           *string             `json:"displayDate,omitempty"`
	InstanceType          *NoticeInstanceType `json:"instanceType,omitempty"`
	MobileVersion         []string            `json:"mobileVersion,omitempty"`
	NumberOfPosts         *int64              `json:"numberOfPosts,omitempty"`
	NumberOfUsers         *int64              `json:"numberOfUsers,omitempty"`
	ServerConfig          map[string]any      `json:"serverConfig,omitempty"`
	ServerVersion         []string            `json:"serverVersion,omitempty"`
	Sku                   *NoticeSKU          `json:"sku,omitempty"`
	UserConfig            map[string]any      `json:"userConfig,omitempty"`
	DeprecatingDependency *ExternalDependency `json:"deprecating_dependency,omitempty"`
}
type NoticeMessageInternal struct {
	Action      *NoticeAction `json:"action,omitempty"`
	ActionParam *string       `json:"actionParam,omitempty"`
	ActionText  *string       `json:"actionText,omitempty"`
	Description string        `json:"description"`
	Image       *string       `json:"image,omitempty"`
	Title       string        `json:"title"`
}
type NoticeMessages []NoticeMessage
type NoticeMessage struct {
	NoticeMessageInternal
	ID            string `json:"id"`
	SysAdminOnly  bool   `json:"sysAdminOnly"`
	TeamAdminOnly bool   `json:"teamAdminOnly"`
}
func (r *NoticeMessages) Marshal() ([]byte, error) {
	return json.Marshal(r)
}
func UnmarshalProductNoticeMessages(data io.Reader) (NoticeMessages, error) {
	var r NoticeMessages
	err := json.NewDecoder(data).Decode(&r)
	return r, err
}
type NoticeAudience string
func NewNoticeAudience(s NoticeAudience) *NoticeAudience {
	return &s
}
func (a *NoticeAudience) Matches(sysAdmin bool, teamAdmin bool) bool {
	switch *a {
	case NoticeAudienceAll:
		return true
	case NoticeAudienceMember:
		return !sysAdmin && !teamAdmin
	case NoticeAudienceSysadmin:
		return sysAdmin
	case NoticeAudienceTeamAdmin:
		return teamAdmin
	}
	return false
}
const (
	NoticeAudienceAll       NoticeAudience = "all"
	NoticeAudienceMember    NoticeAudience = "member"
	NoticeAudienceSysadmin  NoticeAudience = "sysadmin"
	NoticeAudienceTeamAdmin NoticeAudience = "teamadmin"
)
type NoticeClientType string
func NewNoticeClientType(s NoticeClientType) *NoticeClientType { return &s }
func (c *NoticeClientType) Matches(other NoticeClientType) bool {
	switch *c {
	case NoticeClientTypeAll:
		return true
	case NoticeClientTypeMobile:
		return other == NoticeClientTypeMobileIos || other == NoticeClientTypeMobileAndroid
	default:
		return *c == other
	}
}
const (
	NoticeClientTypeAll           NoticeClientType = "all"
	NoticeClientTypeDesktop       NoticeClientType = "desktop"
	NoticeClientTypeMobile        NoticeClientType = "mobile"
	NoticeClientTypeMobileAndroid NoticeClientType = "mobile-android"
	NoticeClientTypeMobileIos     NoticeClientType = "mobile-ios"
	NoticeClientTypeWeb           NoticeClientType = "web"
)
func NoticeClientTypeFromString(s string) (NoticeClientType, error) {
	switch s {
	case "web":
		return NoticeClientTypeWeb, nil
	case "mobile-ios":
		return NoticeClientTypeMobileIos, nil
	case "mobile-android":
		return NoticeClientTypeMobileAndroid, nil
	case "desktop":
		return NoticeClientTypeDesktop, nil
	}
	return NoticeClientTypeAll, errors.New("Invalid client type supplied")
}
type NoticeInstanceType string
func NewNoticeInstanceType(n NoticeInstanceType) *NoticeInstanceType { return &n }
func (t *NoticeInstanceType) Matches(isCloud bool) bool {
	if *t == NoticeInstanceTypeBoth {
		return true
	}
	if *t == NoticeInstanceTypeCloud && !isCloud {
		return false
	}
	if *t == NoticeInstanceTypeOnPrem && isCloud {
		return false
	}
	return true
}
const (
	NoticeInstanceTypeBoth   NoticeInstanceType = "both"
	NoticeInstanceTypeCloud  NoticeInstanceType = "cloud"
	NoticeInstanceTypeOnPrem NoticeInstanceType = "onprem"
)
type NoticeSKU string
func NewNoticeSKU(s NoticeSKU) *NoticeSKU { return &s }
func (c *NoticeSKU) Matches(s string) bool {
	switch *c {
	case NoticeSKUAll:
		return true
	case NoticeSKUE0, NoticeSKUTeam:
		return s == ""
	default:
		return s == string(*c)
	}
}
const (
	NoticeSKUE0   NoticeSKU = "e0"
	NoticeSKUE10  NoticeSKU = "e10"
	NoticeSKUE20  NoticeSKU = "e20"
	NoticeSKUAll  NoticeSKU = "all"
	NoticeSKUTeam NoticeSKU = "team"
)
type NoticeAction string
const (
	URL NoticeAction = "url"
)
type ProductNoticeViewState struct {
	UserId    string
	NoticeId  string
	Viewed    int32
	Timestamp int64
}
type ExternalDependency struct {
	Name           string `json:"name"`
	MinimumVersion string `json:"minimum_version"`
}