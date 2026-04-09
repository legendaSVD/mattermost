import {Preferences} from '../constants';
export function getEmailInterval(enableEmailNotification: boolean, enableEmailBatching: boolean, emailIntervalPreference: number): number {
    const {
        INTERVAL_NEVER,
        INTERVAL_IMMEDIATE,
        INTERVAL_FIFTEEN_MINUTES,
        INTERVAL_HOUR,
    } = Preferences;
    const validValuesWithEmailBatching = [INTERVAL_IMMEDIATE, INTERVAL_NEVER, INTERVAL_FIFTEEN_MINUTES, INTERVAL_HOUR];
    const validValuesWithoutEmailBatching = [INTERVAL_IMMEDIATE, INTERVAL_NEVER];
    if (!enableEmailNotification) {
        return INTERVAL_NEVER;
    } else if (enableEmailBatching && validValuesWithEmailBatching.indexOf(emailIntervalPreference) === -1) {
        return INTERVAL_FIFTEEN_MINUTES;
    } else if (!enableEmailBatching && validValuesWithoutEmailBatching.indexOf(emailIntervalPreference) === -1) {
        return INTERVAL_IMMEDIATE;
    } else if (enableEmailNotification && emailIntervalPreference === INTERVAL_NEVER) {
        return INTERVAL_IMMEDIATE;
    }
    return emailIntervalPreference;
}