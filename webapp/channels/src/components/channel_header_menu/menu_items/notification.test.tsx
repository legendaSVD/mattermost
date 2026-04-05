import React from 'react';
import {useDispatch} from 'react-redux';
import * as modalActions from 'actions/views/modals';
import ChannelNotificationsModal from 'components/channel_notifications_modal';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {ModalIdentifiers} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';
import Notification from './notification';
describe('components/ChannelHeaderMenu/MenuItems/Notification', () => {
    beforeEach(() => {
        jest.spyOn(modalActions, 'openModal');
        jest.spyOn(require('react-redux'), 'useDispatch');
    });
    test('renders the component correctly, handle click event', async () => {
        const channel = TestHelper.getChannelMock();
        const user = TestHelper.getUserMock();
        renderWithContext(
            <WithTestMenuContext>
                <Notification
                    channel={channel}
                    user={user}
                />
            </WithTestMenuContext>, {},
        );
        const menuItemMG = screen.getByText('Notification Preferences');
        expect(menuItemMG).toBeInTheDocument();
        await userEvent.click(menuItemMG);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledWith({
            modalId: ModalIdentifiers.CHANNEL_NOTIFICATIONS,
            dialogType: ChannelNotificationsModal,
            dialogProps: {
                channel,
                currentUser: user,
            },
        });
    });
});