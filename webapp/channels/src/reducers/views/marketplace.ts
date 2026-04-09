import {combineReducers} from 'redux';
import type {MarketplaceApp, MarketplacePlugin} from '@mattermost/types/marketplace';
import {UserTypes} from 'mattermost-redux/action_types';
import {ActionTypes, ModalIdentifiers} from 'utils/constants';
import type {MMAction} from 'types/store';
function plugins(state: MarketplacePlugin[] = [], action: MMAction): MarketplacePlugin[] {
    switch (action.type) {
    case ActionTypes.RECEIVED_MARKETPLACE_PLUGINS:
        return action.plugins ? action.plugins : [];
    case ActionTypes.MODAL_CLOSE:
        if (action.modalId !== ModalIdentifiers.PLUGIN_MARKETPLACE) {
            return state;
        }
        return [];
    case UserTypes.LOGOUT_SUCCESS:
        return [];
    default:
        return state;
    }
}
function apps(state: MarketplaceApp[] = [], action: MMAction): MarketplaceApp[] {
    switch (action.type) {
    case ActionTypes.RECEIVED_MARKETPLACE_APPS:
        return action.apps ? action.apps : [];
    case ActionTypes.MODAL_CLOSE:
        if (action.modalId !== ModalIdentifiers.PLUGIN_MARKETPLACE) {
            return state;
        }
        return [];
    case UserTypes.LOGOUT_SUCCESS:
        return [];
    default:
        return state;
    }
}
function installing(state: {[id: string]: boolean} = {}, action: MMAction): {[id: string]: boolean} {
    switch (action.type) {
    case ActionTypes.INSTALLING_MARKETPLACE_ITEM:
        if (state[action.id]) {
            return state;
        }
        return {
            ...state,
            [action.id]: true,
        };
    case ActionTypes.INSTALLING_MARKETPLACE_ITEM_SUCCEEDED:
    case ActionTypes.INSTALLING_MARKETPLACE_ITEM_FAILED: {
        if (!Object.hasOwn(state, action.id)) {
            return state;
        }
        const newState = {...state};
        delete newState[action.id];
        return newState;
    }
    case ActionTypes.MODAL_CLOSE:
        if (action.modalId !== ModalIdentifiers.PLUGIN_MARKETPLACE) {
            return state;
        }
        return {};
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}
function errors(state: {[id: string]: string} = {}, action: MMAction): {[id: string]: string} {
    switch (action.type) {
    case ActionTypes.INSTALLING_MARKETPLACE_ITEM_FAILED:
        return {
            ...state,
            [action.id]: action.error,
        };
    case ActionTypes.INSTALLING_MARKETPLACE_ITEM_SUCCEEDED:
    case ActionTypes.INSTALLING_MARKETPLACE_ITEM: {
        if (!Object.hasOwn(state, action.id)) {
            return state;
        }
        const newState = {...state};
        delete newState[action.id];
        return newState;
    }
    case ActionTypes.MODAL_CLOSE:
        if (action.modalId !== ModalIdentifiers.PLUGIN_MARKETPLACE) {
            return state;
        }
        return {};
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}
function filter(state = '', action: MMAction): string {
    switch (action.type) {
    case ActionTypes.FILTER_MARKETPLACE_LISTING:
        return action.filter;
    case ActionTypes.MODAL_CLOSE:
        if (action.modalId !== ModalIdentifiers.PLUGIN_MARKETPLACE) {
            return state;
        }
        return '';
    case UserTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}
export default combineReducers({
    plugins,
    apps,
    installing,
    errors,
    filter,
});