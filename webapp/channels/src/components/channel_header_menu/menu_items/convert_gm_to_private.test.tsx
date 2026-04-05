import React from 'react';
import {useDispatch} from 'react-redux';
import * as modalActions from 'actions/views/modals';
import ConvertGmToChannelModal from 'components/convert_gm_to_channel_modal';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {ModalIdentifiers} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';
import ConvertGMtoPrivate from './convert_gm_to_private';
describe('components/ChannelHeaderMenu/MenuItems/ConvertGMtoPrivate', () => {
    beforeEach(() => {
        jest.spyOn(modalActions, 'openModal');
        jest.spyOn(require('react-redux'), 'useDispatch');
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    const channel = TestHelper.getChannelMock();
    test('renders the component correctly, handle click event', async () => {
        renderWithContext(
            <WithTestMenuContext>
                <ConvertGMtoPrivate channel={channel}/>
            </WithTestMenuContext>, {},
        );
        const menuItem = screen.getByText('Convert to Private Channel');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledWith({
            modalId: ModalIdentifiers.CONVERT_GM_TO_CHANNEL,
            dialogType: ConvertGmToChannelModal,
            dialogProps: {channel},
        });
    });
});