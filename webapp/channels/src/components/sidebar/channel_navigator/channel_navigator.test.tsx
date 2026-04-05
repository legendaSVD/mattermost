import React from 'react';
import {renderWithContext, screen} from 'tests/react_testing_utils';
import ChannelNavigator from './channel_navigator';
jest.mock('../channel_filter', () => () => <div id='mock-channel-filter'/>);
describe('Components/ChannelNavigator', () => {
    const baseProps = {
        showUnreadsCategory: true,
        isQuickSwitcherOpen: false,
        actions: {
            openModal: jest.fn(),
            closeModal: jest.fn(),
        },
    };
    it('should not show BrowserOrAddChannelMenu', () => {
        renderWithContext(<ChannelNavigator {...baseProps}/>);
        expect(screen.getByRole('button', {name: /find channels/i})).toBeInTheDocument();
        expect(screen.getByText('Find channel')).toBeInTheDocument();
        expect(document.querySelector('#mock-channel-filter')).not.toBeInTheDocument();
    });
});