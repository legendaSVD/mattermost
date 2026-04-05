import React from 'react';
import {Permissions} from 'mattermost-redux/constants';
import TeamSettingsModal from 'components/team_settings_modal/team_settings_modal';
import {renderWithContext, screen, userEvent, waitFor} from 'tests/react_testing_utils';
jest.mock('mattermost-redux/actions/teams', () => ({
    patchTeam: jest.fn(() => async () => ({data: {}, error: null})),
    getTeam: jest.fn(() => async () => ({data: {}, error: null})),
    removeTeamIcon: jest.fn(() => async () => ({data: {}, error: null})),
    setTeamIcon: jest.fn(() => async () => ({data: {}, error: null})),
}));
describe('components/team_settings_modal', () => {
    const baseProps = {
        isOpen: true,
        onExited: jest.fn(),
    };
    const baseState = {
        entities: {
            teams: {
                currentTeamId: 'team-id',
                teams: {
                    'team-id': {
                        id: 'team-id',
                        display_name: 'Team Name',
                        description: 'Team Description',
                        name: 'team-name',
                    },
                },
                myMembers: {
                    'team-id': {
                        team_id: 'team-id',
                        user_id: 'user-id',
                        roles: 'team_user',
                    },
                },
            },
            roles: {
                roles: {
                    team_user: {
                        permissions: [Permissions.INVITE_USER],
                    },
                },
            },
            users: {
                currentUserId: 'user-id',
                profiles: {
                    'user-id': {
                        id: 'user-id',
                        roles: 'team_user',
                    },
                },
            },
        },
    };
    test('should hide the modal when the close button is clicked', async () => {
        renderWithContext(
            <TeamSettingsModal
                {...baseProps}
            />,
            baseState,
        );
        const modal = screen.getByRole('dialog', {name: 'Team Settings'});
        expect(modal).toBeInTheDocument();
        const closeButton = screen.getByLabelText('Close');
        await userEvent.click(closeButton);
        await waitFor(() => {
            expect(baseProps.onExited).toHaveBeenCalled();
        });
    });
    test('should display access tab when can invite users', async () => {
        renderWithContext(
            <TeamSettingsModal
                {...baseProps}
            />,
            baseState,
        );
        const infoButton = screen.getByRole('tab', {name: 'info'});
        expect(infoButton).toBeDefined();
        const accessButton = screen.getByRole('tab', {name: 'access'});
        expect(accessButton).toBeDefined();
    });
    test('should not display access tab when can not invite users', async () => {
        const stateWithoutPermission = {
            ...baseState,
            entities: {
                ...baseState.entities,
                roles: {
                    roles: {
                        team_user: {
                            permissions: [],
                        },
                    },
                },
            },
        };
        renderWithContext(
            <TeamSettingsModal
                {...baseProps}
            />,
            stateWithoutPermission,
        );
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toEqual(1);
        const infoButton = screen.getByRole('tab', {name: 'info'});
        expect(infoButton).toBeDefined();
    });
    test('should warn on first close attempt with unsaved changes and stay open', async () => {
        renderWithContext(
            <TeamSettingsModal
                {...baseProps}
            />,
            baseState,
        );
        const modal = screen.getByRole('dialog', {name: 'Team Settings'});
        expect(modal).toBeInTheDocument();
        const nameInput = screen.getByDisplayValue('Team Name');
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'Modified Team Name');
        const closeButton = screen.getByLabelText('Close');
        await userEvent.click(closeButton);
        expect(modal).toBeInTheDocument();
        expect(modal).toBeVisible();
        expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
        expect(baseProps.onExited).not.toHaveBeenCalled();
    });
    test('should allow close on second attempt with unsaved changes (warn-once behavior)', async () => {
        renderWithContext(
            <TeamSettingsModal
                {...baseProps}
            />,
            baseState,
        );
        const nameInput = screen.getByDisplayValue('Team Name');
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'Modified Team Name');
        const closeButton = screen.getByLabelText('Close');
        await userEvent.click(closeButton);
        expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
        await userEvent.click(closeButton);
        await waitFor(() => {
            expect(baseProps.onExited).toHaveBeenCalled();
        });
    });
    test('should close modal normally when no unsaved changes', async () => {
        renderWithContext(
            <TeamSettingsModal
                {...baseProps}
            />,
            baseState,
        );
        const modal = screen.getByRole('dialog', {name: 'Team Settings'});
        expect(modal).toBeInTheDocument();
        const closeButton = screen.getByLabelText('Close');
        await userEvent.click(closeButton);
        await waitFor(() => {
            expect(baseProps.onExited).toHaveBeenCalled();
        });
    });
    test('should reset warning state when changes are saved', async () => {
        renderWithContext(
            <TeamSettingsModal
                {...baseProps}
            />,
            baseState,
        );
        const nameInput = screen.getByDisplayValue('Team Name');
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'Modified Team Name');
        const saveButton = screen.getByText('Save');
        await userEvent.click(saveButton);
        await waitFor(() => {
            expect(screen.getByText('Settings saved')).toBeInTheDocument();
        });
        const closeButton = screen.getByLabelText('Close');
        await userEvent.click(closeButton);
        await waitFor(() => {
            expect(baseProps.onExited).toHaveBeenCalled();
        });
    });
});