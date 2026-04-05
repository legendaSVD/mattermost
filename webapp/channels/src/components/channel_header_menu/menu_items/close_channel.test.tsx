import React from 'react';
import * as channelActions from 'actions/views/channel';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import CloseChannel from './close_channel';
describe('components/ChannelHeaderMenu/MenuItems/CloseChannel', () => {
    beforeEach(() => {
        jest.spyOn(channelActions, 'goToLastViewedChannel');
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    test('renders the component correctly, handle click event', async () => {
        renderWithContext(
            <WithTestMenuContext>
                <CloseChannel/>
            </WithTestMenuContext>, {},
        );
        const menuItem = screen.getByText('Close Channel');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(channelActions.goToLastViewedChannel).toHaveBeenCalledTimes(1);
    });
});