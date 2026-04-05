import {Team} from '@mattermost/types/teams';
import {Channel} from '@mattermost/types/channels';
import {UserProfile} from '@mattermost/types/users';
describe('Channel Settings Menu Permissions', () => {
    let testTeam: Team;
    let testChannel: Channel;
    let admin: UserProfile;
    let user: UserProfile;
    before(() => {
        cy.apiInitSetup({promoteNewUserAsAdmin: true}).then(({team, user: newAdmin, channel}) => {
            testTeam = team;
            admin = newAdmin;
            testChannel = channel;
            cy.apiCreateUser().then(({user: newUser}) => {
                user = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, newUser.id);
                });
            });
            cy.apiGetRolesByNames(['channel_user']).then(({roles}) => {
                const role = roles[0];
                const permissions = role.permissions.filter((permission) => {
                    return !(['manage_public_channel_properties', 'manage_private_channel_properties', 'manage_public_channel_banner', 'manage_private_channel_banner', 'delete_public_channel', 'delete_private_channel'].includes(permission));
                });
                if (permissions.length !== role.permissions.length) {
                    cy.apiPatchRole(role.id, {permissions});
                }
            });
            cy.apiLogin(admin);
        });
    });
    it('MM-T1001: Channel Settings menu is visible for users with permissions', () => {
        cy.apiLogin(admin);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').should('be.visible');
    });
    it('MM-T1002: Channel Settings menu is hidden for users without permissions', () => {
        cy.apiLogin(user);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').should('not.exist');
    });
});