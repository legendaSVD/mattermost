import React from 'react';
import {renderWithContext} from 'tests/react_testing_utils';
import {MenuItemLinkImpl} from './menu_item_link';
describe('components/MenuItemLink', () => {
    test('should match snapshot', () => {
        const {container} = renderWithContext(
            <MenuItemLinkImpl
                to='/wherever'
                text='Whatever'
            />,
        );
        expect(container).toMatchSnapshot();
    });
});