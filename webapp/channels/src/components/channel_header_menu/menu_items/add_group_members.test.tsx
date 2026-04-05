import React from 'react';
import {useDispatch} from 'react-redux';
import * as modalActions from 'actions/views/modals';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import MoreDirectChannels from 'components/more_direct_channels';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {ModalIdentifiers} from 'utils/constants';
import AddGroupMembers from './add_group_members';
describe('components/ChannelHeaderMenu/MenuItems/AddGroupMembers', () => {
    beforeEach(() => {
        jest.spyOn(modalActions, 'openModal');
        jest.spyOn(require('react-redux'), 'useDispatch');
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    test('renders the component correctly', () => {
        renderWithContext(
            <AddGroupMembers/>, {},
        );
        const menuItem = screen.getByText('Add Members');
        expect(menuItem).toBeInTheDocument();
    });
    test('dispatches openModal action on click', async () => {
        renderWithContext(
            <WithTestMenuContext>
                <AddGroupMembers/>
            </WithTestMenuContext>, {},
        );
        const menuItem = screen.getByText('Add Members');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledWith({
            modalId: ModalIdentifiers.CREATE_DM_CHANNEL,
            dialogType: MoreDirectChannels,
            dialogProps: {
                focusOriginElement: 'channelHeaderDropdownButton',
                isExistingChannel: true,
            },
        });
    });
});