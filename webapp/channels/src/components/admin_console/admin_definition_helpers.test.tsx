import {it} from './admin_definition_helpers';
describe('AdminDefinitionHelpers - stateEqualsOrDefault', () => {
    test('should return true when state value equals expected value', () => {
        const state = {
            'ServiceSettings.BurnOnReadDurationSeconds': '600',
        };
        const checker = it.stateEqualsOrDefault('ServiceSettings.BurnOnReadDurationSeconds', '600', '600');
        expect(checker({}, state)).toBe(true);
    });
    test('should return true when state value is null and expected value equals default', () => {
        const state = {
            'ServiceSettings.BurnOnReadDurationSeconds': null,
        };
        const checker = it.stateEqualsOrDefault('ServiceSettings.BurnOnReadDurationSeconds', '600', '600');
        expect(checker({}, state)).toBe(true);
    });
    test('should return true when state value is undefined and expected value equals default', () => {
        const state = {};
        const checker = it.stateEqualsOrDefault('ServiceSettings.BurnOnReadDurationSeconds', '600', '600');
        expect(checker({}, state)).toBe(true);
    });
    test('should return false for non-matching values', () => {
        const mismatchedState = {'ServiceSettings.BurnOnReadDurationSeconds': '1800'};
        const nullStateWithDifferentExpected = {'ServiceSettings.BurnOnReadDurationSeconds': null};
        const undefinedStateWithDifferentExpected = {};
        const checker = it.stateEqualsOrDefault('ServiceSettings.BurnOnReadDurationSeconds', '300', '600');
        expect(checker({}, mismatchedState)).toBe(false);
        expect(checker({}, nullStateWithDifferentExpected)).toBe(false);
        expect(checker({}, undefinedStateWithDifferentExpected)).toBe(false);
    });
});