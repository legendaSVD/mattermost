import React from 'react';
import {General} from 'mattermost-redux/constants';
import {renderWithContext, screen, waitFor, userEvent} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import ChannelSettingsModal from './channel_settings_modal';
let mockPrivateChannelPermission = true;
let mockPublicChannelPermission = true;
let mockManageChannelAccessRulesPermission = false;
jest.mock('mattermost-redux/selectors/entities/channel_banner', () => ({
    selectChannelBannerEnabled: jest.fn().mockImplementation((state) => {
        return state?.entities?.general?.license?.SkuShortName === 'advanced';
    }),
}));
jest.mock('mattermost-redux/selectors/entities/roles', () => ({
    haveIChannelPermission: jest.fn().mockImplementation((state, teamId, channelId, permission) => {
        if (permission === 'delete_private_channel') {
            return mockPrivateChannelPermission;
        }
        if (permission === 'delete_public_channel') {
            return mockPublicChannelPermission;
        }
        if (permission === 'manage_channel_access_rules') {
            return mockManageChannelAccessRulesPermission;
        }
        return true;
    }),
}));
jest.mock('selectors/general', () => ({
    isChannelAccessControlEnabled: jest.fn().mockReturnValue(true),
    getBasePath: jest.fn().mockReturnValue(''),
}));
jest.mock('./channel_settings_info_tab', () => {
    const React = require('react');
    return function MockChannelSettingsInfoTab({
        setAreThereUnsavedChanges,
        showTabSwitchError,
    }: {
        setAreThereUnsavedChanges?: (value: boolean) => void;
        showTabSwitchError?: boolean;
    }) {
        return React.createElement('div', {'data-testid': 'info-tab'}, [
            'Info Tab Content',
            setAreThereUnsavedChanges && React.createElement('button', {
                key: 'set-unsaved',
                'data-testid': 'set-unsaved-changes',
                onClick: () => setAreThereUnsavedChanges(true),
            }, 'Make Unsaved Changes'),
            setAreThereUnsavedChanges && React.createElement('button', {
                key: 'save',
                'data-testid': 'save-changes',
                onClick: () => setAreThereUnsavedChanges(false),
            }, 'Save Changes'),
            showTabSwitchError && React.createElement('div', {
                key: 'warning',
                'data-testid': 'warning-panel',
            }, 'You have unsaved changes'),
        ]);
    };
});
jest.mock('./channel_settings_configuration_tab', () => {
    return function MockConfigTab(): JSX.Element {
        return <div data-testid='config-tab'>{'Configuration Tab Content'}</div>;
    };
});
jest.mock('./channel_settings_archive_tab', () => {
    return function MockArchiveTab(): JSX.Element {
        return <div data-testid='archive-tab'>{'Archive Tab Content'}</div>;
    };
});
jest.mock('./channel_settings_access_rules_tab', () => {
    return function MockAccessRulesTab(): JSX.Element {
        return <div data-testid='access-rules-tab'>{'Access Rules Tab Content'}</div>;
    };
});
type TabType = {
    name: string;
    uiName: string;
    display?: boolean;
};
jest.mock('components/settings_sidebar', () => {
    return function MockSettingsSidebar({tabs, activeTab, updateTab}: {tabs: TabType[]; activeTab: string; updateTab: (tab: string) => void}): JSX.Element {
        return (
            <div data-testid='settings-sidebar'>
                {tabs.filter((tab) => tab.display !== false).map((tab) => (
                    <button
                        data-testid={`${tab.name}-tab-button`}
                        key={tab.name}
                        role='tab'
                        aria-selected={activeTab === tab.name}
                        aria-label={tab.name}
                        onClick={() => updateTab(tab.name)}
                    >
                        {tab.uiName}
                    </button>
                ))}
            </div>
        );
    };
});
describe('ChannelSettingsModal', () => {
    const channelId = 'channel1';
    const baseProps = {
        channelId,
        isOpen: true,
        onExited: jest.fn(),
        focusOriginElement: 'button1',
    };
    function makeTestState() {
        return {
            entities: {
                channels: {
                    channels: {
                        [channelId]: TestHelper.getChannelMock({
                            id: channelId,
                            type: General.OPEN_CHANNEL,
                            purpose: 'Testing purpose',
                            header: 'Channel header',
                            group_constrained: false,
                        }),
                    },
                },
                general: {
                    license: {
                        SkuShortName: '',
                    },
                },
            },
        };
    }
    beforeEach(() => {
        mockPrivateChannelPermission = true;
        mockPublicChannelPermission = true;
        mockManageChannelAccessRulesPermission = false;
    });
    it('should render the modal with correct header text', async () => {
        const testState = makeTestState();
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        expect(screen.getByText('Channel Settings')).toBeInTheDocument();
    });
    it('should render Info tab by default', async () => {
        const testState = makeTestState();
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        await waitFor(() => {
            expect(screen.getByTestId('info-tab')).toBeInTheDocument();
        });
    });
    it('should switch tabs when clicked', async () => {
        const testState = makeTestState();
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        await waitFor(() => {
            expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
        });
        expect(screen.getByTestId('info-tab')).toBeInTheDocument();
        const archiveTab = screen.getByRole('tab', {name: 'archive'});
        await userEvent.click(archiveTab);
        expect(screen.getByTestId('archive-tab')).toBeInTheDocument();
    });
    it('should not show archive tab for default channel', async () => {
        const testState = makeTestState();
        testState.entities.channels.channels[channelId].name = 'town-square';
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        await waitFor(() => {
            expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
        });
        expect(screen.getByTestId('info-tab')).toBeInTheDocument();
        expect(screen.queryByRole('tab', {name: 'archive'})).not.toBeInTheDocument();
    });
    it('should show archive tab for public channel when user has permission', async () => {
        mockPublicChannelPermission = true;
        const testState = makeTestState();
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        await waitFor(() => {
            expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
        });
        expect(screen.getByRole('tab', {name: 'archive'})).toBeInTheDocument();
    });
    it('should not show archive tab for public channel when user does not have permission', async () => {
        mockPublicChannelPermission = false;
        const testState = makeTestState();
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        await waitFor(() => {
            expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
        });
        expect(screen.queryByRole('tab', {name: 'archive'})).not.toBeInTheDocument();
    });
    it('should show archive tab for private channel when user has permission', async () => {
        mockPrivateChannelPermission = true;
        const testState = makeTestState();
        testState.entities.channels.channels[channelId].type = General.PRIVATE_CHANNEL;
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        await waitFor(() => {
            expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
        });
        expect(screen.getByRole('tab', {name: 'archive'})).toBeInTheDocument();
    });
    it('should not show archive tab for private channel when user does not have permission', async () => {
        mockPrivateChannelPermission = false;
        const testState = makeTestState();
        testState.entities.channels.channels[channelId].type = General.PRIVATE_CHANNEL;
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        await waitFor(() => {
            expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
        });
        expect(screen.queryByRole('tab', {name: 'archive'})).not.toBeInTheDocument();
    });
    it('should not show configuration tab with no license', async () => {
        const testState = makeTestState();
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        expect(screen.queryByTestId('configuration-tab-button')).not.toBeInTheDocument();
    });
    it('should not show configuration tab with professional license', async () => {
        const testState = makeTestState();
        testState.entities.general.license.SkuShortName = 'professional';
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        expect(screen.queryByTestId('configuration-tab-button')).not.toBeInTheDocument();
    });
    it('should not show configuration tab with enterprise license', async () => {
        const testState = makeTestState();
        testState.entities.general.license.SkuShortName = 'enterprise';
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        expect(screen.queryByTestId('configuration-tab-button')).not.toBeInTheDocument();
    });
    it('should show configuration tab when enterprise advanced license', async () => {
        const testState = makeTestState();
        testState.entities.general.license.SkuShortName = 'advanced';
        renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
        expect(screen.getByTestId('configuration-tab-button')).toBeInTheDocument();
    });
    describe('Access Control tab visibility', () => {
        it('should show Access Control tab for private channel when user has permission', async () => {
            mockManageChannelAccessRulesPermission = true;
            const testState = makeTestState();
            testState.entities.channels.channels[channelId].type = General.PRIVATE_CHANNEL;
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            expect(screen.getByRole('tab', {name: 'access_rules'})).toBeInTheDocument();
            expect(screen.getByText('Access Control')).toBeInTheDocument();
        });
        it('should not show Access Control tab for private channel when user lacks permission', async () => {
            mockManageChannelAccessRulesPermission = false;
            const testState = makeTestState();
            testState.entities.channels.channels[channelId].type = General.PRIVATE_CHANNEL;
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            expect(screen.queryByRole('tab', {name: 'access_rules'})).not.toBeInTheDocument();
            expect(screen.queryByText('Access Control')).not.toBeInTheDocument();
        });
        it('should not show Access Control tab for public channel even with permission', async () => {
            mockManageChannelAccessRulesPermission = true;
            const testState = makeTestState();
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            expect(screen.queryByRole('tab', {name: 'access_rules'})).not.toBeInTheDocument();
            expect(screen.queryByText('Access Control')).not.toBeInTheDocument();
        });
        it('should not show Access Control tab for public channel without permission', async () => {
            mockManageChannelAccessRulesPermission = false;
            const testState = makeTestState();
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            expect(screen.queryByRole('tab', {name: 'access_rules'})).not.toBeInTheDocument();
            expect(screen.queryByText('Access Control')).not.toBeInTheDocument();
        });
        it('should be able to navigate to Access Control tab when visible', async () => {
            mockManageChannelAccessRulesPermission = true;
            const testState = makeTestState();
            testState.entities.channels.channels[channelId].type = General.PRIVATE_CHANNEL;
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            expect(screen.getByTestId('info-tab')).toBeInTheDocument();
            const accessControlTab = screen.getByRole('tab', {name: 'access_rules'});
            await userEvent.click(accessControlTab);
            expect(screen.getByTestId('access-rules-tab')).toBeInTheDocument();
            expect(screen.getByText('Access Rules Tab Content')).toBeInTheDocument();
        });
        it('should show correct tab label as "Access Control"', async () => {
            mockManageChannelAccessRulesPermission = true;
            const testState = makeTestState();
            testState.entities.channels.channels[channelId].type = General.PRIVATE_CHANNEL;
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            const accessControlTab = screen.getByRole('tab', {name: 'access_rules'});
            expect(accessControlTab).toHaveTextContent('Access Control');
        });
        it('should show Access Control tab for default channel if private and user has permission', async () => {
            mockManageChannelAccessRulesPermission = true;
            const testState = makeTestState();
            testState.entities.channels.channels[channelId].name = 'town-square';
            testState.entities.channels.channels[channelId].type = General.PRIVATE_CHANNEL;
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            expect(screen.getByRole('tab', {name: 'access_rules'})).toBeInTheDocument();
        });
        it('should not show Access Control tab for group-constrained private channel even with permission', async () => {
            mockManageChannelAccessRulesPermission = true;
            const testState = makeTestState();
            testState.entities.channels.channels[channelId].type = General.PRIVATE_CHANNEL;
            testState.entities.channels.channels[channelId].group_constrained = true;
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            expect(screen.queryByRole('tab', {name: 'access_rules'})).not.toBeInTheDocument();
            expect(screen.queryByText('Access Control')).not.toBeInTheDocument();
        });
        it('should not show Access Control tab for group-constrained private channel without permission', async () => {
            mockManageChannelAccessRulesPermission = false;
            const testState = makeTestState();
            testState.entities.channels.channels[channelId].type = General.PRIVATE_CHANNEL;
            testState.entities.channels.channels[channelId].group_constrained = true;
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            expect(screen.queryByRole('tab', {name: 'access_rules'})).not.toBeInTheDocument();
            expect(screen.queryByText('Access Control')).not.toBeInTheDocument();
        });
        it('should not show Access Control tab for group-constrained public channel', async () => {
            mockManageChannelAccessRulesPermission = true;
            const testState = makeTestState();
            testState.entities.channels.channels[channelId].group_constrained = true;
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, testState);
            await waitFor(() => {
                expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument();
            });
            expect(screen.queryByRole('tab', {name: 'access_rules'})).not.toBeInTheDocument();
            expect(screen.queryByText('Access Control')).not.toBeInTheDocument();
        });
    });
    describe('warn-once modal closing behavior', () => {
        it('should close immediately when no unsaved changes exist', async () => {
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, makeTestState());
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const closeButton = screen.getByLabelText(/close/i);
            await userEvent.click(closeButton);
            await waitFor(() => {
                expect(baseProps.onExited).toHaveBeenCalled();
            });
        });
        it('should prevent close on first attempt with unsaved changes', async () => {
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, makeTestState());
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            const setUnsavedButton = screen.getByTestId('set-unsaved-changes');
            await userEvent.click(setUnsavedButton);
            const closeButton = screen.getByLabelText(/close/i);
            await userEvent.click(closeButton);
            await waitFor(() => {
                expect(screen.getByTestId('warning-panel')).toBeInTheDocument();
            });
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(baseProps.onExited).not.toHaveBeenCalled();
        });
        it('should allow close on second attempt (warn-once behavior)', async () => {
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, makeTestState());
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            await userEvent.click(screen.getByTestId('set-unsaved-changes'));
            const closeButton = screen.getByLabelText(/close/i);
            await userEvent.click(closeButton);
            await waitFor(() => {
                expect(screen.getByTestId('warning-panel')).toBeInTheDocument();
            });
            await userEvent.click(closeButton);
            await waitFor(() => {
                expect(baseProps.onExited).toHaveBeenCalled();
            });
        });
        it('should reset warning state when changes are saved', async () => {
            renderWithContext(<ChannelSettingsModal {...baseProps}/>, makeTestState());
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
            await userEvent.click(screen.getByTestId('set-unsaved-changes'));
            const closeButton = screen.getByLabelText(/close/i);
            await userEvent.click(closeButton);
            await waitFor(() => {
                expect(screen.getByTestId('warning-panel')).toBeInTheDocument();
            });
            await userEvent.click(screen.getByTestId('save-changes'));
            await userEvent.click(closeButton);
            await waitFor(() => {
                expect(baseProps.onExited).toHaveBeenCalled();
            });
        });
    });
});