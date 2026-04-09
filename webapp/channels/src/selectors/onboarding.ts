import {createSelector} from 'mattermost-redux/selectors/create_selector';
import {get as getString, getBool, makeGetCategory} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUser, isFirstAdmin} from 'mattermost-redux/selectors/entities/users';
import {getIsMobileView} from 'selectors/views/browser';
import {OnboardingTaskCategory, OnboardingTaskList} from 'components/onboarding_tasks';
import {RecommendedNextStepsLegacy, Preferences} from 'utils/constants';
import type {GlobalState} from 'types/store';
export function getFirstChannelName(state: GlobalState) {
    return getString(state, Preferences.AB_TEST_PREFERENCE_VALUE, RecommendedNextStepsLegacy.CREATE_FIRST_CHANNEL, '');
}
export function getShowLaunchingWorkspace(state: GlobalState) {
    return state.views.modals.showLaunchingWorkspace;
}
export type StepType = {
    id: string;
    roles: string[];
};
export const Steps: StepType[] = [
    {
        id: RecommendedNextStepsLegacy.COMPLETE_PROFILE,
        roles: [],
    },
    {
        id: RecommendedNextStepsLegacy.TEAM_SETUP,
        roles: ['first_admin'],
    },
    {
        id: RecommendedNextStepsLegacy.NOTIFICATION_SETUP,
        roles: ['system_user'],
    },
    {
        id: RecommendedNextStepsLegacy.PREFERENCES_SETUP,
        roles: ['system_user'],
    },
    {
        id: RecommendedNextStepsLegacy.INVITE_MEMBERS,
        roles: ['system_admin', 'system_user'],
    },
    {
        id: RecommendedNextStepsLegacy.DOWNLOAD_APPS,
        roles: [],
    },
];
export function isStepForUser(step: StepType, roles: string): boolean {
    const userRoles = roles?.split(' ');
    return (
        userRoles?.some((role) => step.roles.includes(role)) ||
          step.roles.length === 0
    );
}
const getSteps = createSelector(
    'getSteps',
    (state: GlobalState) => getCurrentUser(state),
    (state: GlobalState) => isFirstAdmin(state),
    (currentUser, firstAdmin) => {
        const roles = firstAdmin ? `first_admin ${currentUser?.roles}` : currentUser?.roles;
        return Steps.filter((step) => isStepForUser(step, roles));
    },
);
const getNextStepsPreferences = makeGetCategory('getNextStepsPreferences', Preferences.RECOMMENDED_NEXT_STEPS);
export const getOnboardingTaskPreferences = makeGetCategory('getOnboardingTaskPreferences', OnboardingTaskCategory);
export const legacyNextStepsNotFinished = createSelector(
    'legacyNextStepsNotFinished',
    getNextStepsPreferences,
    (state: GlobalState) => getCurrentUser(state),
    (state: GlobalState) => isFirstAdmin(state),
    (state: GlobalState) => getSteps(state),
    (stepPreferences, currentUser, firstAdmin, mySteps) => {
        const roles = firstAdmin ? `first_admin ${currentUser?.roles}` : currentUser?.roles;
        const checkPref = (step: StepType) => stepPreferences.some((pref) => (pref.name === step.id && pref.value === 'true') || !isStepForUser(step, roles));
        return !mySteps.every(checkPref);
    },
);
export const hasLegacyNextStepsPreferences = createSelector(
    'hasLegacyNextStepsPreferences',
    getNextStepsPreferences,
    (state: GlobalState) => getSteps(state),
    (stepPreferences, mySteps) => {
        const checkPref = (step: StepType) => stepPreferences.some((pref) => (pref.name === step.id));
        return mySteps.some(checkPref);
    },
);
export const getShowTaskListBool = createSelector(
    'getShowTaskListBool',
    getOnboardingTaskPreferences,
    getNextStepsPreferences,
    getIsMobileView,
    (state: GlobalState) => getBool(state, OnboardingTaskCategory, OnboardingTaskList.ONBOARDING_TASK_LIST_SHOW),
    (state: GlobalState) => hasLegacyNextStepsPreferences(state),
    (onboardingPreferences, legacyStepsPreferences, isMobileView, taskListStatus, hasAnyOfTheLegacyStepsPreferences) => {
        const hasUserStartedOnboardingTaskListProcess = onboardingPreferences?.some((pref) =>
            pref.name === OnboardingTaskList.ONBOARDING_TASK_LIST_SHOW || pref.name === OnboardingTaskList.ONBOARDING_TASK_LIST_OPEN);
        if (hasUserStartedOnboardingTaskListProcess) {
            return [(taskListStatus && !isMobileView), false];
        }
        const hasSkipLegacyStepsPreference = legacyStepsPreferences.some((pref) => (pref.name === RecommendedNextStepsLegacy.SKIP));
        const hideLegacyStepsSetToFalse = legacyStepsPreferences.some((pref) => (pref.name === RecommendedNextStepsLegacy.HIDE && pref.value === 'false'));
        const areFirstUserPrefs = !hasSkipLegacyStepsPreference && hideLegacyStepsSetToFalse && !hasAnyOfTheLegacyStepsPreferences;
        const completelyNewUserForOnboarding = !hasUserStartedOnboardingTaskListProcess && areFirstUserPrefs;
        if (completelyNewUserForOnboarding) {
            return [(!isMobileView), true];
        }
        const hasSkippedLegacySteps = legacyStepsPreferences.some((pref) => (pref.name === RecommendedNextStepsLegacy.SKIP && pref.value === 'true'));
        const hasCompletedLegacySteps = legacyStepsPreferences.some((pref) => (pref.name === RecommendedNextStepsLegacy.HIDE && pref.value === 'true'));
        const existingUserHasntFinishedNorSkippedLegacyNextSteps = !hasSkippedLegacySteps && !hasCompletedLegacySteps;
        const showTaskList = existingUserHasntFinishedNorSkippedLegacyNextSteps && !isMobileView;
        const firstTimeOnboarding = existingUserHasntFinishedNorSkippedLegacyNextSteps;
        return [showTaskList, firstTimeOnboarding];
    },
);