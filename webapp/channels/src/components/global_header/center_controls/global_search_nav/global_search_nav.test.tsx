import React from 'react';
import {renderWithContext} from 'tests/react_testing_utils';
import GlobalSearchNav from './global_search_nav';
describe('components/GlobalSearchNav', () => {
    test('should match snapshot with active flagged posts', () => {
        const {container} = renderWithContext(
            <GlobalSearchNav/>,
            {
                entities: {
                    general: {
                        config: {},
                    },
                },
                views: {
                    rhs: {
                        rhsState: 'flag',
                        isSidebarOpen: true,
                    },
                },
            },
        );
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot with active mentions posts', () => {
        const {container} = renderWithContext(
            <GlobalSearchNav/>,
            {
                entities: {
                    general: {
                        config: {},
                    },
                },
                views: {
                    rhs: {
                        rhsState: 'mentions',
                        isSidebarOpen: true,
                    },
                },
            },
        );
        expect(container).toMatchSnapshot();
    });
});