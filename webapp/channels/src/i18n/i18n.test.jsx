import {getAllLanguages, getLanguageInfo, getLanguages, isLanguageAvailable, languages} from './i18n';
jest.mock('./imports', () => ({
    langIDs: ['cc'],
    langFiles: {cc: 'cc.json'},
    langLabels: {cc: 'CC Language'},
}));
describe('i18n', () => {
    test('getAllLanguages', () => {
        expect(getAllLanguages()).toBe(languages);
        expect(getAllLanguages(false)).toBe(languages);
        expect(getAllLanguages(true)).toStrictEqual({
            cc: {
                name: 'CC Language (Experimental)',
                value: 'cc',
                order: 22,
                url: 'cc.json',
            },
            ...languages,
        });
    });
    test('getLanguages', () => {
        const state = {
            entities: {
                general: {
                    config: {
                    },
                },
            },
        };
        expect(getLanguages(state)).toBe(languages);
        state.entities.general.config.EnableExperimentalLocales = 'true';
        expect(getLanguages(state)).toStrictEqual({
            cc: {
                name: 'CC Language (Experimental)',
                value: 'cc',
                order: 22,
                url: 'cc.json',
            },
            ...languages,
        });
    });
    test('getLanguageInfo', () => {
        expect(getLanguageInfo('en')).toStrictEqual({
            name: 'English (US)',
            order: 1,
            url: '',
            value: 'en',
        });
        expect(getLanguageInfo('cc')).toStrictEqual({
            name: 'CC Language (Experimental)',
            value: 'cc',
            order: 22,
            url: 'cc.json',
        });
        expect(getLanguageInfo('invalid')).not.toBeDefined();
    });
    test('isLanguageAvailable', () => {
        const state = {
            entities: {
                general: {
                    config: {
                    },
                },
            },
        };
        expect(isLanguageAvailable(state, 'cc')).toBe(false);
        state.entities.general.config.EnableExperimentalLocales = 'true';
        expect(isLanguageAvailable(state, 'cc')).toBe(true);
    });
});