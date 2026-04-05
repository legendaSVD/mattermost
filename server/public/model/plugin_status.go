package model
const (
	PluginStateNotRunning          = 0
	PluginStateStarting            = 1
	PluginStateRunning             = 2
	PluginStateFailedToStart       = 3
	PluginStateFailedToStayRunning = 4
	PluginStateStopping            = 5
)
type PluginStatus struct {
	PluginId    string `json:"plugin_id"`
	ClusterId   string `json:"cluster_id"`
	PluginPath  string `json:"plugin_path"`
	State       int    `json:"state"`
	Error       string `json:"error"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Version     string `json:"version"`
}
type PluginStatuses []*PluginStatus