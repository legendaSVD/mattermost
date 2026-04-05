import {UserProfile} from '@mattermost/types/users';
import {getAdminAccount} from '../../../support/env';
const demoteToChannelMember = (user, channelId, admin) => {
    cy.externalRequest({
        user: admin,
        method: 'put',
        path: `channels/${channelId}/members/${user.id}/schemeRoles`,
        data: {
            scheme_user: true,
            scheme_admin: false,
        },
    });
};
const promoteToChannelAdmin = (user, channelId, admin) => {
    cy.externalRequest({
        user: admin,
        method: 'put',
        path: `channels/${channelId}/members/${user.id}/schemeRoles`,
        data: {
            scheme_user: true,
            scheme_admin: true,
        },
    });
};
describe('Change Roles', () => {
    const admin = getAdminAccount();
    let testUser: UserProfile;
    let testChannelId: string;
    beforeEach(() => {
        cy.apiInitSetup().then(({team, user, channel}) => {
            testUser = user;
            testChannelId = channel.id;
            cy.apiCreateUser().then(({user: otherUser}) => {
                cy.apiAddUserToTeam(team.id, otherUser.id);
            });
            cy.apiGetRolesByNames(['channel_user']).then(({roles}) => {
                const role = roles[0];
                const permissions = role.permissions.filter((permission) => {
                    return !(['manage_public_channel_members', 'manage_private_channel_members', 'manage_public_channel_properties', 'manage_private_channel_properties'].includes(permission));
                });
                if (permissions.length !== role.permissions.length) {
                    cy.apiPatchRole(role.id, {permissions});
                }
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/${channel.name}`);
            cy.externalUpdateUserRoles(user.id, 'system_user');
            demoteToChannelMember(testUser, testChannelId, admin);
            cy.reload(true);
        });
    });
    it('MM-T4174 User role to channel admin/member updates channel member modal immediately without refresh', () => {
        cy.uiGetChannelMemberButton().click();
        cy.uiGetRHS().findByText('Manage').should('not.exist');
        promoteToChannelAdmin(testUser, testChannelId, admin);
        cy.uiGetRHS().findByText('Manage').should('be.visible');
    });
});