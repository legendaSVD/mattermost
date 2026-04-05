import React from 'react';
import {useDispatch} from 'react-redux';
import * as modalActions from 'actions/views/modals';
import EditChannelHeaderModal from 'components/edit_channel_header_modal';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {ModalIdentifiers} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';
import EditConversationHeader from './edit_conversation_header';
describe('components/ChannelHeaderMenu/MenuItems/EditConversationHeader', () => {
    beforeEach(() => {
        jest.spyOn(modalActions, 'openModal');
        jest.spyOn(require('react-redux'), 'useDispatch');
    });
    const channel = TestHelper.getChannelMock();
    test('renders the component correctly, handle click event', async () => {
        renderWithContext(
            <WithTestMenuContext>
                <EditConversationHeader channel={channel}/>
            </WithTestMenuContext>, {},
        );
        const menuItem = screen.getByText('Edit Header');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledWith({
            modalId: ModalIdentifiers.EDIT_CHANNEL_HEADER,
            dialogType: EditChannelHeaderModal,
            dialogProps: {channel},
        });
    });
});