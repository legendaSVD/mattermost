import React from 'react';
import {Provider} from 'react-redux';
import {mountWithIntl} from 'tests/helpers/intl-test-helper';
import mockStore from 'tests/test_store';
import {DataSearchTypes} from 'utils/constants';
import {FileSizes} from 'utils/file_utils';
import {makeEmptyUsage} from 'utils/limits_test';
import SearchLimitsBanner from './search_limits_banner';
const usage = makeEmptyUsage();
const limits = {
    limitsLoaded: true,
    limits: {
        integrations: {
            enabled: 5,
        },
        messages: {
            history: 10000,
        },
        files: {
            total_storage: FileSizes.Gigabyte,
        },
        teams: {
            active: 1,
            teamsLoaded: true,
        },
        boards: {
            cards: 500,
            views: 5,
        },
    },
};
describe('components/select_results/SearchLimitsBanner', () => {
    test('should NOT show banner for no limits when doing messages search', () => {
        const state = {
            entities: {
                general: {
                    license: {
                        IsLicensed: 'true',
                    },
                },
                users: {
                    currentUserId: 'uid',
                    profiles: {
                        uid: {},
                    },
                },
                limits: {
                    serverLimits: undefined,
                },
                search: {
                    results: [],
                    flagged: [],
                    isSearchingTerm: false,
                    isSearchGettingMore: false,
                    matches: {},
                    recent: {},
                    current: {},
                    truncationInfo: undefined,
                },
                usage,
            },
            views: {
                rhs: {
                    rhsState: null,
                },
            },
        };
        const store = mockStore(state);
        const wrapper = mountWithIntl(<Provider store={store}><SearchLimitsBanner searchType='messages'/></Provider>);
        expect(wrapper.find('#messages_search_limits_banner').exists()).toEqual(false);
    });
    test('should show banner when doing messages search above the limit in Entry with limits', () => {
        const aboveMessagesLimitUsage = JSON.parse(JSON.stringify(usage));
        aboveMessagesLimitUsage.messages.history = 15000;
        const state = {
            entities: {
                general: {
                    license: {
                        IsLicensed: 'true',
                    },
                },
                users: {
                    currentUserId: 'uid',
                    profiles: {
                        uid: {},
                    },
                },
                cloud: {
                    subscription: {
                        is_free_trial: 'true',
                        product_id: 'prod_1',
                    },
                    limits,
                },
                limits: {
                    serverLimits: {
                        postHistoryLimit: 10000,
                    },
                },
                usage: aboveMessagesLimitUsage,
                search: {
                    results: [],
                    flagged: [],
                    isSearchingTerm: false,
                    isSearchGettingMore: false,
                    matches: {},
                    recent: {},
                    current: {},
                    truncationInfo: {
                        posts: 1,
                        files: 0,
                    },
                },
            },
            views: {
                rhs: {
                    rhsState: 'search',
                },
            },
        };
        const store = mockStore(state);
        const wrapper = mountWithIntl(<Provider store={store}><SearchLimitsBanner searchType='messages'/></Provider>);
        expect(wrapper.find('#messages_search_limits_banner').exists()).toEqual(true);
    });
    test('should display "View plans" CTA text for messages search when banner is shown', () => {
        const aboveMessagesLimitUsage = JSON.parse(JSON.stringify(usage));
        aboveMessagesLimitUsage.messages.history = 15000;
        const state = {
            entities: {
                general: {
                    license: {
                        IsLicensed: 'true',
                        Cloud: 'true',
                    },
                },
                users: {
                    currentUserId: 'uid',
                    profiles: {
                        uid: {},
                    },
                },
                cloud: {
                    subscription: {
                        is_free_trial: 'true',
                        product_id: 'prod_1',
                    },
                    limits,
                },
                limits: {
                    serverLimits: {
                        postHistoryLimit: 10000,
                    },
                },
                usage: aboveMessagesLimitUsage,
                search: {
                    results: [],
                    flagged: [],
                    isSearchingTerm: false,
                    isSearchGettingMore: false,
                    matches: {},
                    recent: {},
                    current: {},
                    truncationInfo: {
                        posts: 1,
                        files: 0,
                    },
                },
            },
            views: {
                rhs: {
                    rhsState: 'search',
                },
            },
        };
        const store = mockStore(state);
        const wrapper = mountWithIntl(<Provider store={store}><SearchLimitsBanner searchType={DataSearchTypes.MESSAGES_SEARCH_TYPE}/></Provider>);
        expect(wrapper.find('#messages_search_limits_banner').exists()).toEqual(true);
        expect(wrapper.text()).toContain('paid plans');
    });
    test('should display correct banner message format for messages search', () => {
        const aboveMessagesLimitUsage = JSON.parse(JSON.stringify(usage));
        aboveMessagesLimitUsage.messages.history = 15000;
        const state = {
            entities: {
                general: {
                    license: {
                        IsLicensed: 'true',
                        Cloud: 'true',
                    },
                },
                users: {
                    currentUserId: 'uid',
                    profiles: {
                        uid: {},
                    },
                },
                cloud: {
                    subscription: {
                        is_free_trial: 'true',
                        product_id: 'prod_1',
                    },
                    limits,
                },
                limits: {
                    serverLimits: {
                        postHistoryLimit: 10000,
                    },
                },
                usage: aboveMessagesLimitUsage,
                search: {
                    results: [],
                    flagged: [],
                    isSearchingTerm: false,
                    isSearchGettingMore: false,
                    matches: {},
                    recent: {},
                    current: {},
                    truncationInfo: {
                        posts: 1,
                        files: 0,
                    },
                },
            },
            views: {
                rhs: {
                    rhsState: 'search',
                },
            },
        };
        const store = mockStore(state);
        const wrapper = mountWithIntl(<Provider store={store}><SearchLimitsBanner searchType={DataSearchTypes.MESSAGES_SEARCH_TYPE}/></Provider>);
        const bannerText = wrapper.text();
        expect(bannerText).toContain('Limited history is displayed');
        expect(bannerText).toContain('Full access to message history is included in');
    });
    test('should render CTA link correctly when banner is shown', () => {
        const aboveMessagesLimitUsage = JSON.parse(JSON.stringify(usage));
        aboveMessagesLimitUsage.messages.history = 15000;
        const state = {
            entities: {
                general: {
                    license: {
                        IsLicensed: 'true',
                        Cloud: 'true',
                    },
                },
                users: {
                    currentUserId: 'uid',
                    profiles: {
                        uid: {},
                    },
                },
                cloud: {
                    subscription: {
                        is_free_trial: 'true',
                        product_id: 'prod_1',
                    },
                    limits,
                },
                limits: {
                    serverLimits: {
                        postHistoryLimit: 10000,
                    },
                },
                usage: aboveMessagesLimitUsage,
                search: {
                    results: [],
                    flagged: [],
                    isSearchingTerm: false,
                    isSearchGettingMore: false,
                    matches: {},
                    recent: {},
                    current: {},
                    truncationInfo: {
                        posts: 1,
                        files: 0,
                    },
                },
            },
            views: {
                rhs: {
                    rhsState: 'search',
                },
            },
        };
        const store = mockStore(state);
        const wrapper = mountWithIntl(<Provider store={store}><SearchLimitsBanner searchType={DataSearchTypes.MESSAGES_SEARCH_TYPE}/></Provider>);
        expect(wrapper.find('#messages_search_limits_banner').exists()).toEqual(true);
        expect(wrapper.text()).toContain('paid plans');
        const ctaLink = wrapper.find('a');
        expect(ctaLink).toHaveLength(1);
    });
    test('should NOT show banner when RHS is showing pinned posts even with truncated search results', () => {
        const aboveMessagesLimitUsage = JSON.parse(JSON.stringify(usage));
        aboveMessagesLimitUsage.messages.history = 15000;
        const state = {
            entities: {
                general: {
                    license: {
                        IsLicensed: 'true',
                        Cloud: 'true',
                    },
                },
                users: {
                    currentUserId: 'uid',
                    profiles: {
                        uid: {},
                    },
                },
                cloud: {
                    subscription: {
                        is_free_trial: 'true',
                        product_id: 'prod_1',
                    },
                    limits,
                },
                limits: {
                    serverLimits: {
                        postHistoryLimit: 10000,
                    },
                },
                usage: aboveMessagesLimitUsage,
                search: {
                    results: [],
                    flagged: [],
                    isSearchingTerm: false,
                    isSearchGettingMore: false,
                    matches: {},
                    recent: {},
                    current: {},
                    truncationInfo: {
                        posts: 1,
                        files: 0,
                    },
                },
            },
            views: {
                rhs: {
                    rhsState: 'pin',
                },
            },
        };
        const store = mockStore(state);
        const wrapper = mountWithIntl(<Provider store={store}><SearchLimitsBanner searchType={DataSearchTypes.MESSAGES_SEARCH_TYPE}/></Provider>);
        expect(wrapper.find('#messages_search_limits_banner').exists()).toEqual(false);
    });
});