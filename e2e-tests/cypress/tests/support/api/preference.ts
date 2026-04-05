import {ChainableT} from 'tests/types';
import {PreferenceType} from '@mattermost/types/preferences';
import theme from '../../fixtures/theme.json';
function apiSaveUserPreference(preferences: PreferenceType[] = [], userId = 'me'): ChainableT<any> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/users/${userId}/preferences`,
        method: 'PUT',
        body: preferences,
    });
}
Cypress.Commands.add('apiSaveUserPreference', apiSaveUserPreference);
function apiSaveClockDisplayModeTo24HourPreference(is24Hour = true): ChainableT<any> {
    return cy.getCookie('MMUSERID').then((cookie) => {
        const preference = {
            user_id: cookie.value,
            category: 'display_settings',
            name: 'use_military_time',
            value: is24Hour.toString(),
        };
        return cy.apiSaveUserPreference([preference]);
    });
}
Cypress.Commands.add('apiSaveClockDisplayModeTo24HourPreference', apiSaveClockDisplayModeTo24HourPreference);
function apiSaveChannelDisplayModePreference(value = 'full') {
    return cy.getCookie('MMUSERID').then((cookie) => {
        const preference = {
            user_id: cookie.value,
            category: 'display_settings',
            name: 'channel_display_mode',
            value,
        };
        return cy.apiSaveUserPreference([preference]);
    });
}
Cypress.Commands.add('apiSaveChannelDisplayModePreference', apiSaveChannelDisplayModePreference);
function apiSaveMessageDisplayPreference(value = 'clean') {
    return cy.getCookie('MMUSERID').then((cookie) => {
        const preference = {
            user_id: cookie.value,
            category: 'display_settings',
            name: 'message_display',
            value,
        };
        return cy.apiSaveUserPreference([preference]);
    });
}
Cypress.Commands.add('apiSaveMessageDisplayPreference', apiSaveMessageDisplayPreference);
function apiSaveTeammateNameDisplayPreference(value = 'username') {
    return cy.getCookie('MMUSERID').then((cookie) => {
        const preference = {
            user_id: cookie.value,
            category: 'display_settings',
            name: 'name_format',
            value,
        };
        return cy.apiSaveUserPreference([preference]);
    });
}
Cypress.Commands.add('apiSaveTeammateNameDisplayPreference', apiSaveTeammateNameDisplayPreference);
function apiSaveThemePreference(value = JSON.stringify(theme.default)) {
    return cy.getCookie('MMUSERID').then((cookie) => {
        const preference = {
            user_id: cookie.value,
            category: 'theme',
            name: '',
            value,
        };
        return cy.apiSaveUserPreference([preference]);
    });
}
Cypress.Commands.add('apiSaveThemePreference', apiSaveThemePreference);
const defaultSidebarSettingPreference = {
    grouping: 'by_type',
    unreads_at_top: 'true',
    favorite_at_top: 'true',
    sorting: 'alpha',
};
function apiSaveSidebarSettingPreference(value = {}) {
    return cy.getCookie('MMUSERID').then((cookie) => {
        const newValue = {
            ...defaultSidebarSettingPreference,
            ...value,
        };
        const preference = {
            user_id: cookie.value,
            category: 'sidebar_settings',
            name: '',
            value: JSON.stringify(newValue),
        };
        return cy.apiSaveUserPreference([preference]);
    });
}
Cypress.Commands.add('apiSaveSidebarSettingPreference', apiSaveSidebarSettingPreference);
function apiSaveLinkPreviewsPreference(show = 'true') {
    return cy.getCookie('MMUSERID').then((cookie) => {
        const preference = {
            user_id: cookie.value,
            category: 'display_settings',
            name: 'link_previews',
            value: show,
        };
        return cy.apiSaveUserPreference([preference]);
    });
}
Cypress.Commands.add('apiSaveLinkPreviewsPreference', apiSaveLinkPreviewsPreference);
function apiSaveCollapsePreviewsPreference(collapse = 'true') {
    return cy.getCookie('MMUSERID').then((cookie) => {
        const preference = {
            user_id: cookie.value,
            category: 'display_settings',
            name: 'collapse_previews',
            value: collapse,
        };
        return cy.apiSaveUserPreference([preference]);
    });
}
Cypress.Commands.add('apiSaveCollapsePreviewsPreference', apiSaveCollapsePreviewsPreference);
function apiSaveTutorialStep(userId: string, value = '999'): ChainableT<any> {
    const preference = {
        user_id: userId,
        category: 'tutorial_step',
        name: userId,
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveTutorialStep', apiSaveTutorialStep);
function apiSaveOnboardingPreference(userId, name, value) {
    const preference = {
        user_id: userId,
        category: 'recommended_next_steps',
        name,
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveOnboardingPreference', apiSaveOnboardingPreference);
function apiSaveDirectChannelShowPreference(userId: string, otherUserId: string, value: string): ChainableT<any> {
    const preference = {
        user_id: userId,
        category: 'direct_channel_show',
        name: otherUserId,
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveDirectChannelShowPreference', apiSaveDirectChannelShowPreference);
function apiHideSidebarWhatsNewModalPreference(userId, value) {
    const preference = {
        user_id: userId,
        category: 'whats_new_modal',
        name: 'has_seen_sidebar_whats_new_modal',
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiHideSidebarWhatsNewModalPreference', apiHideSidebarWhatsNewModalPreference);
function apiGetUserPreference(userId: string): ChainableT<any> {
    return cy.request(`/api/v4/users/${userId}/preferences`).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response.body);
    });
}
Cypress.Commands.add('apiGetUserPreference', apiGetUserPreference);
function apiSaveCRTPreference(userId: string, value = 'on'): ChainableT<any> {
    const preference = {
        user_id: userId,
        category: 'display_settings',
        name: 'collapsed_reply_threads',
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveCRTPreference', apiSaveCRTPreference);
function apiSaveCloudTrialBannerPreference(userId: string, name: string, value: string): ChainableT<any> {
    const preference = {
        user_id: userId,
        category: 'cloud_trial_banner',
        name,
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveCloudTrialBannerPreference', apiSaveCloudTrialBannerPreference);
function apiSaveStartTrialModal(userId: string, value = 'true'): ChainableT<any> {
    const preference = {
        user_id: userId,
        category: 'start_trial_modal',
        name: 'trial_modal_auto_shown',
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveStartTrialModal', apiSaveStartTrialModal);
function apiSaveOnboardingTaskListPreference(userId: string, name: string, value: string): ChainableT<any> {
    const preference = {
        user_id: userId,
        category: 'onboarding_task_list',
        name,
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveOnboardingTaskListPreference', apiSaveOnboardingTaskListPreference);
function apiSaveSkipStepsPreference(userId: string, value: string): ChainableT<any> {
    const preference = {
        user_id: userId,
        category: 'recommended_next_steps',
        name: 'skip',
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveSkipStepsPreference', apiSaveSkipStepsPreference);
function apiSaveUnreadScrollPositionPreference(userId, value) {
    const preference = {
        user_id: userId,
        category: 'advanced_settings',
        name: 'unread_scroll_position',
        value,
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveUnreadScrollPositionPreference', apiSaveUnreadScrollPositionPreference);
function apiBoardsWelcomePageViewed(userId: string): ChainableT<any> {
    const preferences = [{
        user_id: userId,
        category: 'boards',
        name: 'welcomePageViewed',
        value: '1',
    },
    {
        user_id: userId,
        category: 'boards',
        name: 'version72MessageCanceled',
        value: 'true',
    }];
    return cy.apiSaveUserPreference(preferences, userId);
}
Cypress.Commands.add('apiBoardsWelcomePageViewed', apiBoardsWelcomePageViewed);
function apiSaveJoinLeaveMessagesPreference(userId, enable = true) {
    const preference = {
        user_id: userId,
        category: 'advanced_settings',
        name: 'join_leave',
        value: enable.toString(),
    };
    return cy.apiSaveUserPreference([preference], userId);
}
Cypress.Commands.add('apiSaveJoinLeaveMessagesPreference', apiSaveJoinLeaveMessagesPreference);
function apiDisableTutorials(userId) {
    const preferences = [
        {
            user_id: userId,
            category: 'playbook_edit',
            name: userId,
            value: '999',
        },
        {
            user_id: userId,
            category: 'tutorial_pb_run_details',
            name: userId,
            value: '999',
        },
        {
            user_id: userId,
            category: 'crt_thread_pane_step',
            name: userId,
            value: '999',
        },
        {
            user_id: userId,
            category: 'playbook_preview',
            name: userId,
            value: '999',
        },
        {
            user_id: userId,
            category: 'tutorial_step',
            name: userId,
            value: '999',
        },
        {
            user_id: userId,
            category: 'app_bar',
            name: 'channel_with_board_tip_showed',
            value: '{"channel_with_board_tip_showed":true}',
        },
    ];
    return cy.apiSaveUserPreference(preferences, userId);
}
Cypress.Commands.add('apiDisableTutorials', apiDisableTutorials);
declare global {
    namespace Cypress {
        interface Chainable {
            apiSaveUserPreference: typeof apiSaveUserPreference;
            apiSaveClockDisplayModeTo24HourPreference: typeof apiSaveClockDisplayModeTo24HourPreference;
            apiSaveChannelDisplayModePreference: typeof apiSaveChannelDisplayModePreference;
            apiSaveMessageDisplayPreference: typeof apiSaveMessageDisplayPreference;
            apiSaveTeammateNameDisplayPreference: typeof apiSaveTeammateNameDisplayPreference;
            apiSaveThemePreference: typeof apiSaveThemePreference;
            apiSaveSidebarSettingPreference: typeof apiSaveSidebarSettingPreference;
            apiSaveLinkPreviewsPreference: typeof apiSaveLinkPreviewsPreference;
            apiSaveCollapsePreviewsPreference: typeof apiSaveCollapsePreviewsPreference;
            apiSaveTutorialStep: typeof apiSaveTutorialStep;
            apiSaveOnboardingPreference: typeof apiSaveOnboardingPreference;
            apiSaveDirectChannelShowPreference: typeof apiSaveDirectChannelShowPreference;
            apiHideSidebarWhatsNewModalPreference: typeof apiHideSidebarWhatsNewModalPreference;
            apiGetUserPreference: typeof apiGetUserPreference;
            apiSaveCRTPreference: typeof apiSaveCRTPreference;
            apiSaveCloudTrialBannerPreference: typeof apiSaveCloudTrialBannerPreference;
            apiSaveStartTrialModal: typeof apiSaveStartTrialModal;
            apiSaveOnboardingTaskListPreference: typeof apiSaveOnboardingTaskListPreference;
            apiSaveSkipStepsPreference: typeof apiSaveSkipStepsPreference;
            apiSaveUnreadScrollPositionPreference: typeof apiSaveUnreadScrollPositionPreference;
            apiBoardsWelcomePageViewed: typeof apiBoardsWelcomePageViewed;
            apiSaveJoinLeaveMessagesPreference: typeof apiSaveJoinLeaveMessagesPreference;
            apiDisableTutorials: typeof apiDisableTutorials;
        }
    }
}