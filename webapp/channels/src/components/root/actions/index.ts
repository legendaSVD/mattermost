import type {History} from 'history';
import type {ServerError} from '@mattermost/types/errors';
import type {UserProfile} from '@mattermost/types/users';
import {GeneralTypes} from 'mattermost-redux/action_types';
import {logError} from 'mattermost-redux/actions/errors';
import {getClientConfig, getLicenseConfig, getFirstAdminSetupComplete} from 'mattermost-redux/actions/general';
import {getServerLimits} from 'mattermost-redux/actions/limits';
import {getMyPreferences} from 'mattermost-redux/actions/preferences';
import {getMyTeamMembers, getMyTeams, getMyTeamUnreads} from 'mattermost-redux/actions/teams';
import {getMe, getProfiles} from 'mattermost-redux/actions/users';
import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import {isCollapsedThreadsEnabled, getIsOnboardingFlowEnabled} from 'mattermost-redux/selectors/entities/preferences';
import {getActiveTeamsList} from 'mattermost-redux/selectors/entities/teams';
import {checkIsFirstAdmin, getCurrentUser, isCurrentUserSystemAdmin} from 'mattermost-redux/selectors/entities/users';
import {redirectUserToDefaultTeam, emitUserLoggedOutEvent} from 'actions/global_actions';
import {reloadPage} from 'utils/browser_utils';
import {StoragePrefixes} from 'utils/constants';
import {doesCookieContainsMMUserId} from 'utils/utils';
import type {ThunkActionFunc} from 'types/store';
import type {Translations} from 'types/store/i18n';
export type TranslationPluginFunction = (locale: string) => Translations
export function loadConfigAndMe(): ThunkActionFunc<Promise<{isLoaded: boolean; isMeRequested?: boolean}>> {
    return async (dispatch, getState) => {
        try {
            await Promise.all([
                dispatch(getClientConfig()),
                dispatch(getLicenseConfig()),
            ]);
        } catch (error) {
            dispatch(logError(error as ServerError));
            return {
                isLoaded: false,
            };
        }
        if (!doesCookieContainsMMUserId()) {
            return {
                isLoaded: true,
                isMeRequested: false,
            };
        }
        const serverVersion = getState().entities.general.serverVersion || Client4.getServerVersion();
        dispatch({type: GeneralTypes.RECEIVED_SERVER_VERSION, data: serverVersion});
        try {
            await Promise.all([
                dispatch(getMe()),
                dispatch(getMyPreferences()),
                dispatch(getMyTeams()),
                dispatch(getMyTeamMembers()),
            ]);
            dispatch(getMyTeamUnreads(isCollapsedThreadsEnabled(getState())));
            dispatch(getServerLimits());
        } catch (error) {
            dispatch(logError(error as ServerError));
            return {
                isLoaded: false,
            };
        }
        return {
            isLoaded: true,
            isMeRequested: true,
        };
    };
}
export function redirectToOnboardingOrDefaultTeam(history: History, searchParams?: URLSearchParams): ThunkActionFunc<void> {
    return async (dispatch, getState) => {
        const state = getState();
        const isUserAdmin = isCurrentUserSystemAdmin(state);
        if (!isUserAdmin) {
            redirectUserToDefaultTeam(searchParams);
            return;
        }
        const teams = getActiveTeamsList(state);
        const onboardingFlowEnabled = getIsOnboardingFlowEnabled(state);
        if (teams.length > 0 || !onboardingFlowEnabled) {
            redirectUserToDefaultTeam(searchParams);
            return;
        }
        const firstAdminSetupComplete = await dispatch(getFirstAdminSetupComplete());
        if (firstAdminSetupComplete?.data) {
            redirectUserToDefaultTeam(searchParams);
            return;
        }
        const profilesResult = await dispatch(getProfiles(0, General.PROFILE_CHUNK_SIZE, {roles: General.SYSTEM_ADMIN_ROLE}));
        if (profilesResult.error) {
            redirectUserToDefaultTeam(searchParams);
            return;
        }
        const currentUser = getCurrentUser(getState());
        const adminProfiles = profilesResult.data?.reduce(
            (acc: Record<string, UserProfile>, curr: UserProfile) => {
                acc[curr.id] = curr;
                return acc;
            },
            {},
        );
        if (adminProfiles && checkIsFirstAdmin(currentUser, adminProfiles)) {
            history.push('/preparing-workspace');
            return;
        }
        redirectUserToDefaultTeam(searchParams);
    };
}
export function handleLoginLogoutSignal(e: StorageEvent): ThunkActionFunc<void> {
    return (dispatch, getState) => {
        const isNewLocalStorageEvent = (event: StorageEvent) => event.storageArea === localStorage && event.newValue;
        if (e.key === StoragePrefixes.LOGOUT && isNewLocalStorageEvent(e)) {
            console.log('detected logout from a different tab');
            emitUserLoggedOutEvent('/', false, false);
        }
        if (e.key === StoragePrefixes.LOGIN && isNewLocalStorageEvent(e)) {
            const isLoggedIn = getCurrentUser(getState());
            if (isLoggedIn) {
                return;
            }
            function reloadOnFocus() {
                reloadPage();
            }
            window.addEventListener('focus', reloadOnFocus);
        }
    };
}