package model
import (
	"reflect"
	"strconv"
)
type FeatureFlags struct {
	TestFeature string
	TestBoolFeature bool
	EnableRemoteClusterService bool
	EnableSharedChannelsDMs bool
	EnableSharedChannelsPlugins bool
	EnableSharedChannelsMemberSync bool
	EnableSyncAllUsersForRemoteCluster bool
	AppsEnabled bool
	PermalinkPreviews bool
	NormalizeLdapDNs bool
	WysiwygEditor bool
	OnboardingTourTips bool
	DeprecateCloudFree bool
	EnableExportDirectDownload bool
	MoveThreadsEnabled bool
	StreamlinedMarketplace bool
	CloudIPFiltering bool
	ConsumePostHook  bool
	CloudAnnualRenewals    bool
	CloudDedicatedExportUI bool
	ChannelBookmarks bool
	WebSocketEventScope bool
	NotificationMonitoring bool
	ExperimentalAuditSettingsSystemConsoleUI bool
	CustomProfileAttributes bool
	AttributeBasedAccessControl bool
	ContentFlagging bool
	InteractiveDialogAppsForm bool
	EnableMattermostEntry bool
	MobileSSOCodeExchange bool
	AutoTranslation bool
	BurnOnRead bool
	EnableAIPluginBridge bool
	EnableAIRecaps bool
	CJKSearch bool
}
func (f *FeatureFlags) SetDefaults() {
	f.TestFeature = "off"
	f.TestBoolFeature = false
	f.EnableRemoteClusterService = false
	f.EnableSharedChannelsDMs = false
	f.EnableSharedChannelsMemberSync = false
	f.EnableSyncAllUsersForRemoteCluster = false
	f.EnableSharedChannelsPlugins = true
	f.AppsEnabled = false
	f.NormalizeLdapDNs = false
	f.DeprecateCloudFree = false
	f.WysiwygEditor = false
	f.OnboardingTourTips = true
	f.EnableExportDirectDownload = false
	f.MoveThreadsEnabled = false
	f.StreamlinedMarketplace = true
	f.CloudIPFiltering = false
	f.ConsumePostHook = false
	f.CloudAnnualRenewals = false
	f.CloudDedicatedExportUI = false
	f.ChannelBookmarks = true
	f.WebSocketEventScope = true
	f.NotificationMonitoring = true
	f.ExperimentalAuditSettingsSystemConsoleUI = true
	f.CustomProfileAttributes = true
	f.AttributeBasedAccessControl = true
	f.ContentFlagging = true
	f.InteractiveDialogAppsForm = true
	f.EnableMattermostEntry = true
	f.MobileSSOCodeExchange = false
	f.AutoTranslation = true
	f.BurnOnRead = true
	f.EnableAIPluginBridge = false
	f.EnableAIRecaps = false
	f.CJKSearch = false
}
func (f *FeatureFlags) ToMap() map[string]string {
	refStructVal := reflect.ValueOf(*f)
	refStructType := reflect.TypeFor[FeatureFlags]()
	ret := make(map[string]string)
	for i := 0; i < refStructVal.NumField(); i++ {
		refFieldVal := refStructVal.Field(i)
		if !refFieldVal.IsValid() {
			continue
		}
		refFieldType := refStructType.Field(i)
		switch refFieldType.Type.Kind() {
		case reflect.Bool:
			ret[refFieldType.Name] = strconv.FormatBool(refFieldVal.Bool())
		default:
			ret[refFieldType.Name] = refFieldVal.String()
		}
	}
	return ret
}