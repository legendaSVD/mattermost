import {General} from 'mattermost-redux/constants';
import {getCurrentLocale, getTranslations} from 'selectors/i18n';
describe('selectors/i18n', () => {
    describe('getCurrentLocale', () => {
        test('not logged in', () => {
            const state = {
                entities: {
                    general: {
                        config: {
                            DefaultClientLocale: 'fr',
                        },
                    },
                    users: {
                        currentUserId: '',
                        profiles: {},
                    },
                },
            };
            expect(getCurrentLocale(state)).toEqual('fr');
        });
        test('logged in', () => {
            const state = {
                entities: {
                    general: {
                        config: {
                            DefaultClientLocale: 'fr',
                        },
                    },
                    users: {
                        currentUserId: 'abcd',
                        profiles: {
                            abcd: {
                                locale: 'de',
                            },
                        },
                    },
                },
            };
            expect(getCurrentLocale(state)).toEqual('de');
        });
        test('returns default locale when invalid user locale specified', () => {
            const state = {
                entities: {
                    general: {
                        config: {
                            DefaultClientLocale: 'en',
                        },
                    },
                    users: {
                        currentUserId: 'abcd',
                        profiles: {
                            abcd: {
                                locale: 'not_valid',
                            },
                        },
                    },
                },
            };
            expect(getCurrentLocale(state)).toEqual(General.DEFAULT_LOCALE);
        });
        describe('locale from query parameter', () => {
            const setWindowLocaleQueryParameter = (locale) => {
                const url = new URL(window.location.href);
                url.searchParams.set('locale', locale);
                window.history.replaceState({}, '', url.toString());
            };
            afterEach(() => {
                window.history.replaceState({}, '', 'http://localhost:8065/');
            });
            test('returns locale from query parameter if provided and not logged in', () => {
                const state = {
                    entities: {
                        general: {
                            config: {
                                DefaultClientLocale: 'fr',
                            },
                        },
                        users: {
                            currentUserId: '',
                            profiles: {},
                        },
                    },
                };
                setWindowLocaleQueryParameter('ko');
                expect(getCurrentLocale(state)).toEqual('ko');
            });
            test('returns DefaultClientLocale if locale from query parameter is not valid', () => {
                const state = {
                    entities: {
                        general: {
                            config: {
                                DefaultClientLocale: 'fr',
                            },
                        },
                        users: {
                            currentUserId: '',
                            profiles: {},
                        },
                    },
                };
                setWindowLocaleQueryParameter('invalid_locale');
                expect(getCurrentLocale(state)).toEqual('fr');
            });
            test('returns user locale when logged in and locale is provided in query parameter', () => {
                const state = {
                    entities: {
                        general: {
                            config: {
                                DefaultClientLocale: 'fr',
                            },
                        },
                        users: {
                            currentUserId: 'abcd',
                            profiles: {
                                abcd: {
                                    locale: 'de',
                                },
                            },
                        },
                    },
                };
                setWindowLocaleQueryParameter('ko');
                expect(getCurrentLocale(state)).toEqual('de');
            });
        });
    });
    describe('getTranslations', () => {
        const state = {
            views: {
                i18n: {
                    translations: {
                        en: {
                            'test.hello_world': 'Hello, World!',
                        },
                    },
                },
            },
        };
        test('returns loaded translations', () => {
            expect(getTranslations(state, 'en')).toBe(state.views.i18n.translations.en);
        });
        test('returns null for unloaded translations', () => {
            expect(getTranslations(state, 'fr')).toEqual(undefined);
        });
        test('returns English translations for unsupported locale', () => {
            expect(getTranslations(state, 'gd')).toBe(state.views.i18n.translations.en);
        });
    });
});