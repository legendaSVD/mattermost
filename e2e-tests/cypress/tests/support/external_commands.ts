import type {ChannelMembership} from '@mattermost/types/channels';
import type {Post} from '@mattermost/types/posts';
import type {TeamMembership} from '@mattermost/types/teams';
import type {UserProfile} from '@mattermost/types/users';
import {getRandomId} from '../utils';
import {getAdminAccount} from './env';
function externalActivateUser(userId: string, active = true) {
    const admin = getAdminAccount();
    return cy.externalRequest({user: admin, method: 'PUT', path: `users/${userId}/active`, data: {active}});
}
Cypress.Commands.add('externalActivateUser', externalActivateUser);
function externalAddUserToChannel(userId: string, channelId: string): Cypress.Chainable<ChannelMembership> {
    const admin = getAdminAccount();
    return cy.externalRequest({
        user: admin,
        method: 'POST',
        path: `channels/${channelId}/members`,
        data: {
            user_id: userId,
        },
    }).then((response) => response.data);
}
Cypress.Commands.add('externalAddUserToChannel', externalAddUserToChannel);
function externalAddUserToTeam(userId: string, teamId: string): Cypress.Chainable<TeamMembership> {
    const admin = getAdminAccount();
    return cy.externalRequest({
        user: admin,
        method: 'POST',
        path: `teams/${teamId}/members`,
        data: {
            team_id: teamId,
            user_id: userId,
        },
    }).then((response) => response.data);
}
Cypress.Commands.add('externalAddUserToTeam', externalAddUserToTeam);
function externalCreatePostAsUser(user: Pick<UserProfile, 'username' | 'password'>, post: Partial<Post>): Cypress.Chainable<Post> {
    return cy.externalRequest({
        user,
        method: 'POST',
        path: 'posts',
        data: post,
    }).then((response) => response.data);
}
Cypress.Commands.add('externalCreatePostAsUser', externalCreatePostAsUser);
function externalCreateUser(user: Partial<UserProfile>): Cypress.Chainable<UserProfile> {
    const admin = getAdminAccount();
    const randomValue = getRandomId();
    return cy.externalRequest({
        user: admin,
        method: 'POST',
        path: 'users',
        data: {
            username: 'user' + randomValue,
            email: 'email' + randomValue + '@example.mattermost.com',
            password: 'password' + randomValue,
            ...user,
        },
    }).then((response) => {
        return {
            ...response.data,
            password: 'password' + randomValue,
        };
    });
}
Cypress.Commands.add('externalCreateUser', externalCreateUser);
function externalUpdateUserRoles(userId: string, roles: string): Cypress.Chainable<unknown> {
    const admin = getAdminAccount();
    return cy.externalRequest({
        user: admin,
        method: 'PUT',
        path: `users/${userId}/roles`,
        data: {roles},
    });
}
Cypress.Commands.add('externalUpdateUserRoles', externalUpdateUserRoles);
declare global {
    namespace Cypress {
        interface Chainable {
            externalActivateUser: typeof externalActivateUser;
            externalAddUserToChannel: typeof externalAddUserToChannel;
            externalAddUserToTeam: typeof externalAddUserToTeam;
            externalCreatePostAsUser: typeof externalCreatePostAsUser;
            externalCreateUser: typeof externalCreateUser;
            externalUpdateUserRoles: typeof externalUpdateUserRoles;
        }
    }
}