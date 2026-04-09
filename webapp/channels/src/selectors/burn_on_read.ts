import type {ClientLicense} from '@mattermost/types/config';
import {createSelector} from 'mattermost-redux/selectors/create_selector';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/common';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';
import {getInt} from 'mattermost-redux/selectors/entities/preferences';
import {isMinimumEnterpriseAdvancedLicense} from 'utils/license_utils';
import type {GlobalState} from 'types/store';
export const BURN_ON_READ_TOUR_TIP_PREFERENCE = 'burn_on_read_tour_tip';
export const isBurnOnReadEnabled: (state: GlobalState) => boolean = createSelector(
    'isBurnOnReadEnabled',
    getConfig,
    getLicense,
    (config, license: ClientLicense): boolean => {
        const configEnabled = config.EnableBurnOnRead === 'true';
        const licenseSupportsFeature = isMinimumEnterpriseAdvancedLicense(license);
        return configEnabled && licenseSupportsFeature;
    },
);
export const getBurnOnReadDurationMinutes = (state: GlobalState): number => {
    const config = getConfig(state);
    const seconds = parseInt(config.BurnOnReadDurationSeconds || '600', 10);
    return Math.floor(seconds / 60);
};
export const canUserSendBurnOnRead = (state: GlobalState): boolean => {
    return isBurnOnReadEnabled(state);
};
export const hasSeenBurnOnReadTourTip = (state: GlobalState): boolean => {
    const currentUserId = getCurrentUserId(state);
    const value = getInt(state, BURN_ON_READ_TOUR_TIP_PREFERENCE, currentUserId, 0);
    return value === 1;
};