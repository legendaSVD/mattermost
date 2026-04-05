import React from 'react';
import type {Team} from '@mattermost/types/teams';
import * as teams from 'mattermost-redux/selectors/entities/teams';
import * as channelActions from 'actions/views/channel';
import {renderWithContext, screen, userEvent, waitFor} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import ChannelSettingsArchiveTab from './channel_settings_archive_tab';
jest.mock('actions/views/channel', () => ({
    deleteChannel: jest.fn().mockReturnValue({type: 'MOCK_DELETE_ACTION'}),
}));
jest.mock('utils/browser_history', () => ({
    getHistory: jest.fn(),
}));
jest.mock('mattermost-redux/selectors/entities/roles', () => ({
    haveITeamPermission: jest.fn().mockReturnValue(true),
    haveIChannelPermission: jest.fn().mockReturnValue(true),
    getRoles: jest.fn().mockReturnValue({}),
}));
const mockChannel = TestHelper.getChannelMock({
    id: 'using-26-letter-channel-id',
    team_id: 'team1',
    display_name: 'Test Channel',
    name: 'test-channel',
    type: 'O',
});
const baseProps = {
    channel: mockChannel,
    onHide: jest.fn(),
};
describe('ChannelSettingsArchiveTab', () => {
    const {getHistory} = require('utils/browser_history');
    beforeEach(() => {
        jest.spyOn(teams, 'getCurrentTeam').mockReturnValue({
            id: 'team1',
            name: 'team-name',
        } as Team);
        const historyPush = jest.fn();
        (getHistory as jest.Mock).mockReturnValue({push: historyPush});
    });
    it('should render the archive button', () => {
        renderWithContext(<ChannelSettingsArchiveTab {...baseProps}/>);
        const archiveButton = screen.getByText('Archive this channel');
        expect(archiveButton).toBeInTheDocument();
        expect(archiveButton).toHaveAttribute('aria-label', 'Archive channel Test Channel');
    });
    it('should show confirmation modal when archive button is clicked', async () => {
        renderWithContext(<ChannelSettingsArchiveTab {...baseProps}/>);
        await userEvent.click(screen.getByText('Archive this channel'));
        expect(screen.getByTestId('archiveChannelConfirmModal')).toBeInTheDocument();
        expect(screen.getByText('Archive channel?')).toBeInTheDocument();
    });
    it('should call deleteChannel and onHide when confirmed', async () => {
        const onHide = jest.fn();
        renderWithContext(<ChannelSettingsArchiveTab {...{...baseProps, onHide}}/>);
        await userEvent.click(screen.getByText('Archive this channel'));
        await userEvent.click(screen.getByRole('button', {name: 'Confirm'}));
        expect(channelActions.deleteChannel).toHaveBeenCalledWith(mockChannel.id);
        expect(onHide).toHaveBeenCalled();
    });
    it('should close the confirmation modal when canceled', async () => {
        renderWithContext(<ChannelSettingsArchiveTab {...baseProps}/>);
        await userEvent.click(screen.getByText('Archive this channel'));
        expect(screen.getByTestId('archiveChannelConfirmModal')).toBeInTheDocument();
        await userEvent.click(screen.getByTestId('cancel-button'));
        await waitFor(() => {
            expect(screen.queryByTestId('archiveChannelConfirmModal')).not.toBeInTheDocument();
        });
    });
    it('should call deleteChannel which handles redirection when archived channel cannot be viewed', async () => {
        const {deleteChannel} = require('actions/views/channel');
        deleteChannel.mockImplementationOnce(() => {
            return () => {
                return {data: true};
            };
        });
        renderWithContext(<ChannelSettingsArchiveTab {...baseProps}/>);
        await userEvent.click(screen.getByText('Archive this channel'));
        expect(screen.getByTestId('archiveChannelConfirmModal')).toBeInTheDocument();
        await userEvent.click(screen.getByText('Confirm'));
        expect(channelActions.deleteChannel).toHaveBeenCalledWith(mockChannel.id);
    });
    it('should show correct message when archived channels cannot be viewed', async () => {
        renderWithContext(<ChannelSettingsArchiveTab {...baseProps}/>);
        await userEvent.click(screen.getByText('Archive this channel'));
        const modalMessage = screen.getByTestId('archiveChannelConfirmModal');
        expect(modalMessage).toBeInTheDocument();
        const modalBody = screen.getByTestId('archiveChannelConfirmModal').querySelector('#confirmModalBody');
        expect(modalBody).toBeInTheDocument();
        expect(modalBody).toHaveTextContent(/This will archive the channel from the team/);
    });
    it('should call deleteChannel which handles channel ID validation', async () => {
        const invalidChannel = {
            ...mockChannel,
            id: 'invalid',
        };
        const {deleteChannel} = require('actions/views/channel');
        deleteChannel.mockImplementationOnce(() => {
            return () => {
                return {data: false};
            };
        });
        renderWithContext(<ChannelSettingsArchiveTab {...{...baseProps, channel: invalidChannel}}/>);
        await userEvent.click(screen.getByText('Archive this channel'));
        await userEvent.click(screen.getByRole('button', {name: 'Confirm'}));
        expect(channelActions.deleteChannel).toHaveBeenCalledWith(invalidChannel.id);
    });
    it('should handle backdrops correctly when confirmation modal is opened', async () => {
        const mockBackdrop = document.createElement('div');
        mockBackdrop.className = 'modal-backdrop';
        document.body.appendChild(mockBackdrop);
        try {
            renderWithContext(<ChannelSettingsArchiveTab {...baseProps}/>);
            await userEvent.click(screen.getByText('Archive this channel'));
            expect(screen.getByTestId('archiveChannelConfirmModal')).toBeInTheDocument();
            const backdrops = document.querySelectorAll('.modal-backdrop');
            expect(backdrops.length).toBe(2);
            const hasInvisibleBackdrop = Array.from(backdrops).some(
                (backdrop) => (backdrop as HTMLElement).style.opacity === '0',
            );
            expect(hasInvisibleBackdrop).toBe(true);
        } finally {
            document.body.removeChild(mockBackdrop);
        }
    });
});