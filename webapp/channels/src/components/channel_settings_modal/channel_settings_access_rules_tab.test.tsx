import React from 'react';
import type {UserPropertyField} from '@mattermost/types/properties';
import TableEditor from 'components/admin_console/access_control/editors/table_editor/table_editor';
import {useChannelAccessControlActions} from 'hooks/useChannelAccessControlActions';
import {useChannelSystemPolicies} from 'hooks/useChannelSystemPolicies';
import {act, renderWithContext, screen, waitFor, userEvent} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
import ChannelSettingsAccessRulesTab from './channel_settings_access_rules_tab';
jest.mock('hooks/useChannelAccessControlActions');
jest.mock('hooks/useChannelSystemPolicies');
jest.mock('components/admin_console/access_control/editors/table_editor/table_editor', () => {
    const React = require('react');
    return jest.fn(() => React.createElement('div', {'data-testid': 'table-editor'}, 'TableEditor'));
});
const mockUseChannelAccessControlActions = useChannelAccessControlActions as jest.MockedFunction<typeof useChannelAccessControlActions>;
const mockUseChannelSystemPolicies = useChannelSystemPolicies as jest.MockedFunction<typeof useChannelSystemPolicies>;
const MockedTableEditor = TableEditor as jest.MockedFunction<typeof TableEditor>;
describe('components/channel_settings_modal/ChannelSettingsAccessRulesTab', () => {
    const mockActions = {
        getAccessControlFields: jest.fn(),
        getVisualAST: jest.fn(),
        searchUsers: jest.fn(),
        getChannelPolicy: jest.fn(),
        saveChannelPolicy: jest.fn(),
        deleteChannelPolicy: jest.fn(),
        getChannelMembers: jest.fn(),
        createJob: jest.fn(),
        createAccessControlSyncJob: jest.fn(),
        updateAccessControlPoliciesActive: jest.fn(),
        validateExpressionAgainstRequester: jest.fn(),
    };
    const mockUserAttributes: UserPropertyField[] = [
        {
            id: 'attr1',
            name: 'department',
            type: 'select',
            group_id: 'custom_profile_attributes',
            create_at: 1736541716295,
            update_at: 1736541716295,
            delete_at: 0,
            attrs: {
                sort_order: 0,
                visibility: 'when_set',
                value_type: '',
                options: [
                    {id: 'eng', name: 'Engineering'},
                    {id: 'sales', name: 'Sales'},
                ],
            },
        },
        {
            id: 'attr2',
            name: 'location',
            type: 'select',
            group_id: 'custom_profile_attributes',
            create_at: 1736541716295,
            update_at: 1736541716295,
            delete_at: 0,
            attrs: {
                sort_order: 1,
                visibility: 'when_set',
                value_type: '',
                options: [
                    {id: 'us', name: 'US'},
                    {id: 'ca', name: 'Canada'},
                ],
            },
        },
    ];
    const baseProps = {
        channel: TestHelper.getChannelMock({
            id: 'channel_id',
            name: 'test-channel',
            display_name: 'Test Channel',
            type: 'P',
        }),
        setAreThereUnsavedChanges: jest.fn(),
        showTabSwitchError: false,
    };
    const initialState = {
        entities: {
            general: {
                config: {},
            },
            users: {
                currentUserId: 'current_user_id',
                profiles: {
                    current_user_id: {
                        id: 'current_user_id',
                        username: 'testuser',
                        first_name: 'Test',
                        last_name: 'User',
                        email: 'test@example.com',
                        roles: 'channel_user',
                    },
                },
            },
            roles: {
                roles: {
                    channel_user: {
                        id: 'channel_user',
                        name: 'channel_user',
                        permissions: [],
                    },
                    channel_admin: {
                        id: 'channel_admin',
                        name: 'channel_admin',
                        permissions: ['manage_channel_access_rules'],
                    },
                },
                myRoles: {
                    channel_id: new Set(['channel_admin']),
                },
            },
            channels: {
                myMembers: {
                    channel_id: {
                        channel_id: 'channel_id',
                        user_id: 'current_user_id',
                        roles: 'channel_admin',
                        mention_count: 0,
                        msg_count: 0,
                    },
                },
                messageCounts: {
                    channel_id: {
                        root: 0,
                        total: 0,
                    },
                },
            },
            teams: {
                currentTeamId: 'team_id',
            },
        },
        plugins: {
            components: {},
        },
    };
    beforeEach(() => {
        mockActions.getAccessControlFields.mockClear();
        mockActions.getChannelPolicy.mockClear();
        mockActions.saveChannelPolicy.mockClear();
        mockActions.searchUsers.mockClear();
        mockUseChannelAccessControlActions.mockReturnValue(mockActions);
        mockUseChannelSystemPolicies.mockReturnValue({
            policies: [],
            loading: false,
            error: null,
        });
        mockActions.getAccessControlFields.mockResolvedValue({
            data: mockUserAttributes,
        });
        mockActions.getChannelPolicy.mockRejectedValue(new Error('Policy not found'));
        mockActions.saveChannelPolicy.mockResolvedValue({data: {success: true}});
        mockActions.validateExpressionAgainstRequester.mockResolvedValue({
            data: {requester_matches: true},
        });
        mockActions.searchUsers.mockResolvedValue({
            data: {
                users: [
                    {
                        id: 'current_user_id',
                        username: 'testuser',
                        first_name: 'Test',
                        last_name: 'User',
                    },
                ],
            },
        });
        console.error = jest.fn();
        console.warn = jest.fn();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(window, 'alert').mockImplementation(() => {});
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    test('should match snapshot', () => {
        const {container} = renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        expect(container).toMatchSnapshot();
    });
    test('should render access rules title and subtitle', () => {
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        expect(screen.getByRole('heading', {name: 'Access Rules'})).toBeInTheDocument();
        expect(screen.getByText('Select user attributes and values as rules to restrict channel membership')).toBeInTheDocument();
    });
    test('should render with main container class', () => {
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        expect(screen.getByText('Access Rules').closest('.ChannelSettingsModal__accessRulesTab')).toBeInTheDocument();
    });
    test('should handle missing optional props gracefully', () => {
        const minimalProps = {
            channel: baseProps.channel,
        };
        expect(() => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...minimalProps}/>,
                initialState,
            );
        }).not.toThrow();
        expect(screen.getByRole('heading', {name: 'Access Rules'})).toBeInTheDocument();
    });
    test('should render header section with correct structure', () => {
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        const header = screen.getByText('Access Rules').closest('.ChannelSettingsModal__accessRulesHeader');
        expect(header).toBeInTheDocument();
        const title = screen.getByRole('heading', {name: 'Access Rules'});
        const subtitle = screen.getByText('Select user attributes and values as rules to restrict channel membership');
        expect(header).toContainElement(title);
        expect(header).toContainElement(subtitle);
    });
    test('should render with different channel types', () => {
        const publicChannel = TestHelper.getChannelMock({
            id: 'public_channel_id',
            name: 'public-channel',
            display_name: 'Public Channel',
            type: 'O',
        });
        const propsWithPublicChannel = {
            ...baseProps,
            channel: publicChannel,
        };
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...propsWithPublicChannel}/>,
            initialState,
        );
        expect(screen.getByRole('heading', {name: 'Access Rules'})).toBeInTheDocument();
        expect(screen.getByText('Select user attributes and values as rules to restrict channel membership')).toBeInTheDocument();
    });
    test('should call useChannelAccessControlActions hook', async () => {
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(mockUseChannelAccessControlActions).toHaveBeenCalledTimes(2);
        });
    });
    test('should load user attributes on mount', async () => {
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(mockActions.getAccessControlFields).toHaveBeenCalledWith('', 100);
        });
    });
    test('should not render TableEditor initially when attributes are loading', () => {
        mockActions.getAccessControlFields.mockReturnValue(new Promise(() => {}));
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        expect(screen.queryByTestId('table-editor')).not.toBeInTheDocument();
        expect(document.querySelector('.ChannelSettingsModal__accessRulesEditor')).not.toBeInTheDocument();
    });
    test('should render TableEditor when attributes are loaded', async () => {
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        expect(document.querySelector('.ChannelSettingsModal__accessRulesEditor')).toBeInTheDocument();
    });
    test('should pass correct props to TableEditor', async () => {
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        expect(MockedTableEditor).toHaveBeenCalledWith(
            expect.objectContaining({
                value: '',
                userAttributes: mockUserAttributes,
                actions: mockActions,
                onChange: expect.any(Function),
                onValidate: expect.any(Function),
                onParseError: expect.any(Function),
                isSystemAdmin: expect.any(Boolean),
                validateExpressionAgainstRequester: mockActions.validateExpressionAgainstRequester,
            }),
            expect.anything(),
        );
    });
    test('should pass user self-exclusion props to TableEditor', async () => {
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        const call = MockedTableEditor.mock.calls[0][0];
        expect(call).toHaveProperty('isSystemAdmin');
        expect(call).toHaveProperty('validateExpressionAgainstRequester');
        expect(typeof call.isSystemAdmin).toBe('boolean');
        expect(typeof call.validateExpressionAgainstRequester).toBe('function');
    });
    test('should call setAreThereUnsavedChanges when expression changes', async () => {
        const setAreThereUnsavedChanges = jest.fn();
        const propsWithCallback = {
            ...baseProps,
            setAreThereUnsavedChanges,
        };
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...propsWithCallback}/>,
            initialState,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
        act(() => {
            onChangeCallback('user.attributes.department == "Engineering"');
        });
        expect(setAreThereUnsavedChanges).toHaveBeenCalledWith(true);
    });
    test('should not call setAreThereUnsavedChanges when callback is not provided', async () => {
        const propsWithoutCallback = {
            ...baseProps,
            setAreThereUnsavedChanges: undefined,
        };
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...propsWithoutCallback}/>,
            initialState,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
        expect(() => {
            onChangeCallback('user.attributes.department == "Engineering"');
        }).not.toThrow();
    });
    test('should handle error when loading attributes fails', async () => {
        const errorMessage = 'Failed to load attributes';
        mockActions.getAccessControlFields.mockRejectedValue(new Error(errorMessage));
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(mockActions.getAccessControlFields).toHaveBeenCalled();
        });
        expect(screen.queryByTestId('table-editor')).not.toBeInTheDocument();
        expect(document.querySelector('.ChannelSettingsModal__accessRulesEditor')).not.toBeInTheDocument();
    });
    test('should handle parse error from TableEditor', async () => {
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        const onParseErrorCallback = MockedTableEditor.mock.calls[0][0].onParseError;
        onParseErrorCallback('Parse error message');
        expect(console.warn).toHaveBeenCalledWith('Failed to parse expression in table editor');
    });
    describe('Auto-sync members toggle', () => {
        test('should render auto-sync checkbox', () => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            const checkbox = screen.getByRole('checkbox');
            expect(checkbox).toBeInTheDocument();
            expect(checkbox).toHaveClass('ChannelSettingsModal__autoSyncCheckbox');
        });
        test('should render auto-sync label and description', () => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            expect(screen.getByText('Auto-add members based on access rules')).toBeInTheDocument();
            expect(screen.getByText('Access rules will prevent unauthorized users from joining, but will not automatically add qualifying members.')).toBeInTheDocument();
        });
        test('should show system policy applied message when policies exist but not forcing auto-sync', () => {
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [
                    {
                        id: 'policy1',
                        name: 'Test Policy',
                        type: 'parent',
                        active: false,
                        rules: [{expression: 'user.attributes.Department == "Engineering"'}],
                    },
                ],
                loading: false,
                error: null,
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            expect(screen.getByText('Auto-add members based on access rules')).toBeInTheDocument();
            expect(screen.getByText('Access rules will prevent unauthorized users from joining, but will not automatically add qualifying members.')).toBeInTheDocument();
        });
        test('should toggle auto-sync checkbox when clicked', async () => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.department == "Engineering"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
                expect(checkbox).not.toBeChecked();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(checkbox).toBeChecked();
            });
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(checkbox).not.toBeChecked();
            });
        });
        test('should call setAreThereUnsavedChanges when auto-sync is toggled', async () => {
            const setAreThereUnsavedChanges = jest.fn();
            const propsWithCallback = {
                ...baseProps,
                setAreThereUnsavedChanges,
            };
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...propsWithCallback}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.department == "Engineering"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(setAreThereUnsavedChanges).toHaveBeenCalledWith(true);
            });
        });
    });
    describe('Edge Case Handling', () => {
        test('should handle true empty state (no policies, no rules)', () => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            const checkbox = screen.getByRole('checkbox');
            expect(checkbox).not.toBeChecked();
            expect(checkbox).toBeDisabled();
        });
        test('should handle system policy loading state', () => {
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [],
                loading: true,
                error: null,
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            const checkbox = screen.getByRole('checkbox');
            expect(screen.getByText('Auto-add members based on access rules')).toBeInTheDocument();
            expect(checkbox).not.toBeChecked();
        });
        test('should auto-disable sync when entering empty state', async () => {
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [
                    {
                        id: 'policy1',
                        name: 'Test Policy',
                        type: 'parent',
                        active: false,
                        rules: [{expression: 'user.attributes.Department == "Engineering"'}],
                    },
                ],
                loading: false,
                error: null,
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.Department == "Marketing"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(checkbox).toBeChecked();
            });
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [],
                loading: false,
                error: null,
            });
            onChangeCallback('');
            await waitFor(() => {
                expect(checkbox).not.toBeChecked();
                expect(checkbox).toBeDisabled();
            });
        });
        test('should auto-disable sync when loading with empty state and autoSyncMembers is true', async () => {
            mockActions.getChannelPolicy.mockResolvedValue({
                data: {
                    id: 'channel_id',
                    name: 'Test Channel',
                    type: 'channel',
                    active: true,
                    rules: [],
                },
            });
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [],
                loading: false,
                error: null,
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeChecked();
                expect(checkbox).toBeDisabled();
            });
        });
        test('should not auto-disable sync when system policies exist even without channel rules', async () => {
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [
                    {
                        id: 'policy1',
                        name: 'Test Policy',
                        type: 'parent',
                        active: false,
                        rules: [{expression: 'user.attributes.Department == "Engineering"'}],
                    },
                ],
                loading: false,
                error: null,
            });
            mockActions.getChannelPolicy.mockResolvedValue({
                data: {
                    id: 'channel_id',
                    name: 'Test Channel',
                    type: 'channel',
                    active: true,
                    rules: [],
                },
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
                expect(checkbox).toBeChecked();
            });
        });
    });
    describe('SaveChangesPanel integration', () => {
        test('should not show SaveChangesPanel when there are no changes', async () => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
        });
        test('should show SaveChangesPanel when expression changes', async () => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.department == "Engineering"');
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
        });
        test('should show SaveChangesPanel when auto-sync is toggled', async () => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.department == "Engineering"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
        });
        test('should save changes when Save button is clicked', async () => {
            mockActions.searchUsers.mockResolvedValue({
                data: {
                    users: [{
                        id: 'current_user_id',
                        username: 'testuser',
                        first_name: 'Test',
                        last_name: 'User',
                    }],
                },
            });
            mockActions.getChannelMembers.mockResolvedValue({data: []});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.department == "Engineering"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(checkbox).toBeChecked();
            });
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await userEvent.click(saveButton);
            await waitFor(() => {
                expect(screen.getAllByText('Save and apply rules').length).toBeGreaterThan(0);
            });
            const confirmButtons = screen.getAllByText('Save and apply');
            const confirmButton = confirmButtons[0];
            await userEvent.click(confirmButton);
            await waitFor(() => {
                expect(mockActions.saveChannelPolicy).toHaveBeenCalled();
            });
            expect(mockActions.saveChannelPolicy).toHaveBeenCalledWith({
                id: 'channel_id',
                name: 'Test Channel',
                type: 'channel',
                version: 'v0.2',
                active: false,
                revision: 1,
                created_at: expect.any(Number),
                rules: [{
                    actions: ['*'],
                    expression: 'user.attributes.department == "Engineering"',
                }],
                imports: [],
            });
        });
        test('should prevent duplicate save button clicks', async () => {
            mockActions.searchUsers.mockResolvedValue({
                data: {
                    users: [{
                        id: 'current_user_id',
                        username: 'testuser',
                        first_name: 'Test',
                        last_name: 'User',
                    }],
                },
            });
            mockActions.getChannelMembers.mockResolvedValue({data: []});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.department == "Engineering"');
            await waitFor(() => {
                expect(screen.getByText('Save')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            mockActions.saveChannelPolicy.mockClear();
            await userEvent.click(saveButton);
            await userEvent.click(saveButton);
            await userEvent.click(saveButton);
            expect(mockActions.saveChannelPolicy).toHaveBeenCalledTimes(1);
        });
        test('should reset changes when Reset button is clicked', async () => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.department == "Engineering"');
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            expect(checkbox).toBeChecked();
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const resetButton = screen.getByText('Reset');
            await userEvent.click(resetButton);
            await waitFor(() => {
                expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
            });
            expect(checkbox).not.toBeChecked();
        });
        test('should show error state when there is a form error', async () => {
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onParseErrorCallback = MockedTableEditor.mock.calls[0][0].onParseError;
            onParseErrorCallback('Invalid expression');
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('invalid expression');
            await waitFor(() => {
                const panel = screen.getByText('Invalid expression format');
                expect(panel).toBeInTheDocument();
            });
        });
        test('should show error state when showTabSwitchError is true', async () => {
            const propsWithError = {
                ...baseProps,
                showTabSwitchError: true,
            };
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...propsWithError}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.department == "Engineering"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                const panel = screen.getByText('You have unsaved changes');
                expect(panel).toHaveClass('error');
            });
        });
        test('should update SaveChangesPanel state to saved after successful save', async () => {
            mockActions.searchUsers.mockResolvedValue({
                data: {
                    users: [{
                        id: 'current_user_id',
                        username: 'testuser',
                        first_name: 'Test',
                        last_name: 'User',
                    }],
                },
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.department == "Engineering"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await userEvent.click(saveButton);
            await waitFor(() => {
                expect(screen.getAllByText('Save and apply rules').length).toBeGreaterThan(0);
            });
            const confirmButtons = screen.getAllByText('Save and apply');
            const confirmButton = confirmButtons[0];
            await userEvent.click(confirmButton);
            await waitFor(() => {
                const panel = screen.getByText('Settings saved');
                expect(panel).toBeVisible();
            });
        });
    });
    describe('System policies integration', () => {
        test('should show system policies indicator when policies are present', () => {
            const mockPolicies = [
                {
                    id: 'policy1',
                    name: 'Test Policy',
                    type: 'parent',
                    version: 'v0.2',
                    revision: 1,
                    active: true,
                    createAt: 1234567890,
                    rules: [],
                    imports: [],
                },
            ];
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: mockPolicies,
                loading: false,
                error: null,
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            expect(document.querySelector('.ChannelSettingsModal__systemPolicies')).toBeInTheDocument();
        });
        test('should not show system policies indicator when no policies', () => {
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [],
                loading: false,
                error: null,
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            expect(document.querySelector('.ChannelSettingsModal__systemPolicies')).not.toBeInTheDocument();
        });
        test('should not show system policies indicator while loading', () => {
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [],
                loading: true,
                error: null,
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            expect(document.querySelector('.ChannelSettingsModal__systemPolicies')).not.toBeInTheDocument();
        });
    });
    describe('Expression evaluation and combination', () => {
        const mockSystemPoliciesWithoutAutoSync = [
            {
                id: 'system_policy_1',
                name: 'System Policy 1',
                type: 'parent',
                version: 'v0.2',
                revision: 1,
                active: false,
                createAt: 1234567890,
                rules: [
                    {
                        actions: ['join_channel'],
                        expression: 'user.attributes.Program == "test"',
                    },
                ],
                imports: [],
            },
            {
                id: 'system_policy_2',
                name: 'System Policy 2',
                type: 'parent',
                version: 'v0.2',
                revision: 1,
                active: false,
                createAt: 1234567891,
                rules: [
                    {
                        actions: ['join_channel'],
                        expression: 'user.attributes.Department == "Engineering"',
                    },
                ],
                imports: [],
            },
        ];
        const mockUsersMatchingCombined = [
            {id: 'current_user_id', username: 'testuser', email: 'test@example.com'},
            {id: 'user1', username: 'user1', email: 'user1@test.com'},
            {id: 'user2', username: 'user2', email: 'user2@test.com'},
        ];
        const mockUsersMatchingOnlyChannel = [
            {id: 'current_user_id', username: 'testuser', email: 'test@example.com'},
            {id: 'user1', username: 'user1', email: 'user1@test.com'},
            {id: 'user2', username: 'user2', email: 'user2@test.com'},
            {id: 'user3', username: 'user3', email: 'user3@test.com'},
        ];
        const mockCurrentMembers = [
            {user_id: 'existing_user1'},
            {user_id: 'existing_user2'},
        ];
        beforeEach(() => {
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: mockSystemPoliciesWithoutAutoSync,
                loading: false,
                error: null,
            });
            mockActions.getChannelMembers.mockResolvedValue({data: mockCurrentMembers});
        });
        test('should combine system and channel expressions for membership preview', async () => {
            mockActions.searchUsers.mockImplementation((expression) => {
                if (expression.includes('&&')) {
                    return Promise.resolve({data: {users: mockUsersMatchingCombined}});
                }
                return Promise.resolve({data: {users: mockUsersMatchingOnlyChannel}});
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.Other == "test2"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await userEvent.click(saveButton);
            await waitFor(() => {
                expect(screen.getAllByText('Save and apply rules').length).toBeGreaterThan(0);
            });
            const confirmButton = screen.getAllByText('Save and apply')[0];
            await userEvent.click(confirmButton);
            await waitFor(() => {
                expect(mockActions.saveChannelPolicy).toHaveBeenCalled();
            });
        });
        test('should use combined expression for self-exclusion validation', async () => {
            const stateWithCurrentUser = {
                ...initialState,
                entities: {
                    ...initialState.entities,
                    users: {
                        currentUserId: 'current_user_id',
                        profiles: {
                            current_user_id: {
                                id: 'current_user_id',
                                username: 'current_user',
                                email: 'current@test.com',
                                roles: 'channel_user',
                                first_name: 'Current',
                                last_name: 'User',
                            },
                        },
                    },
                },
            };
            mockActions.searchUsers.mockImplementation((expression) => {
                if (expression.includes('&&')) {
                    return Promise.resolve({data: {users: []}});
                }
                return Promise.resolve({data: {users: [{id: 'current_user_id'}]}});
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                stateWithCurrentUser,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.Other == "test2"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await userEvent.click(saveButton);
            await waitFor(() => {
                expect(screen.getAllByText('Save and apply rules').length).toBeGreaterThan(0);
            });
            const confirmButton = screen.getAllByText('Save and apply')[0];
            await userEvent.click(confirmButton);
            await waitFor(() => {
                expect(mockActions.saveChannelPolicy).toHaveBeenCalled();
            });
        });
        test('should handle channel expression only when no system policies', async () => {
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [],
                loading: false,
                error: null,
            });
            mockActions.searchUsers.mockResolvedValue({data: {users: mockUsersMatchingOnlyChannel}});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.Other == "test2"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await userEvent.click(saveButton);
            await waitFor(() => {
                expect(screen.getAllByText('Save and apply rules').length).toBeGreaterThan(0);
            });
            const confirmButton = screen.getAllByText('Save and apply')[0];
            await userEvent.click(confirmButton);
            await waitFor(() => {
                expect(mockActions.saveChannelPolicy).toHaveBeenCalled();
            });
        });
        test('should handle system policies only when no channel expression', async () => {
            mockActions.searchUsers.mockResolvedValue({data: {users: mockUsersMatchingCombined}});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(checkbox).toBeChecked();
            });
        });
        test('should properly format combined expressions with parentheses', async () => {
            mockActions.searchUsers.mockResolvedValue({data: {users: mockUsersMatchingCombined}});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('user.attributes.Other == "test2"');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).not.toBeDisabled();
            });
            const checkbox = screen.getByRole('checkbox');
            await userEvent.click(checkbox);
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await userEvent.click(saveButton);
            await waitFor(() => {
                expect(screen.getAllByText('Save and apply rules').length).toBeGreaterThan(0);
            });
            const confirmButton = screen.getAllByText('Save and apply')[0];
            await userEvent.click(confirmButton);
            await waitFor(() => {
                expect(mockActions.saveChannelPolicy).toHaveBeenCalled();
            });
        });
        test('should handle empty or whitespace-only expressions', async () => {
            mockUseChannelSystemPolicies.mockReturnValue({
                policies: [],
                loading: false,
                error: null,
            });
            mockActions.searchUsers.mockResolvedValue({data: {users: []}});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                initialState,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            onChangeCallback('   ');
            await waitFor(() => {
                const checkbox = screen.getByRole('checkbox');
                expect(checkbox).toBeDisabled();
            });
        });
    });
    test('should NOT show activity warning when adding first rules even with users being added', async () => {
        const user = userEvent.setup();
        const stateWithMessages = {
            ...initialState,
            entities: {
                ...initialState.entities,
                channels: {
                    ...initialState.entities.channels,
                    messageCounts: {
                        channel_id: {
                            root: 10,
                            total: 15,
                        },
                    },
                },
            },
        };
        mockActions.searchUsers.mockResolvedValue({
            data: {
                users: [
                    {id: 'user1', username: 'user1', email: 'user1@test.com'},
                ],
                total_count: 1,
            },
        });
        mockActions.getChannelMembers.mockResolvedValue({data: []});
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            stateWithMessages,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
        act(() => {
            onChangeCallback('user.department == "engineering"');
        });
        await waitFor(() => {
            const checkbox = screen.getByRole('checkbox');
            expect(checkbox).not.toBeDisabled();
        });
        const checkbox = screen.getByRole('checkbox');
        await user.click(checkbox);
        await waitFor(() => {
            expect(checkbox).toBeChecked();
        });
        await waitFor(() => {
            expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
        });
        const saveButton = screen.getByText('Save');
        await user.click(saveButton);
        await waitFor(() => {
            expect(screen.getByText('Save and apply rules')).toBeInTheDocument();
        });
        const confirmButton = screen.getByText('Save and apply');
        await user.click(confirmButton);
        expect(screen.queryByText('Exposing channel history')).not.toBeInTheDocument();
    });
    test('should NOT show activity warning when channel has no message history', async () => {
        const user = userEvent.setup();
        mockActions.searchUsers.mockResolvedValue({
            data: {
                users: [
                    {id: 'user1', username: 'user1', email: 'user1@test.com'},
                    {id: 'user2', username: 'user2', email: 'user2@test.com'},
                ],
                total_count: 2,
            },
        });
        mockActions.getChannelMembers.mockResolvedValue({data: []});
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            initialState,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
        act(() => {
            onChangeCallback('user.department == "engineering"');
        });
        await waitFor(() => {
            const checkbox = screen.getByRole('checkbox');
            expect(checkbox).not.toBeDisabled();
        });
        const checkbox = screen.getByRole('checkbox');
        await user.click(checkbox);
        await waitFor(() => {
            expect(checkbox).toBeChecked();
        });
        await waitFor(() => {
            expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
        });
        const saveButton = screen.getByText('Save');
        await user.click(saveButton);
        await waitFor(() => {
            expect(screen.getByText('Save and apply rules')).toBeInTheDocument();
        });
        const confirmButton = screen.getByText('Save and apply');
        await user.click(confirmButton);
        expect(screen.queryByText('Exposing channel history')).not.toBeInTheDocument();
    });
    test('should NOT show activity warning when adding first rules with auto-sync disabled', async () => {
        const user = userEvent.setup();
        const stateWithMessages = {
            ...initialState,
            entities: {
                ...initialState.entities,
                channels: {
                    ...initialState.entities.channels,
                    messageCounts: {
                        channel_id: {total: 100, root: 50},
                    },
                },
            },
        };
        mockActions.searchUsers.mockResolvedValue({
            data: {users: [{id: 'user1', username: 'user1'}, {id: 'user2', username: 'user2'}]},
        });
        mockActions.getChannelMembers.mockResolvedValue({data: []});
        renderWithContext(
            <ChannelSettingsAccessRulesTab {...baseProps}/>,
            stateWithMessages,
        );
        await waitFor(() => {
            expect(screen.getByTestId('table-editor')).toBeInTheDocument();
        });
        const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
        onChangeCallback('user.attributes.Department == "Engineering"');
        await waitFor(() => {
            expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
        });
        const saveButton = screen.getByText('Save');
        await user.click(saveButton);
        await waitFor(() => {
            expect(screen.getByText('Settings saved')).toBeInTheDocument();
        });
        expect(screen.queryByText('Exposing channel history')).not.toBeInTheDocument();
        expect(screen.queryByText('Save and apply rules')).not.toBeInTheDocument();
    });
    describe('Activity warning logic - comprehensive scenarios', () => {
        const stateWithMessages = {
            ...initialState,
            entities: {
                ...initialState.entities,
                channels: {
                    ...initialState.entities.channels,
                    messageCounts: {
                        channel_id: {total: 100, root: 50},
                    },
                },
            },
        };
        test('should show warning when removing all rules (auto-sync disabled)', async () => {
            const user = userEvent.setup();
            mockActions.getChannelPolicy.mockResolvedValue({
                data: {
                    id: 'channel_id',
                    rules: [{expression: 'user.department == "Engineering"'}],
                    active: false,
                },
            });
            mockActions.searchUsers.mockResolvedValue({data: {users: []}});
            mockActions.getChannelMembers.mockResolvedValue({data: []});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                stateWithMessages,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            act(() => {
                onChangeCallback('');
            });
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await user.click(saveButton);
            await waitFor(() => {
                expect(screen.getByText('Exposing channel history')).toBeInTheDocument();
            });
        });
        test('should show warning when removing rules with auto-sync disabled', async () => {
            const user = userEvent.setup();
            mockActions.getChannelPolicy.mockResolvedValue({
                data: {
                    id: 'channel_id',
                    rules: [{expression: 'user.department == "Engineering"'}],
                    active: false,
                },
            });
            mockActions.searchUsers.mockImplementation((expression: string) => {
                if (expression.includes('Engineering') && !expression.includes('Sales')) {
                    return Promise.resolve({
                        data: {users: [{id: 'user1', username: 'user1'}]},
                    });
                }
                if (expression.includes('Sales')) {
                    return Promise.resolve({
                        data: {users: [{id: 'user1', username: 'user1'}, {id: 'user2', username: 'user2'}]},
                    });
                }
                return Promise.resolve({data: {users: []}});
            });
            mockActions.getChannelMembers.mockResolvedValue({data: []});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                stateWithMessages,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            act(() => {
                onChangeCallback('user.department == "Engineering" || user.department == "Sales"');
            });
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await user.click(saveButton);
            await waitFor(() => {
                expect(screen.getByText('Exposing channel history')).toBeInTheDocument();
            });
        });
        test('should NOT show warning when adding rules with auto-sync disabled', async () => {
            const user = userEvent.setup();
            mockActions.getChannelPolicy.mockResolvedValue({
                data: {
                    id: 'channel_id',
                    rules: [{expression: 'user.department == "Engineering"'}],
                    active: false,
                },
            });
            mockActions.searchUsers.mockImplementation((expression: string) => {
                if (expression.includes('Engineering') && !expression.includes('Senior')) {
                    return Promise.resolve({
                        data: {users: [{id: 'user1', username: 'user1'}, {id: 'user2', username: 'user2'}]},
                    });
                }
                if (expression.includes('Senior')) {
                    return Promise.resolve({
                        data: {users: [{id: 'user1', username: 'user1'}]},
                    });
                }
                return Promise.resolve({data: {users: []}});
            });
            mockActions.getChannelMembers.mockResolvedValue({data: []});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                stateWithMessages,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            act(() => {
                onChangeCallback('user.department == "Engineering" && user.role == "Senior"');
            });
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await user.click(saveButton);
            await waitFor(() => {
                expect(screen.getByText('Settings saved')).toBeInTheDocument();
            });
            expect(screen.queryByText('Exposing channel history')).not.toBeInTheDocument();
        });
        test('should show warning when removing rules with auto-sync enabled', async () => {
            const user = userEvent.setup();
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
                        data: {users: [{id: 'user1', username: 'user1'}]},
                    });
                }
                if (expression.includes('Sales')) {
                    return Promise.resolve({
                        data: {users: [{id: 'user1', username: 'user1'}, {id: 'user2', username: 'user2'}]},
                    });
                }
                return Promise.resolve({data: {users: []}});
            });
            mockActions.getChannelMembers.mockResolvedValue({
                data: [{user_id: 'user1'}],
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                stateWithMessages,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            act(() => {
                onChangeCallback('user.department == "Engineering" || user.department == "Sales"');
            });
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await user.click(saveButton);
            await waitFor(() => {
                expect(screen.getByText('Review membership impact')).toBeInTheDocument();
            });
            const continueButton = screen.getByText('Continue');
            await user.click(continueButton);
            await waitFor(() => {
                expect(screen.getByText('Exposing channel history')).toBeInTheDocument();
            });
        });
        test('should show warning when adding rules with auto-sync enabled and users will be added', async () => {
            const user = userEvent.setup();
            mockActions.getChannelPolicy.mockResolvedValue({
                data: {
                    id: 'channel_id',
                    rules: [{expression: 'user.department == "Engineering"'}],
                    active: true,
                },
            });
            mockActions.searchUsers.mockResolvedValue({
                data: {users: [{id: 'user1', username: 'user1'}]},
            });
            mockActions.getChannelMembers.mockResolvedValue({data: []});
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                stateWithMessages,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            act(() => {
                onChangeCallback('user.department == "Engineering" && user.role == "Senior"');
            });
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await user.click(saveButton);
            await waitFor(() => {
                expect(screen.getByText('Review membership impact')).toBeInTheDocument();
            });
            const continueButton = screen.getByText('Continue');
            await user.click(continueButton);
            await waitFor(() => {
                expect(screen.getByText('Exposing channel history')).toBeInTheDocument();
            });
        });
        test('should NOT show warning when adding rules with auto-sync enabled but no users added', async () => {
            const user = userEvent.setup();
            mockActions.getChannelPolicy.mockResolvedValue({
                data: {
                    id: 'channel_id',
                    rules: [{expression: 'user.department == "Engineering"'}],
                    active: true,
                },
            });
            mockActions.searchUsers.mockImplementation((expression: string) => {
                if (expression.includes('Engineering') && !expression.includes('Senior')) {
                    return Promise.resolve({
                        data: {users: [{id: 'user1', username: 'user1'}, {id: 'user2', username: 'user2'}]},
                    });
                }
                if (expression.includes('Senior')) {
                    return Promise.resolve({
                        data: {users: [{id: 'user1', username: 'user1'}]},
                    });
                }
                return Promise.resolve({data: {users: []}});
            });
            mockActions.getChannelMembers.mockResolvedValue({
                data: [{user_id: 'user1'}],
            });
            renderWithContext(
                <ChannelSettingsAccessRulesTab {...baseProps}/>,
                stateWithMessages,
            );
            await waitFor(() => {
                expect(screen.getByTestId('table-editor')).toBeInTheDocument();
            });
            const onChangeCallback = MockedTableEditor.mock.calls[0][0].onChange;
            act(() => {
                onChangeCallback('user.department == "Engineering" && user.role == "Senior"');
            });
            await waitFor(() => {
                expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
            });
            const saveButton = screen.getByText('Save');
            await user.click(saveButton);
            await waitFor(() => {
                expect(screen.getByText('Settings saved')).toBeInTheDocument();
            });
            expect(screen.queryByText('Exposing channel history')).not.toBeInTheDocument();
        });
    });
});