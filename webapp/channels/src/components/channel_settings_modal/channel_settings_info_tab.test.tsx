import React from 'react';
import type {ChannelType} from '@mattermost/types/channels';
import {act, renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import ChannelSettingsInfoTab from './channel_settings_info_tab';
jest.mock('mattermost-redux/actions/channels', () => ({
    patchChannel: jest.fn(),
    updateChannelPrivacy: jest.fn(),
}));
jest.mock('components/admin_console/team_channel_settings/convert_confirm_modal', () => {
    return jest.fn().mockImplementation(({show, onCancel, onConfirm, displayName}) => {
        if (!show) {
            return null;
        }
        return (
            <div data-testid='convert-confirm-modal'>
                <div>{'Converting '}{displayName}{' to private'}</div>
                <button onClick={onCancel}>{'Cancel'}</button>
                <button onClick={onConfirm}>{'Yes, Convert Channel'}</button>
            </div>
        );
    });
});
let mockChannelPropertiesPermission = true;
let mockConvertToPublicPermission = true;
let mockConvertToPrivatePermission = true;
jest.mock('mattermost-redux/selectors/entities/roles', () => ({
    haveITeamPermission: jest.fn().mockReturnValue(true),
    haveIChannelPermission: jest.fn().mockImplementation((state, teamId, channelId, permission: string) => {
        if (permission === 'manage_private_channel_properties' || permission === 'manage_public_channel_properties') {
            return mockChannelPropertiesPermission;
        }
        if (permission === 'convert_public_channel_to_private') {
            return mockConvertToPrivatePermission;
        }
        if (permission === 'convert_private_channel_to_public') {
            return mockConvertToPublicPermission;
        }
        return true;
    }),
    getRoles: jest.fn().mockReturnValue({}),
}));
jest.mock('selectors/views/textbox', () => ({
    showPreviewOnChannelSettingsHeaderModal: jest.fn().mockReturnValue(false),
    showPreviewOnChannelSettingsPurposeModal: jest.fn().mockReturnValue(false),
}));
jest.mock('actions/views/textbox', () => ({
    setShowPreviewOnChannelSettingsHeaderModal: jest.fn(),
    setShowPreviewOnChannelSettingsPurposeModal: jest.fn(),
}));
jest.mock('mattermost-redux/utils/user_utils', () => {
    const original = jest.requireActual('mattermost-redux/utils/user_utils');
    return {
        ...original,
        isChannelAdmin: jest.fn().mockReturnValue(false),
    };
});
jest.mock('components/advanced_text_editor/show_formatting/show_formatting', () => (
    jest.fn().mockImplementation((props) => (
        <button
            data-testid='mock-show-format'
            onClick={props.onClick}
            className={props.active ? 'active' : ''}
        >
            {'Toggle Preview'}
        </button>
    ))
));
const mockChannelMember = TestHelper.getChannelMembershipMock({
    roles: 'channel_user system_admin',
});
const mockUser = TestHelper.getUserMock({
    id: 'user_id',
    roles: 'system_admin',
});
jest.mock('mattermost-redux/selectors/entities/channels', () => ({
    ...jest.requireActual('mattermost-redux/selectors/entities/channels') as typeof import('mattermost-redux/selectors/entities/channels'),
    getChannelMember: jest.fn(() => mockChannelMember),
}));
jest.mock('mattermost-redux/selectors/entities/common', () => {
    return {
        ...jest.requireActual('mattermost-redux/selectors/entities/common') as typeof import('mattermost-redux/selectors/entities/users'),
        getCurrentUser: () => mockUser,
    };
});
const mockChannel = TestHelper.getChannelMock({
    id: 'channel1',
    team_id: 'team1',
    display_name: 'Test Channel',
    name: 'test-channel',
    purpose: 'Testing purpose',
    header: 'Initial header',
    type: 'O',
});
const baseProps = {
    channel: mockChannel,
    setAreThereUnsavedChanges: jest.fn(),
};
describe('ChannelSettingsInfoTab', () => {
    beforeEach(() => {
        mockChannelPropertiesPermission = true;
        mockConvertToPublicPermission = true;
        mockConvertToPrivatePermission = true;
    });
    it('should render with the correct initial values', () => {
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        expect(screen.getByRole('textbox', {name: 'Channel name'})).toHaveValue('Test Channel');
        expect(screen.getByTestId('channel_settings_purpose_textbox')).toHaveValue('Testing purpose');
        expect(screen.getByTestId('channel_settings_header_textbox')).toHaveValue('Initial header');
        expect(screen.getByRole('button', {name: /Public Channel/}).classList.contains('selected')).toBe(true);
    });
    it('should show SaveChangesPanel when changes are made', async () => {
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        expect(screen.queryByRole('button', {name: 'Save'})).not.toBeInTheDocument();
        await act(async () => {
            const nameInput = screen.getByRole('textbox', {name: 'Channel name'});
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, 'Updated Channel Name');
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(screen.queryByRole('button', {name: 'Save'})).toBeInTheDocument();
    });
    it('should call patchChannel with updated values when Save is clicked (non-privacy changes)', async () => {
        const {patchChannel} = require('mattermost-redux/actions/channels');
        patchChannel.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        await act(async () => {
            const nameInput = screen.getByRole('textbox', {name: 'Channel name'});
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, 'Updated Channel Name');
            const purposeInput = screen.getByTestId('channel_settings_purpose_textbox');
            await userEvent.clear(purposeInput);
            await userEvent.type(purposeInput, 'Updated purpose');
            const headerInput = screen.getByTestId('channel_settings_header_textbox');
            await userEvent.clear(headerInput);
            await userEvent.type(headerInput, 'Updated header');
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        expect(patchChannel).toHaveBeenCalledWith('channel1', {
            display_name: 'Updated Channel Name',
            purpose: 'Updated purpose',
            header: 'Updated header',
        });
    });
    it('should trim whitespace from channel fields when saving', async () => {
        const {patchChannel} = require('mattermost-redux/actions/channels');
        patchChannel.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        await act(async () => {
            const nameInput = screen.getByRole('textbox', {name: 'Channel name'});
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, '  Channel Name With Whitespace  ');
            const purposeInput = screen.getByTestId('channel_settings_purpose_textbox');
            await userEvent.clear(purposeInput);
            await userEvent.type(purposeInput, '  Purpose with whitespace  ');
            const headerInput = screen.getByTestId('channel_settings_header_textbox');
            await userEvent.clear(headerInput);
            await userEvent.type(headerInput, '  Header with whitespace  ');
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        expect(patchChannel).toHaveBeenCalledWith('channel1', {
            display_name: 'Channel Name With Whitespace',
            purpose: 'Purpose with whitespace',
            header: 'Header with whitespace',
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(screen.getByRole('textbox', {name: 'Channel name'})).toHaveValue('Channel Name With Whitespace');
        expect(screen.getByTestId('channel_settings_purpose_textbox')).toHaveValue('Purpose with whitespace');
        expect(screen.getByTestId('channel_settings_header_textbox')).toHaveValue('Header with whitespace');
    });
    it('should hide SaveChangesPanel after successful save', async () => {
        const {patchChannel} = require('mattermost-redux/actions/channels');
        patchChannel.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        expect(screen.queryByRole('button', {name: 'Save'})).not.toBeInTheDocument();
        await act(async () => {
            const nameInput = screen.getByRole('textbox', {name: 'Channel name'});
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, 'Updated Channel Name');
        });
        expect(screen.getByRole('button', {name: 'Save'})).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(screen.queryByRole('button', {name: 'Save'})).not.toBeInTheDocument();
    });
    it('should reset form when Reset button is clicked', async () => {
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        await act(async () => {
            const nameInput = screen.getByRole('textbox', {name: 'Channel name'});
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, 'Updated Channel Name');
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(screen.queryByRole('button', {name: 'Save'})).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: 'Reset'}));
        expect(screen.getByRole('textbox', {name: 'Channel name'})).toHaveValue('Test Channel');
        expect(screen.queryByRole('button', {name: 'Save'})).not.toBeInTheDocument();
    });
    it('should show error state when save fails', async () => {
        const {patchChannel} = require('mattermost-redux/actions/channels');
        patchChannel.mockReturnValue({type: 'MOCK_ACTION', error: {message: 'Error saving channel'}});
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        await act(async () => {
            const nameInput = screen.getByRole('textbox', {name: 'Channel name'});
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, 'Updated Channel Name');
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        const errorMessage = screen.getByText(/There are errors in the form above/);
        const errorPanel = errorMessage.closest('.SaveChangesPanel');
        expect(errorPanel).toHaveClass('error');
    });
    it('should show error when channel name field has an error', async () => {
        renderWithContext(
            <ChannelSettingsInfoTab
                {...baseProps}
            />,
        );
        await act(async () => {
            const nameInput = screen.getByRole('textbox', {name: 'Channel name'});
            await userEvent.clear(nameInput);
            await userEvent.type(nameInput, 'Updated Channel Name');
            await userEvent.clear(nameInput);
            nameInput.blur();
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        const errorMessage = screen.getByText(/There are errors in the form above/);
        const errorPanel = errorMessage.closest('.SaveChangesPanel');
        expect(errorPanel).toHaveClass('error');
    });
    it('should show error when purpose exceeds character limit', async () => {
        renderWithContext(
            <ChannelSettingsInfoTab
                {...baseProps}
            />,
        );
        const longPurpose = 'a'.repeat(1025);
        await act(async () => {
            const purposeInput = screen.getByTestId('channel_settings_purpose_textbox');
            await userEvent.clear(purposeInput);
            await userEvent.type(purposeInput, longPurpose);
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        const errorMessage = screen.getByText(/There are errors in the form above/);
        const errorPanel = errorMessage.closest('.SaveChangesPanel');
        expect(errorPanel).toHaveClass('error');
    });
    it('should show error when header exceeds character limit', async () => {
        renderWithContext(
            <ChannelSettingsInfoTab
                {...baseProps}
            />,
        );
        const longHeader = 'a'.repeat(1025);
        await act(async () => {
            const headerInput = screen.getByTestId('channel_settings_header_textbox');
            await userEvent.clear(headerInput);
            await userEvent.type(headerInput, longHeader);
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        const errorMessage = screen.getByText(/There are errors in the form above/);
        const errorPanel = errorMessage.closest('.SaveChangesPanel');
        expect(errorPanel).toHaveClass('error');
    });
    it('should render ChannelNameFormField and AdvancedTextbox as readOnly when user does not have permission', () => {
        mockChannelPropertiesPermission = false;
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        const nameInput = screen.getByRole('textbox', {name: 'Channel name'});
        expect(nameInput).toBeDisabled();
        expect(screen.queryByTestId('mock-show-format')).not.toBeInTheDocument();
    });
    it('should render ChannelNameFormField and AdvancedTextbox as not readOnly when user has permission', () => {
        mockChannelPropertiesPermission = true;
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        const nameInput = screen.getByRole('textbox', {name: 'Channel name'});
        expect(nameInput).not.toBeDisabled();
        const previewButtons = screen.queryAllByTestId('mock-show-format');
        expect(previewButtons.length).toBeGreaterThan(0);
    });
    it('should not allow channel type change when user lacks permissions', async () => {
        mockConvertToPublicPermission = false;
        mockConvertToPrivatePermission = false;
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        const privateButton = screen.getByRole('button', {name: /Private Channel/});
        expect(privateButton).toHaveClass('disabled');
    });
    it('should allow channel type change UI when user has permission to convert to private', async () => {
        mockConvertToPrivatePermission = true;
        mockConvertToPublicPermission = true;
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        const privateButton = screen.getByRole('button', {name: /Private Channel/});
        expect(privateButton).not.toBeDisabled();
        await userEvent.click(privateButton);
        expect(privateButton).toHaveClass('selected');
    });
    it('should never allow conversion from private to public', async () => {
        mockConvertToPublicPermission = true;
        const privateChannel = {
            ...mockChannel,
            type: 'P' as ChannelType,
        };
        renderWithContext(
            <ChannelSettingsInfoTab
                {...baseProps}
                channel={privateChannel}
            />,
        );
        const publicButton = screen.getByRole('button', {name: /Public Channel/});
        expect(publicButton).toHaveClass('disabled');
        const privateButton = screen.getByRole('button', {name: /Private Channel/});
        expect(privateButton).toHaveClass('selected');
    });
    it('should show ConvertConfirmModal when converting from public to private', async () => {
        mockConvertToPrivatePermission = true;
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        const privateButton = screen.getByRole('button', {name: /Private Channel/});
        await userEvent.click(privateButton);
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        expect(screen.getByTestId('convert-confirm-modal')).toBeInTheDocument();
    });
    it('should convert channel when confirming in ConvertConfirmModal', async () => {
        mockConvertToPrivatePermission = true;
        const {updateChannelPrivacy} = require('mattermost-redux/actions/channels');
        updateChannelPrivacy.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        const privateButton = screen.getByRole('button', {name: /Private Channel/});
        await userEvent.click(privateButton);
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        await userEvent.click(screen.getByText(/Yes, Convert Channel/i));
        expect(updateChannelPrivacy).toHaveBeenCalledWith('channel1', 'P');
    });
    it('should not convert channel when canceling in ConvertConfirmModal', async () => {
        mockConvertToPrivatePermission = true;
        const {updateChannelPrivacy} = require('mattermost-redux/actions/channels');
        updateChannelPrivacy.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        const privateButton = screen.getByRole('button', {name: /Private Channel/});
        await userEvent.click(privateButton);
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        await userEvent.click(screen.getByText(/Cancel/i));
        expect(updateChannelPrivacy).not.toHaveBeenCalled();
    });
    it('should handle errors when converting channel privacy', async () => {
        mockConvertToPrivatePermission = true;
        const {updateChannelPrivacy} = require('mattermost-redux/actions/channels');
        updateChannelPrivacy.mockReturnValue({
            type: 'MOCK_ACTION',
            error: {message: 'Error changing privacy'},
        });
        renderWithContext(<ChannelSettingsInfoTab {...baseProps}/>);
        const privateButton = screen.getByRole('button', {name: /Private Channel/});
        await userEvent.click(privateButton);
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        await userEvent.click(screen.getByText(/Yes, Convert Channel/i));
        expect(screen.getByText(/There are errors in the form above/)).toBeInTheDocument();
    });
});