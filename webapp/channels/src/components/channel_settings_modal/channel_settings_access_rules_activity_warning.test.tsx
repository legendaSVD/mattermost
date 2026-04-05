import {act, screen, waitFor} from '@testing-library/react';
import React from 'react';
import type {Channel} from '@mattermost/types/channels';
import TableEditor from 'components/admin_console/access_control/editors/table_editor/table_editor';
import {useChannelAccessControlActions} from 'hooks/useChannelAccessControlActions';
import {useChannelSystemPolicies} from 'hooks/useChannelSystemPolicies';
import {renderWithContext, userEvent} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import ChannelSettingsAccessRulesTab from './channel_settings_access_rules_tab';
jest.mock('hooks/useChannelAccessControlActions');
jest.mock('hooks/useChannelSystemPolicies');
jest.mock('components/admin_console/access_control/editors/table_editor/table_editor', () => {
    const React = require('react');
    return jest.fn(() => React.createElement('div', {'data-testid': 'table-editor'}, 'TableEditor'));
});
jest.mock('components/widgets/modals/components/save_changes_panel', () => {
    const React = require('react');
    return jest.fn((props) => {
        return React.createElement('div', {
            'data-testid': 'save-changes-panel',
            'data-state': props.state,
        }, [
            React.createElement('button', {
                key: 'save',
                'data-testid': 'SaveChangesPanel__save-btn',
                onClick: props.handleSubmit,
                disabled: props.state === 'saving',
            }, props.state === 'saving' ? 'Saving...' : 'Save'),
            React.createElement('button', {
                key: 'cancel',
                'data-testid': 'SaveChangesPanel__cancel-btn',
                onClick: props.handleCancel,
            }, 'Cancel'),
        ]);
    });
});
jest.mock('./channel_activity_warning_modal', () => {
    return function MockChannelActivityWarningModal({
        isOpen,
        onClose,
        onConfirm,
    }: {
        isOpen: boolean;
        onClose: () => void;
        onConfirm: () => void;
    }) {
        const React = require('react');
        if (!isOpen) {
            return null;
        }
        return React.createElement('div', {'data-testid': 'activity-warning-modal'}, [
            React.createElement('div', {key: 'title'}, 'Exposing channel history'),
            React.createElement('button', {
                key: 'cancel',
                'data-testid': 'warning-cancel',
                onClick: onClose,
            }, 'Cancel'),
            React.createElement('button', {
                key: 'continue',
                'data-testid': 'warning-continue',
                onClick: onConfirm,
            }, 'Continue'),
        ]);
    };
});
jest.mock('./channel_access_rules_confirm_modal', () => {
    return function MockChannelAccessRulesConfirmModal({
        show,
        onHide,
        onConfirm,
        channelName,
    }: {
        show: boolean;
        onHide: () => void;
        onConfirm: () => void;
        channelName: string;
    }) {
        const React = require('react');
        if (!show) {
            return null;
        }
        return React.createElement('div', {'data-testid': 'channel-access-rules-confirm-modal'}, [
            React.createElement('div', {key: 'title'}, 'Save and apply rules'),
            React.createElement('div', {key: 'subtitle'}, `Channel: ${channelName}`),
            React.createElement('button', {
                key: 'cancel',
                'data-testid': 'confirm-cancel',
                onClick: onHide,
            }, 'Cancel'),
            React.createElement('button', {
                key: 'confirm',
                'data-testid': 'confirm-save',
                onClick: onConfirm,
            }, 'Save and apply'),
        ]);
    };
});
const mockUseChannelAccessControlActions = useChannelAccessControlActions as jest.MockedFunction<typeof useChannelAccessControlActions>;
const mockUseChannelSystemPolicies = useChannelSystemPolicies as jest.MockedFunction<typeof useChannelSystemPolicies>;
const MockedTableEditor = TableEditor as jest.MockedFunction<typeof TableEditor>;
describe('ChannelSettingsAccessRulesTab - Activity Warning Integration', () => {
    const mockChannel: Channel = {
        ...TestHelper.getChannelMock({
            id: 'channel_id',
            name: 'test-channel',
            display_name: 'Test Channel',
            type: 'P',
        }),
    };
    const mockUserAttributes = [
        {id: 'attr1', name: 'department', label: 'Department', type: 'text'},
        {id: 'attr2', name: 'role', label: 'Role', type: 'text'},
    ];
    const mockActions = {
        getAccessControlFields: jest.fn().mockResolvedValue({data: mockUserAttributes}),
        getVisualAST: jest.fn().mockResolvedValue({data: {}}),
        searchUsers: jest.fn().mockResolvedValue({data: {users: [], total: 0}}),
        getChannelPolicy: jest.fn().mockResolvedValue({data: null}),
        saveChannelPolicy: jest.fn().mockResolvedValue({data: {}}),
        deleteChannelPolicy: jest.fn().mockResolvedValue({data: {}}),
        getChannelMembers: jest.fn().mockResolvedValue({data: []}),
        createJob: jest.fn().mockResolvedValue({data: {}}),
        createAccessControlSyncJob: jest.fn().mockResolvedValue({data: {}}),
        updateAccessControlPoliciesActive: jest.fn().mockResolvedValue({data: {}}),
        validateExpressionAgainstRequester: jest.fn().mockResolvedValue({data: {requester_matches: true}}),
        savePreferences: jest.fn().mockResolvedValue({data: {}}),
    };
    const defaultProps = {
        channel: mockChannel,
        setAreThereUnsavedChanges: jest.fn(),
        showTabSwitchError: false,
    };
    const initialState = {
        entities: {
            users: {
                currentUserId: 'current_user_id',
                profiles: {
                    current_user_id: {
                        id: 'current_user_id',
                        username: 'testuser',
                        first_name: 'Test',
                        last_name: 'User',
                    },
                },
            },
            channels: {
                messageCounts: {
                    channel_id: {
                        root: 10,
                        total: 15,
                    },
                },
            },
            preferences: {
                myPreferences: {},
            },
        },
    };
    beforeEach(() => {
        mockUseChannelAccessControlActions.mockReturnValue(mockActions);
        mockUseChannelSystemPolicies.mockReturnValue({
            policies: [],
            loading: false,
            error: null,
        });
    });
    it('should show activity warning modal when modifying existing rules to be less restrictive', async () => {
        mockActions.getChannelPolicy.mockResolvedValue({
            data: {
                id: 'channel_id',
                rules: [{expression: 'user.department == "Engineering"'}],
                active: true,
            },
        });
        mockActions.searchUsers.mockImplementation((expression: string) => {
            if (expression.includes('Engineering') && !expression.includes('Sales')) {
                return Promise.resolve({
                    data: {users: [{id: 'user1'}], total: 1},
                });
            }
            if (expression.includes('Sales')) {
                return Promise.resolve({
                    data: {users: [{id: 'user1'}, {id: 'user2'}], total: 2},
                });
            }
            return Promise.resolve({data: {users: [], total: 0}});
        });
        mockActions.getChannelMembers.mockResolvedValue({
            data: [],
        });
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...defaultProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
        act(() => {
            onChangeCallback('user.department == "Engineering" OR user.department == "Sales"');
        });
        await waitFor(() => {
            expect(screen.getByTestId('save-changes-panel')).toBeInTheDocument();
        });
        const saveButton = screen.getByTestId('SaveChangesPanel__save-btn');
        await userEvent.click(saveButton);
        await waitFor(() => {
            expect(screen.getByTestId('channel-access-rules-confirm-modal')).toBeInTheDocument();
        });
        const continueButton = screen.getByTestId('confirm-save');
        await userEvent.click(continueButton);
        await waitFor(() => {
            expect(screen.getByTestId('activity-warning-modal')).toBeInTheDocument();
        }, {timeout: 5000});
        expect(screen.getByText('Exposing channel history')).toBeInTheDocument();
        expect(screen.getByTestId('warning-cancel')).toBeInTheDocument();
        expect(screen.getByTestId('warning-continue')).toBeInTheDocument();
    });
    it('should continue with save when user confirms activity warning', async () => {
        mockActions.getChannelPolicy.mockResolvedValue({
            data: {
                id: 'channel_id',
                rules: [{expression: 'user.department == "Engineering"'}],
                active: true,
            },
        });
        mockActions.searchUsers.mockImplementation((expression: string) => {
            if (expression.includes('Engineering') && !expression.includes('Sales')) {
                return Promise.resolve({
                    data: {users: [{id: 'user1'}], total: 1},
                });
            }
            if (expression.includes('Sales')) {
                return Promise.resolve({
                    data: {users: [{id: 'user1'}, {id: 'user2'}], total: 2},
                });
            }
            return Promise.resolve({data: {users: [], total: 0}});
        });
        mockActions.getChannelMembers.mockResolvedValue({data: []});
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...defaultProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
        act(() => {
            onChangeCallback('user.department == "Engineering" OR user.department == "Sales"');
        });
        await waitFor(() => {
            expect(screen.getByTestId('save-changes-panel')).toBeInTheDocument();
        });
        const saveButton = screen.getByTestId('SaveChangesPanel__save-btn');
        await userEvent.click(saveButton);
        await waitFor(() => {
            expect(screen.getByTestId('channel-access-rules-confirm-modal')).toBeInTheDocument();
        });
        const confirmButton = screen.getByTestId('confirm-save');
        await userEvent.click(confirmButton);
        await waitFor(() => {
            expect(screen.getByTestId('activity-warning-modal')).toBeInTheDocument();
        }, {timeout: 5000});
        expect(screen.getByTestId('warning-cancel')).toBeInTheDocument();
        expect(screen.getByTestId('warning-continue')).toBeInTheDocument();
        const continueButton = screen.getByTestId('warning-continue');
        await userEvent.click(continueButton);
        await waitFor(() => {
            expect(screen.queryByTestId('activity-warning-modal')).not.toBeInTheDocument();
        });
    });
});