import {Channel, ChannelMembership, ChannelType} from '@mattermost/types/channels';
import {UserProfile} from '@mattermost/types/users';
import {ChainableT} from 'tests/types';
import {getRandomId} from '../../utils';
export function createChannelPatch(teamId: string, name: string, displayName: string, type: ChannelType = 'O', purpose = '', header = '', unique = true): Partial<Channel> {
    const randomSuffix = getRandomId();
    return {
        team_id: teamId,
        name: unique ? `${name}-${randomSuffix}` : name,
        display_name: unique ? `${displayName} ${randomSuffix}` : displayName,
        type,
        purpose,
        header,
    };
}
function apiCreateChannel(
    teamId: string,
    name: string,
    displayName: string,
    type?: ChannelType,
    purpose?: string,
    header?: string,
    unique: boolean = true): ChainableT<{channel: Channel}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/channels',
        method: 'POST',
        body: createChannelPatch(teamId, name, displayName, type, purpose, header, unique),
    }).then((response) => {
        expect(response.status).to.equal(201);
        return cy.wrap({channel: response.body});
    });
}
Cypress.Commands.add('apiCreateChannel', apiCreateChannel);
function apiCreateDirectChannel(userIds: string[] = []): ChainableT<{channel: Channel}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/channels/direct',
        method: 'POST',
        body: userIds,
    }).then((response) => {
        expect(response.status).to.equal(201);
        return cy.wrap({channel: response.body});
    });
}
Cypress.Commands.add('apiCreateDirectChannel', apiCreateDirectChannel);
function apiCreateGroupChannel(userIds: string[]): ChainableT<{channel: Channel}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/channels/group',
        method: 'POST',
        body: userIds,
    }).then((response) => {
        expect(response.status).to.equal(201);
        return cy.wrap({channel: response.body});
    });
}
Cypress.Commands.add('apiCreateGroupChannel', apiCreateGroupChannel);
function apiUpdateChannel(channelId: string, channel: Channel): ChainableT<{channel: Channel}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/channels/' + channelId,
        method: 'PUT',
        body: {
            id: channelId,
            ...channel,
        },
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({channel: response.body});
    });
}
Cypress.Commands.add('apiUpdateChannel', apiUpdateChannel);
function apiPatchChannel(channelId: string, channel: Partial<Channel>): ChainableT<{channel: Channel}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'PUT',
        url: `/api/v4/channels/${channelId}/patch`,
        body: channel,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({channel: response.body});
    });
}
Cypress.Commands.add('apiPatchChannel', apiPatchChannel);
function apiPatchChannelPrivacy(channelId: string, privacy = 'O'): ChainableT<{channel: Channel}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        method: 'PUT',
        url: `/api/v4/channels/${channelId}/privacy`,
        body: {privacy},
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({channel: response.body});
    });
}
Cypress.Commands.add('apiPatchChannelPrivacy', apiPatchChannelPrivacy);
function apiGetChannel(channelId: string): ChainableT<{channel: Channel}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/channels/${channelId}`,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({channel: response.body});
    });
}
Cypress.Commands.add('apiGetChannel', apiGetChannel);
function apiGetChannelByName(teamName: string, channelName: string): ChainableT<{channel: Channel}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/teams/name/${teamName}/channels/name/${channelName}`,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({channel: response.body});
    });
}
Cypress.Commands.add('apiGetChannelByName', apiGetChannelByName);
function apiGetAllChannels(): ChainableT<{channels: Channel[]}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/channels',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({channels: response.body});
    });
}
Cypress.Commands.add('apiGetAllChannels', apiGetAllChannels);
function apiGetChannelsForUser(userId: string, teamId: string): ChainableT<{channels: Channel[]}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/users/${userId}/teams/${teamId}/channels`,
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({channels: response.body});
    });
}
Cypress.Commands.add('apiGetChannelsForUser', apiGetChannelsForUser);
function apiDeleteChannel(channelId: string): ChainableT<any> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/channels/' + channelId,
        method: 'DELETE',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
}
Cypress.Commands.add('apiDeleteChannel', apiDeleteChannel);
function apiAddUserToChannel(channelId: string, userId: string): ChainableT<{member: ChannelMembership}> {
    return cy.request<ChannelMembership>({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/channels/' + channelId + '/members',
        method: 'POST',
        body: {
            user_id: userId,
        },
    }).then((response) => {
        expect(response.status).to.equal(201);
        return cy.wrap({member: response.body});
    });
}
Cypress.Commands.add('apiAddUserToChannel', apiAddUserToChannel);
function apiRemoveUserFromChannel(channelId, userId): ChainableT<any> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/channels/' + channelId + '/members/' + userId,
        method: 'DELETE',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({member: response.body});
    });
}
Cypress.Commands.add('apiRemoveUserFromChannel', apiRemoveUserFromChannel);
function apiCreateArchivedChannel(name: string, displayName: string, type: ChannelType = 'O', teamId: string, messages: string[] = [], user?: UserProfile): ChainableT<Channel> {
    return cy.apiCreateChannel(teamId, name, displayName, type).then(({channel}) => {
        Cypress._.forEach(messages, (message) => {
            cy.postMessageAs({
                sender: user,
                message,
                channelId: channel.id,
            });
        });
        cy.apiDeleteChannel(channel.id);
        return cy.wrap(channel);
    });
}
Cypress.Commands.add('apiCreateArchivedChannel', apiCreateArchivedChannel);
function apiConvertGMToPrivateChannel(channelId: string, teamId: string, displayName: string, name: string): ChainableT<any> {
    const body = {
        channel_id: channelId,
        team_id: teamId,
        display_name: displayName,
        name,
    };
    return cy.request<void>({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/channels/${channelId}/convert_to_channel?team_id=${teamId}`,
        method: 'POST',
        body,
    });
}
Cypress.Commands.add('apiConvertGMToPrivateChannel', apiConvertGMToPrivateChannel);
declare global {
    namespace Cypress {
        interface Chainable {
            apiCreateChannel: typeof apiCreateChannel;
            apiCreateDirectChannel: typeof apiCreateDirectChannel;
            apiCreateGroupChannel: typeof apiCreateGroupChannel;
            apiUpdateChannel: typeof apiUpdateChannel;
            apiPatchChannel: typeof apiPatchChannel;
            apiPatchChannelPrivacy: typeof apiPatchChannelPrivacy;
            apiGetChannel: typeof apiGetChannel;
            apiGetChannelByName: typeof apiGetChannelByName;
            apiGetAllChannels: typeof apiGetAllChannels;
            apiGetChannelsForUser: typeof apiGetChannelsForUser;
            apiDeleteChannel: typeof apiDeleteChannel;
            apiAddUserToChannel: typeof apiAddUserToChannel;
            apiRemoveUserFromChannel: typeof apiRemoveUserFromChannel;
            apiCreateArchivedChannel: typeof apiCreateArchivedChannel;
            apiConvertGMToPrivateChannel: typeof apiConvertGMToPrivateChannel;
        }
    }
}