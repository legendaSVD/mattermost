package model
import (
	"encoding/json"
	"io"
)
const (
	CurrentSupportPacketVersion = 2
	SupportPacketErrorFile      = "warning.txt"
)
type SupportPacketDiagnostics struct {
	Version int `yaml:"version"`
	License struct {
		Company      string `yaml:"company"`
		Users        int    `yaml:"users"`
		SkuShortName string `yaml:"sku_short_name"`
		IsTrial      bool   `yaml:"is_trial,omitempty"`
		IsGovSKU     bool   `yaml:"is_gov_sku,omitempty"`
	} `yaml:"license"`
	Server struct {
		OS               string `yaml:"os"`
		Architecture     string `yaml:"architecture"`
		CPUCores         int    `yaml:"cpu_cores"`
		TotalMemoryMB    uint64 `yaml:"total_memory_mb"`
		Hostname         string `yaml:"hostname"`
		Version          string `yaml:"version"`
		BuildHash        string `yaml:"build_hash"`
		InstallationType string `yaml:"installation_type"`
	} `yaml:"server"`
	Config struct {
		Source string `yaml:"store_type"`
	} `yaml:"config"`
	Database struct {
		Type              string `yaml:"type"`
		Version           string `yaml:"version"`
		SchemaVersion     string `yaml:"schema_version"`
		MasterConnectios  int    `yaml:"master_connections"`
		ReplicaConnectios int    `yaml:"replica_connections"`
		SearchConnections int    `yaml:"search_connections"`
	} `yaml:"database"`
	FileStore struct {
		Status string `yaml:"file_status"`
		Error  string `yaml:"erorr,omitempty"`
		Driver string `yaml:"file_driver"`
	} `yaml:"file_store"`
	Websocket struct {
		Connections int `yaml:"connections"`
	} `yaml:"websocket"`
	Cluster struct {
		ID            string `yaml:"id"`
		NumberOfNodes int    `yaml:"number_of_nodes"`
	} `yaml:"cluster"`
	LDAP struct {
		Status        string `yaml:"status,omitempty"`
		Error         string `yaml:"error,omitempty"`
		ServerName    string `yaml:"server_name,omitempty"`
		ServerVersion string `yaml:"server_version,omitempty"`
	} `yaml:"ldap"`
	SAML struct {
		ProviderType string `yaml:"provider_type,omitempty"`
	} `yaml:"saml"`
	ElasticSearch struct {
		Backend       string   `yaml:"backend,omitempty"`
		ServerVersion string   `yaml:"server_version,omitempty"`
		ServerPlugins []string `yaml:"server_plugins,omitempty"`
		Error         string   `yaml:"error,omitempty"`
	} `yaml:"elastic"`
}
type SupportPacketStats struct {
	RegisteredUsers    int64 `yaml:"registered_users"`
	ActiveUsers        int64 `yaml:"active_users"`
	DailyActiveUsers   int64 `yaml:"daily_active_users"`
	MonthlyActiveUsers int64 `yaml:"monthly_active_users"`
	DeactivatedUsers   int64 `yaml:"deactivated_users"`
	Guests             int64 `yaml:"guests"`
	BotAccounts        int64 `yaml:"bot_accounts"`
	Posts              int64 `yaml:"posts"`
	Channels           int64 `yaml:"channels"`
	Teams              int64 `yaml:"teams"`
	SlashCommands      int64 `yaml:"slash_commands"`
	IncomingWebhooks   int64 `yaml:"incoming_webhooks"`
	OutgoingWebhooks   int64 `yaml:"outgoing_webhooks"`
}
type SupportPacketJobList struct {
	LDAPSyncJobs               []*Job `yaml:"ldap_sync_jobs"`
	DataRetentionJobs          []*Job `yaml:"data_retention_jobs"`
	MessageExportJobs          []*Job `yaml:"message_export_jobs"`
	ElasticPostIndexingJobs    []*Job `yaml:"elastic_post_indexing_jobs"`
	ElasticPostAggregationJobs []*Job `yaml:"elastic_post_aggregation_jobs"`
	MigrationJobs              []*Job `yaml:"migration_jobs"`
}
type SupportPacketPermissionInfo struct {
	Roles   []*Role   `yaml:"roles"`
	Schemes []*Scheme `yaml:"schemes"`
}
type SupportPacketConfig struct {
	*Config
	FeatureFlags FeatureFlags `json:"FeatureFlags"`
}
type SupportPacketPluginList struct {
	Enabled  []Manifest `json:"enabled"`
	Disabled []Manifest `json:"disabled"`
}
type SupportPacketDatabaseSchema struct {
	DatabaseCollation string          `yaml:"database_collation,omitempty"`
	DatabaseEncoding  string          `yaml:"database_encoding,omitempty"`
	Tables            []DatabaseTable `yaml:"tables"`
}
type DatabaseTable struct {
	Name      string            `yaml:"name"`
	Collation string            `yaml:"collation,omitempty"`
	Options   map[string]string `yaml:"options,omitempty"`
	Columns   []DatabaseColumn  `yaml:"columns"`
	Indexes   []DatabaseIndex   `yaml:"indexes,omitempty"`
}
type DatabaseColumn struct {
	Name       string `yaml:"name"`
	DataType   string `yaml:"data_type"`
	MaxLength  int64  `yaml:"max_length,omitempty"`
	IsNullable bool   `yaml:"is_nullable"`
}
type DatabaseIndex struct {
	Name       string `yaml:"name"`
	Definition string `yaml:"definition"`
}
type FileData struct {
	Filename string
	Body     []byte
}
type SupportPacketOptions struct {
	IncludeLogs   bool     `json:"include_logs"`
	PluginPackets []string `json:"plugin_packets"`
}
func SupportPacketOptionsFromReader(reader io.Reader) (*SupportPacketOptions, error) {
	var r *SupportPacketOptions
	err := json.NewDecoder(reader).Decode(&r)
	if err != nil {
		return nil, err
	}
	return r, nil
}