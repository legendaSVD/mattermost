import React from 'react';
import {renderWithContext, screen} from 'tests/react_testing_utils';
import {MenuItemBlockableLinkImpl} from './menu_item_blockable_link';
describe('components/MenuItemBlockableLink', () => {
    test('should render my link', () => {
        renderWithContext(
            <MenuItemBlockableLinkImpl
                to='/wherever'
                text='Whatever'
            />,
        );
        screen.getByText('Whatever');
        expect((screen.getByRole('link') as HTMLAnchorElement).href).toContain('/wherever');
    });
});