package app
import (
	"net/http"
	"github.com/Masterminds/semver/v3"
	agentclient "github.com/mattermost/mattermost-plugin-ai/public/bridgeclient"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
const (
	aiPluginID                  = "mattermost-ai"
	minAIPluginVersionForBridge = "1.5.0"
)
func (a *App) GetBridgeClient(userID string) *agentclient.Client {
	return agentclient.NewClientFromApp(a, userID)
}
func (a *App) GetAIPluginBridgeStatus(rctx request.CTX) (bool, string) {
	pluginsEnvironment := a.GetPluginsEnvironment()
	if pluginsEnvironment == nil {
		rctx.Logger().Debug("AI plugin bridge not available - plugin environment not initialized")
		return false, "app.agents.bridge.not_available.plugin_env_not_initialized"
	}
	if !pluginsEnvironment.IsActive(aiPluginID) {
		rctx.Logger().Debug("AI plugin bridge not available - plugin is not active or not installed",
			mlog.String("plugin_id", aiPluginID),
		)
		return false, "app.agents.bridge.not_available.plugin_not_active"
	}
	plugins := pluginsEnvironment.Active()
	for _, plugin := range plugins {
		if plugin.Manifest != nil && plugin.Manifest.Id == aiPluginID {
			pluginVersion, err := semver.StrictNewVersion(plugin.Manifest.Version)
			if err != nil {
				rctx.Logger().Debug("AI plugin bridge not available - failed to parse plugin version",
					mlog.String("plugin_id", aiPluginID),
					mlog.String("version", plugin.Manifest.Version),
					mlog.Err(err),
				)
				return false, "app.agents.bridge.not_available.plugin_version_parse_failed"
			}
			minVersion, err := semver.StrictNewVersion(minAIPluginVersionForBridge)
			if err != nil {
				return false, "app.agents.bridge.not_available.min_version_parse_failed"
			}
			if pluginVersion.LessThan(minVersion) {
				rctx.Logger().Debug("AI plugin bridge not available - plugin version is too old",
					mlog.String("plugin_id", aiPluginID),
					mlog.String("current_version", plugin.Manifest.Version),
					mlog.String("minimum_version", minAIPluginVersionForBridge),
				)
				return false, "app.agents.bridge.not_available.plugin_version_too_old"
			}
			return true, ""
		}
	}
	return false, "app.agents.bridge.not_available.plugin_not_registered"
}
func (a *App) GetAgents(rctx request.CTX, userID string) ([]agentclient.BridgeAgentInfo, *model.AppError) {
	if available, _ := a.GetAIPluginBridgeStatus(rctx); !available {
		return []agentclient.BridgeAgentInfo{}, nil
	}
	sessionUserID := ""
	if session := rctx.Session(); session != nil {
		sessionUserID = session.UserId
	}
	client := a.GetBridgeClient(sessionUserID)
	agents, err := client.GetAgents(userID)
	if err != nil {
		rctx.Logger().Error("Failed to get agents from bridge",
			mlog.Err(err),
			mlog.String("user_id", userID),
		)
		return nil, model.NewAppError("GetAgents", "app.agents.get_agents.bridge_call_failed", nil, err.Error(), http.StatusInternalServerError)
	}
	return agents, nil
}
func (a *App) GetUsersForAgents(rctx request.CTX, userID string) ([]*model.User, *model.AppError) {
	agents, appErr := a.GetAgents(rctx, userID)
	if appErr != nil {
		return nil, appErr
	}
	if len(agents) == 0 {
		return []*model.User{}, nil
	}
	users := make([]*model.User, 0, len(agents))
	for _, agent := range agents {
		user, err := a.Srv().Store().User().GetByUsername(agent.Username)
		if err != nil {
			rctx.Logger().Warn("Failed to get user for agent",
				mlog.Err(err),
				mlog.String("agent_id", agent.ID),
				mlog.String("username", agent.Username),
			)
			continue
		}
		users = append(users, user)
	}
	return users, nil
}
func (a *App) GetLLMServices(rctx request.CTX, userID string) ([]agentclient.BridgeServiceInfo, *model.AppError) {
	if available, _ := a.GetAIPluginBridgeStatus(rctx); !available {
		return []agentclient.BridgeServiceInfo{}, nil
	}
	sessionUserID := ""
	if session := rctx.Session(); session != nil {
		sessionUserID = session.UserId
	}
	client := a.GetBridgeClient(sessionUserID)
	services, err := client.GetServices(userID)
	if err != nil {
		rctx.Logger().Error("Failed to get LLM services from bridge",
			mlog.Err(err),
			mlog.String("user_id", userID),
		)
		return nil, model.NewAppError("GetLLMServices", "app.agents.get_services.bridge_call_failed", nil, err.Error(), http.StatusInternalServerError)
	}
	return services, nil
}