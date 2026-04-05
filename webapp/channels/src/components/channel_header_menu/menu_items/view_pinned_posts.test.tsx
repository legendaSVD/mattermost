import React from 'react';
import {useDispatch} from 'react-redux';
import * as rhsActions from 'actions/views/rhs';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {RHSStates} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';
import ViewPinnedPosts from './view_pinned_posts';
describe('components/ChannelHeaderMenu/MenuItems/ViewPinnedPosts', () => {
    beforeEach(() => {
        jest.spyOn(rhsActions, 'closeRightHandSide').mockImplementation(() => () => ({data: true}));
        jest.spyOn(rhsActions, 'showPinnedPosts').mockReturnValue(() => Promise.resolve({data: true}));
        jest.spyOn(require('react-redux'), 'useDispatch');
    });
    test('renders the component correctly, handles correct click event', async () => {
        const state = {
            views: {
                rhs: {
                    rhsState: '',
                },
            },
        };
        const channel = TestHelper.getChannelMock();
        renderWithContext(
            <WithTestMenuContext>
                <ViewPinnedPosts channelID={channel.id}/>
            </WithTestMenuContext>, state,
        );
        const menuItem = screen.getByText('View Pinned Posts');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(rhsActions.showPinnedPosts).toHaveBeenCalledTimes(1);
        expect(rhsActions.showPinnedPosts).toHaveBeenCalledWith(channel.id);
    });
    test('renders the component correctly, handles correct click event', async () => {
        const state = {
            views: {
                rhs: {
                    rhsState: RHSStates.PIN,
                },
            },
        };
        const channel = TestHelper.getChannelMock();
        renderWithContext(
            <WithTestMenuContext>
                <ViewPinnedPosts channelID={channel.id}/>
            </WithTestMenuContext>, state,
        );
        const menuItem = screen.getByText('View Pinned Posts');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(rhsActions.closeRightHandSide).toHaveBeenCalledTimes(1);
    });
});