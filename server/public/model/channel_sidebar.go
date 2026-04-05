package model
import (
	"encoding/json"
	"regexp"
)
type SidebarCategoryType string
type SidebarCategorySorting string
const (
	SidebarCategoryChannels       SidebarCategoryType = "channels"
	SidebarCategoryDirectMessages SidebarCategoryType = "direct_messages"
	SidebarCategoryFavorites      SidebarCategoryType = "favorites"
	SidebarCategoryCustom         SidebarCategoryType = "custom"
	MinimalSidebarSortDistance = 10
	DefaultSidebarSortOrderFavorites = 0
	DefaultSidebarSortOrderChannels  = DefaultSidebarSortOrderFavorites + MinimalSidebarSortDistance
	DefaultSidebarSortOrderDMs       = DefaultSidebarSortOrderChannels + MinimalSidebarSortDistance
	SidebarCategorySortDefault SidebarCategorySorting = ""
	SidebarCategorySortManual SidebarCategorySorting = "manual"
	SidebarCategorySortRecent SidebarCategorySorting = "recent"
	SidebarCategorySortAlphabetical SidebarCategorySorting = "alpha"
)
type SidebarCategory struct {
	Id          string                 `json:"id"`
	UserId      string                 `json:"user_id"`
	TeamId      string                 `json:"team_id"`
	SortOrder   int64                  `json:"sort_order"`
	Sorting     SidebarCategorySorting `json:"sorting"`
	Type        SidebarCategoryType    `json:"type"`
	DisplayName string                 `json:"display_name"`
	Muted       bool                   `json:"muted"`
	Collapsed   bool                   `json:"collapsed"`
}
type SidebarCategoryWithChannels struct {
	SidebarCategory
	Channels []string `json:"channel_ids"`
}
func (sc SidebarCategoryWithChannels) ChannelIds() []string {
	return sc.Channels
}
type SidebarCategoryOrder []string
type OrderedSidebarCategories struct {
	Categories SidebarCategoriesWithChannels `json:"categories"`
	Order      SidebarCategoryOrder          `json:"order"`
}
type SidebarChannel struct {
	ChannelId  string `json:"channel_id"`
	UserId     string `json:"user_id"`
	CategoryId string `json:"category_id"`
	SortOrder  int64  `json:"-"`
}
type SidebarChannels []*SidebarChannel
type SidebarCategoriesWithChannels []*SidebarCategoryWithChannels
var categoryIdPattern = regexp.MustCompile("(favorites|channels|direct_messages)_[a-z0-9]{26}_[a-z0-9]{26}")
func IsValidCategoryId(s string) bool {
	if IsValidId(s) {
		return true
	}
	return categoryIdPattern.MatchString(s)
}
func (t SidebarCategoryType) MarshalJSON() ([]byte, error) {
	return json.Marshal(string(t))
}
func (t SidebarCategorySorting) MarshalJSON() ([]byte, error) {
	return json.Marshal(string(t))
}