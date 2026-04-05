import React from 'react';
import {useDispatch} from 'react-redux';
import * as modalActions from 'actions/views/modals';
import ChannelInviteModal from 'components/channel_invite_modal';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {ModalIdentifiers} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';
import AddChannelMembers from './add_channel_members';
describe('components/ChannelHeaderMenu/MenuItems/AddChannelMembers', () => {
    const channel = TestHelper.getChannelMock({header: 'Test Header'});
    beforeEach(() => {
        jest.spyOn(modalActions, 'openModal');
        jest.spyOn(require('react-redux'), 'useDispatch');
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    test('renders the component correctly', () => {
        renderWithContext(
            <AddChannelMembers
                channel={channel}
            />, {},
        );
        const menuItem = screen.getByText('Add Members');
        expect(menuItem).toBeInTheDocument();
    });
    test('dispatches openModal action on click', async () => {
        renderWithContext(
            <WithTestMenuContext>
                <AddChannelMembers
                    channel={channel}
                />
            </WithTestMenuContext>, {},
        );
        const menuItem = screen.getByText('Add Members');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledWith({
            modalId: ModalIdentifiers.CHANNEL_INVITE,
            dialogType: ChannelInviteModal,
            dialogProps: {channel},
        });
    });
});