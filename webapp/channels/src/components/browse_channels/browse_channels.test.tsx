import React from 'react';
import type {Channel} from '@mattermost/types/channels';
import type {ActionResult} from 'mattermost-redux/types/actions';
import type {Props} from 'components/browse_channels/browse_channels';
import BrowseChannels from 'components/browse_channels/browse_channels';
import {renderWithContext, screen, userEvent, waitFor, act} from 'tests/react_testing_utils';
import {getHistory} from 'utils/browser_history';
import {TestHelper} from 'utils/test_helper';
jest.useFakeTimers({legacyFakeTimers: true});
describe('components/BrowseChannels', () => {
    const searchResults = {
        data: [{
            id: 'channel-id-1',
            name: 'channel-name-1',
            team_id: 'team_1',
            display_name: 'Channel 1',
            delete_at: 0,
            type: 'O',
            purpose: '',
        }, {
            id: 'channel-id-2',
            name: 'archived-channel',
            team_id: 'team_1',
            display_name: 'Archived',
            delete_at: 123,
            type: 'O',
            purpose: '',
        }, {
            id: 'channel-id-3',
            name: 'private-channel',
            team_id: 'team_1',
            display_name: 'Private',
            delete_at: 0,
            type: 'P',
            purpose: '',
        }, {
            id: 'channel-id-4',
            name: 'private-channel-not-member',
            team_id: 'team_1',
            display_name: 'Private Not Member',
            delete_at: 0,
            type: 'P',
            purpose: '',
        }],
    };
    const archivedChannel = TestHelper.getChannelMock({
        id: 'channel_id_2',
        team_id: 'team_1',
        display_name: 'channel-2',
        name: 'channel-2',
        header: 'channel-2-header',
        purpose: 'channel-2-purpose',
    });
    const privateChannel = TestHelper.getChannelMock({
        id: 'channel_id_3',
        team_id: 'team_1',
        display_name: 'channel-3',
        name: 'channel-3',
        header: 'channel-3-header',
        purpose: 'channel-3-purpose',
        type: 'P',
    });
    const channelActions = {
        joinChannelAction: (userId: string, teamId: string, channelId: string): Promise<ActionResult> => {
            return new Promise((resolve) => {
                if (channelId !== 'channel-1') {
                    return resolve({
                        error: {
                            message: 'error',
                        },
                    });
                }
                return resolve({data: true});
            });
        },
        searchAllChannels: (term: string): Promise<ActionResult> => {
            return new Promise((resolve) => {
                if (term === 'fail') {
                    return resolve({
                        error: {
                            message: 'error',
                        },
                    });
                }
                return resolve(searchResults);
            });
        },
        getChannels: (): Promise<ActionResult<Channel[], Error>> => {
            return new Promise((resolve) => {
                return resolve({
                    data: [TestHelper.getChannelMock({
                        id: 'channel_id_1',
                        team_id: 'team_1',
                        display_name: 'Default Channel',
                        name: 'default-channel',
                        header: 'Default channel header',
                        purpose: 'Default channel purpose',
                    })],
                });
            });
        },
        getArchivedChannels: (): Promise<ActionResult<Channel[], Error>> => {
            return new Promise((resolve) => {
                return resolve({
                    data: [archivedChannel],
                });
            });
        },
    };
    const defaultChannel = TestHelper.getChannelMock({
        id: 'channel_id_1',
        team_id: 'team_1',
        display_name: 'Default Channel',
        name: 'default-channel',
        header: 'Default channel header',
        purpose: 'Default channel purpose',
    });
    const baseProps: Props = {
        channels: [defaultChannel],
        archivedChannels: [archivedChannel],
        privateChannels: [privateChannel],
        currentUserId: 'user-1',
        teamId: 'team_1',
        teamName: 'team_name',
        channelsRequestStarted: false,
        shouldHideJoinedChannels: false,
        myChannelMemberships: {
            'channel-id-3': TestHelper.getChannelMembershipMock({
                channel_id: 'channel-id-3',
                user_id: 'user-1',
            }),
        },
        actions: {
            getChannels: jest.fn(channelActions.getChannels),
            getArchivedChannels: jest.fn(channelActions.getArchivedChannels),
            joinChannel: jest.fn(channelActions.joinChannelAction),
            searchAllChannels: jest.fn(channelActions.searchAllChannels),
            openModal: jest.fn(),
            closeModal: jest.fn(),
            closeRightHandSide: jest.fn(),
            setGlobalItem: jest.fn(),
            getChannelsMemberCount: jest.fn(),
        },
    };
    const user = userEvent.setup({advanceTimers: jest.advanceTimersByTime});
    test('should match snapshot and state', async () => {
        const props = {...baseProps, actions: {...baseProps.actions, getChannels: jest.fn(channelActions.getChannels)}};
        const {baseElement} = renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        expect(baseElement).toMatchSnapshot();
        expect(props.actions.getChannels).toHaveBeenCalledTimes(1);
        expect(props.actions.getChannels).toHaveBeenCalledWith('team_1', 0, 100);
    });
    test('should call closeModal on Close', async () => {
        const closeModal = jest.fn();
        const props = {...baseProps, actions: {...baseProps.actions, closeModal}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        await user.click(screen.getByLabelText('Close'));
        await waitFor(() => {
            expect(closeModal).toHaveBeenCalledTimes(1);
        });
    });
    test('should match state on onChange', async () => {
        const searchAllChannels = jest.fn().mockResolvedValue(searchResults);
        const props = {...baseProps, actions: {...baseProps.actions, searchAllChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        expect(screen.getByText('Default Channel')).toBeInTheDocument();
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'channel');
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        await waitFor(() => {
            expect(screen.getByText('Channel 1')).toBeInTheDocument();
        });
        await user.clear(searchInput);
        await waitFor(() => {
            expect(screen.getByText('Default Channel')).toBeInTheDocument();
        });
    });
    test('should call props.getChannels on initial load', async () => {
        const getChannels = jest.fn(channelActions.getChannels);
        const props = {...baseProps, actions: {...baseProps.actions, getChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        expect(getChannels).toHaveBeenCalledTimes(1);
        expect(getChannels).toHaveBeenCalledWith('team_1', 0, 100);
    });
    test('should be on loading state when searching', async () => {
        const searchAllChannels = jest.fn().mockImplementation(() => new Promise(() => {}));
        const props = {...baseProps, actions: {...baseProps.actions, searchAllChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'test');
        await act(async () => {
            jest.runOnlyPendingTimers();
        });
        expect(screen.getByText('Loading')).toBeInTheDocument();
    });
    test('should attempt to join the channel and fail', async () => {
        const joinChannel = jest.fn().mockResolvedValue({error: {message: 'error message'}});
        const props = {...baseProps, actions: {...baseProps.actions, joinChannel}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const joinButtons = screen.getAllByRole('button', {name: /join/i});
        await user.click(joinButtons[0]);
        await waitFor(() => {
            expect(joinChannel).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
            expect(screen.getByText('error message')).toBeInTheDocument();
        });
    });
    test('should join the channel', async () => {
        const joinChannel = jest.fn().mockResolvedValue({data: true});
        const props = {...baseProps, actions: {...baseProps.actions, joinChannel}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const joinButtons = screen.getAllByRole('button', {name: /join/i});
        await user.click(joinButtons[0]);
        await waitFor(() => {
            expect(joinChannel).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
            expect(getHistory().push).toHaveBeenCalledTimes(1);
        });
    });
    test('should not perform a search if term is empty', async () => {
        const searchAllChannels = jest.fn().mockResolvedValue(searchResults);
        const props = {...baseProps, actions: {...baseProps.actions, searchAllChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'test');
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        expect(searchAllChannels).toHaveBeenCalledTimes(1);
        await user.clear(searchInput);
        await act(async () => {
            jest.runOnlyPendingTimers();
        });
        expect(searchAllChannels).toHaveBeenCalledTimes(1);
    });
    test('should handle a failed search', async () => {
        const searchAllChannels = jest.fn(channelActions.searchAllChannels);
        const props = {...baseProps, actions: {...baseProps.actions, searchAllChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        expect(screen.getByText('Default Channel')).toBeInTheDocument();
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'fail');
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        expect(searchAllChannels).toHaveBeenCalledWith('fail', {include_deleted: true, nonAdminSearch: true, team_ids: ['team_1']});
        await waitFor(() => {
            expect(screen.getByText(/Try searching different keywords/)).toBeInTheDocument();
        });
    });
    test('should perform search and set the correct state', async () => {
        const searchAllChannels = jest.fn(channelActions.searchAllChannels);
        const props = {...baseProps, actions: {...baseProps.actions, searchAllChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'channel');
        expect(setTimeout).toHaveBeenCalled();
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        expect(searchAllChannels).toHaveBeenCalledWith('channel', {include_deleted: true, nonAdminSearch: true, team_ids: ['team_1']});
        await waitFor(() => {
            expect(screen.getByText('Channel 1')).toBeInTheDocument();
        });
    });
    test('should perform search on archived channels and set the correct state', async () => {
        const searchAllChannels = jest.fn(channelActions.searchAllChannels);
        const props = {...baseProps, actions: {...baseProps.actions, searchAllChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        await user.click(screen.getByLabelText('Channel type filter'));
        await user.click(await screen.findByText('Archived channels'));
        await waitFor(() => {
            expect(screen.getByText('channel-2')).toBeInTheDocument();
        });
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'channel');
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        expect(searchAllChannels).toHaveBeenCalledWith('channel', {include_deleted: true, nonAdminSearch: true, team_ids: ['team_1']});
        await waitFor(() => {
            expect(screen.getByText('Archived')).toBeInTheDocument();
        });
        expect(screen.queryByText('Channel 1')).not.toBeInTheDocument();
    });
    test('should perform search on private channels and set the correct state', async () => {
        const searchAllChannels = jest.fn(channelActions.searchAllChannels);
        const props = {...baseProps, actions: {...baseProps.actions, searchAllChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'channel');
        await act(async () => {
            await Promise.resolve();
        });
        await user.click(screen.getByLabelText('Channel type filter'));
        await user.click(await screen.findByText('Private channels'));
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        expect(searchAllChannels).toHaveBeenCalledWith('channel', {include_deleted: true, nonAdminSearch: true, team_ids: ['team_1']});
        await waitFor(() => {
            expect(screen.getByText('Private')).toBeInTheDocument();
            expect(screen.queryByText('Channel 1')).not.toBeInTheDocument();
            expect(screen.queryByText('Private Not Member')).not.toBeInTheDocument();
        });
    });
    test('should perform search on public channels and set the correct state', async () => {
        const searchAllChannels = jest.fn(channelActions.searchAllChannels);
        const props = {...baseProps, actions: {...baseProps.actions, searchAllChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'channel');
        await act(async () => {
            await Promise.resolve();
        });
        await user.click(screen.getByLabelText('Channel type filter'));
        await user.click(await screen.findByText('Public channels'));
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        expect(searchAllChannels).toHaveBeenCalledWith('channel', {include_deleted: true, nonAdminSearch: true, team_ids: ['team_1']});
        await waitFor(() => {
            expect(screen.getByText('Channel 1')).toBeInTheDocument();
            expect(screen.queryByText('Archived')).not.toBeInTheDocument();
            expect(screen.queryByText('Private')).not.toBeInTheDocument();
        });
    });
    test('should perform search on all channels and set the correct state when shouldHideJoinedChannels is true', async () => {
        const searchAllChannels = jest.fn(channelActions.searchAllChannels);
        const props = {
            ...baseProps,
            shouldHideJoinedChannels: true,
            actions: {...baseProps.actions, searchAllChannels},
        };
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'channel');
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        expect(searchAllChannels).toHaveBeenCalledWith('channel', {include_deleted: true, nonAdminSearch: true, team_ids: ['team_1']});
        await waitFor(() => {
            expect(screen.getByText('Channel 1')).toBeInTheDocument();
            expect(screen.queryByText('Private')).not.toBeInTheDocument();
        });
    });
    test('should perform search on all channels and set the correct state when shouldHideJoinedChannels is true and filter is private', async () => {
        const searchAllChannels = jest.fn(channelActions.searchAllChannels);
        const props = {
            ...baseProps,
            shouldHideJoinedChannels: true,
            actions: {...baseProps.actions, searchAllChannels},
        };
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'channel');
        await act(async () => {
            await Promise.resolve();
        });
        await user.click(screen.getByLabelText('Channel type filter'));
        await user.click(await screen.findByText('Private channels'));
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        expect(searchAllChannels).toHaveBeenCalledWith('channel', {include_deleted: true, nonAdminSearch: true, team_ids: ['team_1']});
        await waitFor(() => {
            expect(screen.queryByText('Private')).not.toBeInTheDocument();
            expect(screen.queryByText('Channel 1')).not.toBeInTheDocument();
        });
    });
    it('should perform search on all channels and should not show private channels that user is not a member of', async () => {
        const searchAllChannels = jest.fn(channelActions.searchAllChannels);
        const props = {...baseProps, actions: {...baseProps.actions, searchAllChannels}};
        renderWithContext(<BrowseChannels {...props}/>);
        await act(async () => {
            await Promise.resolve();
        });
        const searchInput = screen.getByPlaceholderText('Search channels');
        await user.type(searchInput, 'channel');
        await act(async () => {
            jest.runOnlyPendingTimers();
            await Promise.resolve();
        });
        await waitFor(() => {
            expect(screen.getByText('Channel 1')).toBeInTheDocument();
            expect(screen.getByText('Private')).toBeInTheDocument();
            expect(screen.queryByText('Private Not Member')).not.toBeInTheDocument();
        });
    });
});