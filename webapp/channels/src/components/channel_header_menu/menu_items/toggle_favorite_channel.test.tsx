import React from 'react';
import {useDispatch} from 'react-redux';
import * as channelActions from 'mattermost-redux/actions/channels';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import ToggleFavoriteChannel from './toggle_favorite_channel';
describe('components/ChannelHeaderMenu/MenuItems/ToggleFavoriteChannel', () => {
    const channel = TestHelper.getChannelMock();
    beforeEach(() => {
        jest.spyOn(channelActions, 'favoriteChannel').mockReturnValue(() => Promise.resolve({data: true}));
        jest.spyOn(channelActions, 'unfavoriteChannel');
        jest.spyOn(require('react-redux'), 'useDispatch');
    });
    test('renders the component correctly, handles correct click event, is favorite false', async () => {
        renderWithContext(
            <WithTestMenuContext>
                <ToggleFavoriteChannel
                    channelID={channel.id}
                    isFavorite={false}
                />
            </WithTestMenuContext>, {},
        );
        const menuItem = screen.getByText('Add to Favorites');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(channelActions.favoriteChannel).toHaveBeenCalledTimes(1);
        expect(channelActions.favoriteChannel).toHaveBeenCalledWith(channel.id);
    });
    test('renders the component correctly, handles correct click event, is favorite true', async () => {
        renderWithContext(
            <WithTestMenuContext>
                <ToggleFavoriteChannel
                    channelID={channel.id}
                    isFavorite={true}
                />
            </WithTestMenuContext>, {},
        );
        const menuItem = screen.getByText('Remove from Favorites');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(channelActions.unfavoriteChannel).toHaveBeenCalledTimes(1);
    });
});