import React from 'react';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import ChannelSettingsConfigurationTab from './channel_settings_configuration_tab';
jest.mock('mattermost-redux/actions/channels', () => ({
    patchChannel: jest.fn(),
}));
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
const mockChannel = TestHelper.getChannelMock({
    id: 'channel1',
    team_id: 'team1',
    display_name: 'Test Channel',
    name: 'test-channel',
    purpose: 'Testing purpose',
    header: 'Initial header',
    type: 'O',
    banner_info: {
        enabled: false,
        text: '',
        background_color: '',
    },
});
const mockChannelWithBanner = TestHelper.getChannelMock({
    id: 'channel1',
    team_id: 'team1',
    display_name: 'Test Channel',
    name: 'test-channel',
    purpose: 'Testing purpose',
    header: 'Initial header',
    type: 'O',
    banner_info: {
        enabled: true,
        text: 'Test banner text',
        background_color: '#ff0000',
    },
});
const baseProps = {
    channel: mockChannel,
    setAreThereUnsavedChanges: jest.fn(),
    canManageBanner: true,
};
describe('ChannelSettingsConfigurationTab', () => {
    it('should render with the correct initial values when banner is disabled', () => {
        renderWithContext(<ChannelSettingsConfigurationTab {...baseProps}/>);
        const toggle = screen.getByTestId('channelBannerToggle-button');
        expect(toggle).toBeInTheDocument();
        expect(toggle).not.toHaveClass('active');
        expect(screen.queryByTestId('channel_banner_banner_text_textbox')).not.toBeInTheDocument();
        expect(screen.queryByTestId('channel_banner_banner_background_color_picker')).not.toBeInTheDocument();
    });
    it('should render with the correct default values when banner is enabled', async () => {
        const channelWithNoColor = {...mockChannelWithBanner, banner_info: undefined};
        renderWithContext(<ChannelSettingsConfigurationTab {...{...baseProps, channel: channelWithNoColor}}/>);
        const toggle = screen.getByTestId('channelBannerToggle-button');
        expect(toggle).toBeInTheDocument();
        expect(toggle).not.toHaveClass('active');
        await userEvent.click(screen.getByTestId('channelBannerToggle-button'));
        expect(screen.getByTestId('channel_banner_banner_text_textbox')).toBeInTheDocument();
        expect(screen.getByTestId('channel_banner_banner_text_textbox')).toHaveValue('');
        expect(screen.getByTestId('color-inputColorValue')).toBeInTheDocument();
        expect(screen.getByTestId('color-inputColorValue')).toHaveValue('#DDDDDD');
    });
    it('should render with the correct initial values when banner is enabled', () => {
        renderWithContext(<ChannelSettingsConfigurationTab {...{...baseProps, channel: mockChannelWithBanner}}/>);
        const toggle = screen.getByTestId('channelBannerToggle-button');
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveClass('active');
        expect(screen.getByTestId('channel_banner_banner_text_textbox')).toBeInTheDocument();
        expect(screen.getByTestId('channel_banner_banner_text_textbox')).toHaveValue('Test banner text');
        expect(screen.getByTestId('color-inputColorValue')).toBeInTheDocument();
        expect(screen.getByTestId('color-inputColorValue')).toHaveValue('#ff0000');
    });
    it('should show banner settings when toggle is clicked', async () => {
        renderWithContext(<ChannelSettingsConfigurationTab {...baseProps}/>);
        expect(screen.queryByTestId('channel_banner_banner_text_textbox')).not.toBeInTheDocument();
        await userEvent.click(screen.getByTestId('channelBannerToggle-button'));
        expect(screen.getByTestId('channel_banner_banner_text_textbox')).toBeInTheDocument();
        expect(screen.getByTestId('color-inputColorValue')).toBeInTheDocument();
    });
    it('should show SaveChangesPanel when changes are made', async () => {
        renderWithContext(<ChannelSettingsConfigurationTab {...baseProps}/>);
        expect(screen.queryByRole('button', {name: 'Save'})).not.toBeInTheDocument();
        await userEvent.click(screen.getByTestId('channelBannerToggle-button'));
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(screen.getByRole('button', {name: 'Save'})).toBeInTheDocument();
    });
    it('should call patchChannel with updated values when Save is clicked', async () => {
        const {patchChannel} = require('mattermost-redux/actions/channels');
        patchChannel.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        renderWithContext(<ChannelSettingsConfigurationTab {...baseProps}/>);
        await userEvent.click(screen.getByTestId('channelBannerToggle-button'));
        const textInput = screen.getByTestId('channel_banner_banner_text_textbox');
        await userEvent.clear(textInput);
        await userEvent.type(textInput, 'New banner text');
        const colorInput = screen.getByTestId('color-inputColorValue');
        await userEvent.clear(colorInput);
        await userEvent.type(colorInput, '#AA00AA');
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        expect(patchChannel).toHaveBeenCalledWith('channel1', {
            banner_info: {
                enabled: true,
                text: 'New banner text',
                background_color: expect.any(String),
            },
        });
    });
    it('should reset form when Reset button is clicked', async () => {
        renderWithContext(<ChannelSettingsConfigurationTab {...{...baseProps, channel: mockChannelWithBanner}}/>);
        const textInput = screen.getByTestId('channel_banner_banner_text_textbox');
        await userEvent.clear(textInput);
        await userEvent.type(textInput, 'Changed banner text');
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(screen.getByRole('button', {name: 'Save'})).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: 'Reset'}));
        expect(screen.getByTestId('channel_banner_banner_text_textbox')).toHaveValue('Test banner text');
        expect(screen.queryByRole('button', {name: 'Save'})).not.toBeInTheDocument();
    });
    it('should show error when banner text is empty but banner is enabled', async () => {
        renderWithContext(<ChannelSettingsConfigurationTab {...baseProps}/>);
        await userEvent.click(screen.getByTestId('channelBannerToggle-button'));
        const textInput = screen.getByTestId('channel_banner_banner_text_textbox');
        await userEvent.clear(textInput);
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        const errorMessage = screen.getByText(/Banner text is required/);
        const errorPanel = errorMessage.closest('.SaveChangesPanel');
        expect(errorPanel).toHaveClass('error');
    });
    it('should show error when banner text exceeds character limit', async () => {
        renderWithContext(<ChannelSettingsConfigurationTab {...baseProps}/>);
        await userEvent.click(screen.getByTestId('channelBannerToggle-button'));
        const longText = 'a'.repeat(1025);
        const textInput = screen.getByTestId('channel_banner_banner_text_textbox');
        await userEvent.clear(textInput);
        await userEvent.type(textInput, longText);
        await new Promise((resolve) => setTimeout(resolve, 0));
        const errorMessage = screen.getByText(/There are errors in the form above/);
        const errorPanel = errorMessage.closest('.SaveChangesPanel');
        expect(errorPanel).toHaveClass('error');
    });
    it('should toggle preview when preview button is clicked', async () => {
        renderWithContext(<ChannelSettingsConfigurationTab {...{...baseProps, channel: mockChannelWithBanner}}/>);
        const previewButton = screen.getByTestId('mock-show-format');
        expect(previewButton).not.toHaveClass('active');
        await userEvent.click(previewButton);
        expect(previewButton).toHaveClass('active');
    });
    it('should disable banner when toggle is clicked while banner is enabled', async () => {
        renderWithContext(<ChannelSettingsConfigurationTab {...{...baseProps, channel: mockChannelWithBanner}}/>);
        expect(screen.getByTestId('channel_banner_banner_text_textbox')).toBeInTheDocument();
        await userEvent.click(screen.getByTestId('channelBannerToggle-button'));
        expect(screen.queryByTestId('channel_banner_banner_text_textbox')).not.toBeInTheDocument();
    });
    it('should show error when banner color is empty but banner is enabled', async () => {
        const {patchChannel} = require('mattermost-redux/actions/channels');
        patchChannel.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        renderWithContext(<ChannelSettingsConfigurationTab {...baseProps}/>);
        await userEvent.click(screen.getByTestId('channelBannerToggle-button'));
        const textInput = screen.getByTestId('channel_banner_banner_text_textbox');
        await userEvent.clear(textInput);
        await userEvent.type(textInput, 'New banner text');
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        const errorMessage = screen.getByText(/Banner color is required/);
        const errorPanel = errorMessage.closest('.SaveChangesPanel');
        expect(errorPanel).toHaveClass('error');
    });
    it('should save valid colors in hex format', async () => {
        const {patchChannel} = require('mattermost-redux/actions/channels');
        patchChannel.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        renderWithContext(<ChannelSettingsConfigurationTab {...baseProps}/>);
        await userEvent.click(screen.getByTestId('channelBannerToggle-button'));
        const textInput = screen.getByTestId('channel_banner_banner_text_textbox');
        await userEvent.clear(textInput);
        await userEvent.type(textInput, 'New banner text');
        const colorInput = screen.getByTestId('color-inputColorValue');
        await userEvent.clear(colorInput);
        await userEvent.type(colorInput, '#ff0000');
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        expect(patchChannel).toHaveBeenCalledWith('channel1', expect.objectContaining({
            banner_info: expect.objectContaining({
                background_color: expect.stringMatching(/#[0-9a-f]{6}/i),
            }),
        }));
    });
    it('only valid colors will make the save changes panel visible', async () => {
        const {patchChannel} = require('mattermost-redux/actions/channels');
        patchChannel.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        patchChannel.mockClear();
        const originalColor = '#DDDDDD';
        const channelWithValidColor = {
            ...mockChannel,
            banner_info: {
                enabled: true,
                text: 'Test text',
                background_color: originalColor,
            },
        };
        renderWithContext(
            <ChannelSettingsConfigurationTab
                channel={channelWithValidColor}
                setAreThereUnsavedChanges={jest.fn()}
                canManageBanner={true}
            />,
        );
        const colorInput = screen.getByTestId('color-inputColorValue');
        await userEvent.clear(colorInput);
        await userEvent.type(colorInput, 'not-a-color');
        const textInput = screen.getByTestId('channel_banner_banner_text_textbox');
        await userEvent.clear(textInput);
        await userEvent.type(textInput, 'Test text');
        expect(screen.getByTestId('color-inputColorValue')).toHaveValue(originalColor);
        expect(screen.queryByRole('button', {name: 'Save'})).not.toBeInTheDocument();
        await userEvent.clear(colorInput);
        await userEvent.type(colorInput, '#123456');
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(screen.getByRole('button', {name: 'Save'})).toBeInTheDocument();
    });
    it('should trim whitespace from banner text and color when saving', async () => {
        const {patchChannel} = require('mattermost-redux/actions/channels');
        patchChannel.mockReturnValue({type: 'MOCK_ACTION', data: {}});
        renderWithContext(<ChannelSettingsConfigurationTab {...{...baseProps, channel: mockChannelWithBanner}}/>);
        const textInput = screen.getByTestId('channel_banner_banner_text_textbox');
        await userEvent.clear(textInput);
        await userEvent.type(textInput, '  Banner text with whitespace  ');
        const colorInput = screen.getByTestId('color-inputColorValue');
        await userEvent.clear(colorInput);
        await userEvent.type(colorInput, '  #00FF00  ');
        await userEvent.click(screen.getByRole('button', {name: 'Save'}));
        expect(patchChannel).toHaveBeenCalledWith('channel1', {
            banner_info: {
                enabled: true,
                text: 'Banner text with whitespace',
                background_color: expect.any(String),
            },
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(textInput).toHaveValue('Banner text with whitespace');
    });
});