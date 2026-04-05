import type {IncomingWebhook, IncomingWebhooksWithCount, OutgoingWebhook, Command, OAuthApp, OutgoingOAuthConnection, DialogSubmission, SubmitDialogResponse} from '@mattermost/types/integrations';
import * as IntegrationActions from 'mattermost-redux/actions/integrations';
import {getProfilesByIds} from 'mattermost-redux/actions/users';
import {appsEnabled} from 'mattermost-redux/selectors/entities/apps';
import {getDialogArguments} from 'mattermost-redux/selectors/entities/integrations';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId, getUser} from 'mattermost-redux/selectors/entities/users';
import type {ActionFuncAsync} from 'types/store';
const DEFAULT_PAGE_SIZE = 100;
export function loadIncomingHooksAndProfilesForTeam(teamId: string, page = 0, perPage = DEFAULT_PAGE_SIZE, includeTotalCount = false): ActionFuncAsync<IncomingWebhook[] | IncomingWebhooksWithCount> {
    return async (dispatch) => {
        const {data} = await dispatch(IntegrationActions.getIncomingHooks(teamId, page, perPage, includeTotalCount));
        if (data) {
            const isWebhooksWithCount = IntegrationActions.isIncomingWebhooksWithCount(data);
            const hooks = isWebhooksWithCount ? (data as IncomingWebhooksWithCount).incoming_webhooks : data;
            dispatch(loadProfilesForIncomingHooks(hooks as IncomingWebhook[]));
        }
        return {data};
    };
}
export function loadProfilesForIncomingHooks(hooks: IncomingWebhook[]): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const profilesToLoad: {[key: string]: boolean} = {};
        for (let i = 0; i < hooks.length; i++) {
            const hook = hooks[i];
            if (!getUser(state, hook.user_id)) {
                profilesToLoad[hook.user_id] = true;
            }
        }
        const list = Object.keys(profilesToLoad);
        if (list.length === 0) {
            return {data: null};
        }
        dispatch(getProfilesByIds(list));
        return {data: null};
    };
}
export function loadOutgoingHooksAndProfilesForTeam(teamId: string, page = 0, perPage = DEFAULT_PAGE_SIZE): ActionFuncAsync<OutgoingWebhook[]> {
    return async (dispatch) => {
        const {data} = await dispatch(IntegrationActions.getOutgoingHooks('', teamId, page, perPage));
        if (data) {
            dispatch(loadProfilesForOutgoingHooks(data));
        }
        return {data};
    };
}
export function loadProfilesForOutgoingHooks(hooks: OutgoingWebhook[]): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const profilesToLoad: {[key: string]: boolean} = {};
        for (let i = 0; i < hooks.length; i++) {
            const hook = hooks[i];
            if (!getUser(state, hook.creator_id)) {
                profilesToLoad[hook.creator_id] = true;
            }
        }
        const list = Object.keys(profilesToLoad);
        if (list.length === 0) {
            return {data: null};
        }
        dispatch(getProfilesByIds(list));
        return {data: null};
    };
}
export function loadCommandsAndProfilesForTeam(teamId: string): ActionFuncAsync {
    return async (dispatch) => {
        const {data} = await dispatch(IntegrationActions.getCustomTeamCommands(teamId));
        if (data) {
            dispatch(loadProfilesForCommands(data));
        }
        return {data};
    };
}
export function loadProfilesForCommands(commands: Command[]): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const profilesToLoad: {[key: string]: boolean} = {};
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            if (!getUser(state, command.creator_id)) {
                profilesToLoad[command.creator_id] = true;
            }
        }
        const list = Object.keys(profilesToLoad);
        if (list.length === 0) {
            return {data: null};
        }
        dispatch(getProfilesByIds(list));
        return {data: null};
    };
}
export function loadOAuthAppsAndProfiles(page = 0, perPage = DEFAULT_PAGE_SIZE): ActionFuncAsync {
    return async (dispatch, getState) => {
        if (appsEnabled(getState())) {
            dispatch(IntegrationActions.getAppsOAuthAppIDs());
        }
        const {data} = await dispatch(IntegrationActions.getOAuthApps(page, perPage));
        if (data) {
            dispatch(loadProfilesForOAuthApps(data));
        }
        return {data: null};
    };
}
export function loadProfilesForOAuthApps(apps: OAuthApp[]): ActionFuncAsync {
    return async (dispatch, getState) => {
        const state = getState();
        const profilesToLoad: {[key: string]: boolean} = {};
        for (let i = 0; i < apps.length; i++) {
            const app = apps[i];
            if (!getUser(state, app.creator_id)) {
                profilesToLoad[app.creator_id] = true;
            }
        }
        const list = Object.keys(profilesToLoad);
        if (list.length === 0) {
            return {data: null};
        }
        dispatch(getProfilesByIds(list));
        return {data: null};
    };
}
export function loadOutgoingOAuthConnectionsAndProfiles(teamId: string, page = 0, perPage = DEFAULT_PAGE_SIZE): ActionFuncAsync<null> {
    return async (dispatch) => {
        const {data} = await dispatch(IntegrationActions.getOutgoingOAuthConnections(teamId, page, perPage));
        if (data) {
            dispatch(loadProfilesForOutgoingOAuthConnections(data));
        }
        return {data: null};
    };
}
export function loadProfilesForOutgoingOAuthConnections(connections: OutgoingOAuthConnection[]): ActionFuncAsync<null> {
    return async (dispatch, getState) => {
        const state = getState();
        const profilesToLoad: {[key: string]: boolean} = {};
        for (let i = 0; i < connections.length; i++) {
            const app = connections[i];
            if (!getUser(state, app.creator_id)) {
                profilesToLoad[app.creator_id] = true;
            }
        }
        const list = Object.keys(profilesToLoad);
        if (list.length === 0) {
            return {data: null};
        }
        dispatch(getProfilesByIds(list));
        return {data: null};
    };
}
export function submitInteractiveDialog(submission: DialogSubmission): ActionFuncAsync<SubmitDialogResponse> {
    return async (dispatch, getState) => {
        const state = getState();
        const dialogArguments = getDialogArguments(state);
        if (dialogArguments && dialogArguments.channel_id) {
            submission.channel_id = dialogArguments.channel_id;
        }
        submission.user_id = getCurrentUserId(state);
        submission.team_id = getCurrentTeamId(state);
        const {data, error} = await dispatch(IntegrationActions.submitInteractiveDialog(submission));
        if (error) {
            return {error};
        }
        return {data};
    };
}
export function lookupInteractiveDialog(submission: DialogSubmission): ActionFuncAsync<{items: Array<{text: string; value: string}>}> {
    return async (dispatch, getState) => {
        const state = getState();
        const dialogArguments = getDialogArguments(state);
        if (dialogArguments && dialogArguments.channel_id) {
            submission.channel_id = dialogArguments.channel_id;
        }
        const {data, error} = await dispatch(IntegrationActions.lookupInteractiveDialog(submission));
        if (error) {
            return {error};
        }
        return {data};
    };
}