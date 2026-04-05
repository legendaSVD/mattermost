import React from 'react';
import {FormattedMessage} from 'react-intl';
import {useDispatch} from 'react-redux';
import * as rhsActions from 'actions/views/rhs';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {RHSStates} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';
import OpenMembersRHS from './open_members_rhs';
describe('components/ChannelHeaderMenu/MenuItems/OpenMembersRHS', () => {
    beforeEach(() => {
        jest.spyOn(rhsActions, 'showChannelMembers').mockReturnValue(() => Promise.resolve({data: true}));
        jest.spyOn(require('react-redux'), 'useDispatch');
    });
    test('renders the component correctly, handles click event, rhs closed', async () => {
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
                <OpenMembersRHS
                    channel={channel}
                    id={'testID'}
                    text={
                        <FormattedMessage
                            id='channel_header.viewMembers'
                            defaultMessage='View Members'
                        />
                    }
                />
            </WithTestMenuContext>, state,
        );
        const menuItem = screen.getByText('View Members');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(rhsActions.showChannelMembers).toHaveBeenCalledTimes(1);
        expect(rhsActions.showChannelMembers).toHaveBeenCalledWith(channel.id, false);
    });
    test('renders the component correctly, handles correct click event, rhs open', async () => {
        const state = {
            views: {
                rhs: {
                    rhsState: RHSStates.CHANNEL_MEMBERS,
                    isSidebarOpen: true,
                },
            },
        };
        const channel = TestHelper.getChannelMock();
        renderWithContext(
            <WithTestMenuContext>
                <OpenMembersRHS
                    channel={channel}
                    id={'testID'}
                    text={
                        <FormattedMessage
                            id='channel_header.viewMembers'
                            defaultMessage='View Members'
                        />
                    }
                />
            </WithTestMenuContext>, state,
        );
        const menuItem = screen.getByText('View Members');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(rhsActions.showChannelMembers).not.toHaveBeenCalled();
    });
});