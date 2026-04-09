import type {PluginManifest} from '@mattermost/types/plugins';
import {hideRHSPlugin as hideRHSPluginAction} from 'actions/views/rhs';
import {getPluggableId} from 'selectors/rhs';
import {ActionTypes} from 'utils/constants';
import type {GlobalState, ActionFunc} from 'types/store';
export const removeWebappPlugin = (manifest: PluginManifest): ActionFunc<boolean, GlobalState> => {
    return (dispatch) => {
        dispatch(hideRHSPlugin(manifest.id));
        dispatch({type: ActionTypes.REMOVED_WEBAPP_PLUGIN, data: manifest});
        return {data: true};
    };
};
const hideRHSPlugin = (manifestId: string): ActionFunc<boolean, GlobalState> => {
    return (dispatch, getState) => {
        const state = getState();
        const rhsPlugins = state.plugins.components.RightHandSidebarComponent || [];
        const pluggableId = getPluggableId(state);
        const pluginComponent = rhsPlugins.find((element) => element.id === pluggableId && element.pluginId === manifestId);
        if (pluginComponent) {
            dispatch(hideRHSPluginAction(pluggableId));
        }
        return {data: true};
    };
};