import React from 'react';
import {useDispatch} from 'react-redux';
import * as modalActions from 'actions/views/modals';
import LocalStorageStore from 'stores/local_storage_store';
import DeleteChannelModal from 'components/delete_channel_modal';
import {WithTestMenuContext} from 'components/menu/menu_context_test';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import {ModalIdentifiers} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';
import ArchiveChannel from './archive_channel';
describe('components/ChannelHeaderMenu/MenuItems/ArchiveChannel', () => {
    const initialState = {
        entities: {
            channels: {
                currentChannelId: 'current_channel_id',
                channels: {
                    current_channel_id: TestHelper.getChannelMock({
                        id: 'current_channel_id',
                        name: 'default-name',
                        display_name: 'Default',
                        delete_at: 0,
                        type: 'O',
                        team_id: 'team_id',
                    }),
                },
            },
            teams: {
                currentTeamId: 'team-id',
                teams: {
                    'team-id': {
                        id: 'team_id',
                        name: 'team-1',
                        display_name: 'Team 1',
                    },
                },
                myMembers: {
                    'team-id': {roles: 'team_role'},
                },
            },
            users: {
                currentUserId: 'current_user_id',
                profiles: {
                    current_user_id: {
                        locale: 'en',
                        roles: 'system_role'},
                },
            },
        },
    };
    LocalStorageStore.setPenultimateChannelName('current_user_id', 'team-id', 'current_channel_id');
    const channel = TestHelper.getChannelMock({header: 'Test Header'});
    beforeEach(() => {
        jest.spyOn(modalActions, 'openModal');
        jest.spyOn(require('react-redux'), 'useDispatch');
    });
    test('renders the component correctly', () => {
        renderWithContext(
            <ArchiveChannel channel={channel}/>, initialState,
        );
        const menuItem = screen.getByText('Archive Channel');
        expect(menuItem).toBeInTheDocument();
    });
    test('dispatches openModal action on click with default channel', async () => {
        renderWithContext(
            <WithTestMenuContext>
                <ArchiveChannel channel={channel}/>
            </WithTestMenuContext>, initialState,
        );
        const menuItem = screen.getByText('Archive Channel');
        expect(menuItem).toBeInTheDocument();
        await userEvent.click(menuItem);
        expect(useDispatch).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledTimes(1);
        expect(modalActions.openModal).toHaveBeenCalledWith({
            modalId: ModalIdentifiers.DELETE_CHANNEL,
            dialogType: DeleteChannelModal,
            dialogProps: {
                channel,
            },
        });
    });
    test('renders ArchiveOutlineIcon for public channel', () => {
        const publicChannel = TestHelper.getChannelMock({
            id: 'public_channel',
            type: 'O',
            display_name: 'Public Channel',
        });
        renderWithContext(
            <WithTestMenuContext>
                <ArchiveChannel channel={publicChannel}/>
            </WithTestMenuContext>, initialState,
        );
        expect(screen.getByText('Archive Channel')).toBeInTheDocument();
    });
    test('renders ArchiveLockOutlineIcon for private channel', () => {
        const privateChannel = TestHelper.getChannelMock({
            id: 'private_channel',
            type: 'P',
            display_name: 'Private Channel',
        });
        renderWithContext(
            <WithTestMenuContext>
                <ArchiveChannel channel={privateChannel}/>
            </WithTestMenuContext>, initialState,
        );
        expect(screen.getByText('Archive Channel')).toBeInTheDocument();
    });
});