import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
const {generateRandomUser} = require('../../../support/api/user');
function openChannelMembersRhs(testTeam: Team, testChannel: Channel) {
    cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    cy.get('#channel-info-btn').click();
    cy.uiGetRHS().findByText('Members').should('be.visible').click();
}
describe('Channel members RHS', () => {
    let testTeam: Team;
    let testChannel: Channel;
    let admin: UserProfile;
    let user: UserProfile;
    before(() => {
        cy.apiInitSetup({promoteNewUserAsAdmin: true}).then(({team, user: newAdmin}) => {
            testTeam = team;
            admin = newAdmin;
            cy.apiCreateUser().then(({user: newUser}) => {
                user = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id).then(() => {
                    cy.apiCreateChannel(testTeam.id, 'channel', 'Public Channel', 'O').then(({channel}) => {
                        testChannel = channel;
                        cy.apiAddUserToChannel(channel.id, newAdmin.id);
                        cy.apiAddUserToChannel(channel.id, newUser.id);
                    });
                });
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
            cy.apiLogin(admin);
        });
    });
    it('should be able to open the RHS from channel info', () => {
        openChannelMembersRhs(testTeam, testChannel);
        ensureChannelMembersRHSExists(testChannel);
    });
    it('should be able to open the RHS from the members icon', () => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderInfo').within(() => {
            cy.get('#member_rhs').should('be.visible').click({force: true});
        });
        ensureChannelMembersRHSExists(testChannel);
    });
    it('should display the number of members', () => {
        openChannelMembersRhs(testTeam, testChannel);
        cy.uiGetRHS().findByText('3 members').should('be.visible');
    });
    it('should go back to previous RHS when switching from a channel to a DM', () => {
        cy.apiCreateUser({}).then(({user: newUser}) => {
            cy.apiAddUserToTeam(testTeam.id, newUser.id).then(() => {
                openChannelMembersRhs(testTeam, testChannel);
                cy.uiGetRHS().get('.sidebar--right__title').findByText('Members').should('be.visible');
                cy.uiGotoDirectMessageWithUser(newUser);
                cy.uiGetRHS().get('.sidebar--right__title').findByText('Info').should('be.visible');
            });
        });
    });
    it('should close the RHS when switching from a channel to a DM', () => {
        cy.apiCreateUser({}).then(({user: newUser}) => {
            cy.apiAddUserToTeam(testTeam.id, newUser.id).then(() => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#member_rhs').click();
                cy.uiGetRHS().get('.sidebar--right__title').findByText('Members').should('be.visible');
                cy.uiGotoDirectMessageWithUser(newUser);
                cy.get('#sidebar-right').should('not.exist');
            });
        });
    });
    it('should display search when number of members is 20 or above', () => {
        cy.apiCreateChannel(testTeam.id, 'search-test-channel', 'Search Test Channel', 'O').then(({channel}) => {
            openChannelMembersRhs(testTeam, channel);
            cy.uiGetRHS().findByPlaceholderText('Search members').should('not.exist');
            cy.uiCloseRHS();
            for (let i = 0; i < 20; i++) {
                cy.apiCreateUser().then(({user: newUser}) => {
                    cy.apiAddUserToTeam(testTeam.id, newUser.id).then(() => {
                        cy.apiAddUserToChannel(channel.id, newUser.id);
                    });
                });
            }
            cy.apiGetUsers({in_channel: channel.id}).then(({users}) => {
                openChannelMembersRhs(testTeam, channel);
                cy.uiGetRHS().findByTestId('channel-member-rhs-search').should('be.visible').type(users[0].username);
                cy.uiGetRHS().contains(`${users[0].username}`).should('be.visible');
                cy.uiGetRHS().findByText(`${users[1].username}`).should('not.exist');
                cy.uiGetRHS().get('[aria-label="cancel members search"]').should('be.visible').click();
                cy.uiGetRHS().contains(`${users[0].username}`).should('exist');
            });
        });
    });
    it('should hide deactivated members', () => {
        cy.apiCreateChannel(testTeam.id, 'hide-test-channel', 'Hide Test Channel', 'O').then(({channel}) => {
            let testUser: UserProfile;
            cy.apiCreateUser().then(({user: newUser}) => {
                cy.apiAddUserToTeam(testTeam.id, newUser.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, newUser.id).then(() => {
                        testUser = newUser;
                        openChannelMembersRhs(testTeam, channel);
                        cy.uiGetRHS().contains(`${testUser.username}`).should('be.visible');
                        cy.apiDeactivateUser(testUser.id);
                        cy.uiGetRHS().findByText(`${testUser.username}`).should('not.exist');
                    });
                });
            });
        });
    });
    describe('as an admin', () => {
        before(() => {
            cy.apiLogout();
            cy.apiLogin(admin);
        });
        it('should be able to open the RHS from the channel menu', () => {
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.uiOpenChannelMenu('Members');
            cy.get('#rhsContainer').then((rhsContainer) => {
                cy.wrap(rhsContainer).findByText('Members').should('be.visible');
                cy.wrap(rhsContainer).findByText(testChannel.display_name).should('be.visible');
            });
        });
        it('should be able to invite new members', () => {
            openChannelMembersRhs(testTeam, testChannel);
            cy.uiGetRHS().findByText('Add').should('be.visible').click();
            cy.get('.channel-invite').should('be.visible');
        });
        it('should be able to manage members', () => {
            openChannelMembersRhs(testTeam, testChannel);
            cy.uiGetRHS().findByText('Manage').should('be.visible').click();
            cy.wait(500);
            cy.uiGetRHS().findByTestId(`memberline-${user.id}`).should('be.visible').within(() => {
                cy.contains(`${user.username}`).should('be.visible');
                cy.findByText('Member').should('be.visible').click();
                cy.findByText('Make Channel Admin').should('be.visible').click();
            });
            cy.wait(500);
            cy.uiGetRHS().findByTestId(`memberline-${user.id}`).should('be.visible').within(() => {
                cy.findByText('Admin').should('be.visible').click();
                cy.findByText('Make Channel Member').should('be.visible').click();
            });
        });
    });
    describe('as an non-admin', () => {
        before(() => {
            cy.apiLogout();
            cy.apiLogin(user);
        });
        it('should be able to open the RHS from the channel menu', () => {
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.uiOpenChannelMenu('Members');
            ensureChannelMembersRHSExists(testChannel);
        });
        it('should not be able to invite new members', () => {
            openChannelMembersRhs(testTeam, testChannel);
            cy.uiGetRHS().findByText('Add').should('not.exist');
        });
        it('should not be able to manage members', () => {
            openChannelMembersRhs(testTeam, testChannel);
            cy.uiGetRHS().findByText('Manage').should('not.exist');
        });
    });
    it('should be able to find users not in the initial list', () => {
        cy.apiCreateChannel(testTeam.id, 'big-search-test-channel', 'Big Search Test Channel', 'O').then(({channel}) => {
            for (let i = 0; i < 100; i++) {
                cy.apiCreateUser().then(({user: newUser}) => {
                    cy.apiAddUserToTeam(testTeam.id, newUser.id).then(() => {
                        cy.apiAddUserToChannel(channel.id, newUser.id);
                    });
                });
            }
            const lastUser = generateRandomUser();
            lastUser.username = 'zzzzzzz' + Date.now();
            cy.apiCreateUser({user: lastUser}).then(({user: newUser}) => {
                cy.apiAddUserToTeam(testTeam.id, newUser.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, newUser.id);
                });
            });
            openChannelMembersRhs(testTeam, channel);
            cy.uiGetRHS().findByText(`${lastUser.username}`).should('not.exist');
            cy.uiGetRHS().findByTestId('channel-member-rhs-search').should('be.visible').type(lastUser.username);
            cy.uiGetRHS().contains(`${lastUser.username}`).should('be.visible');
        });
    });
});
function ensureChannelMembersRHSExists(testChannel) {
    cy.get('#rhsContainer').then((rhsContainer) => {
        cy.wrap(rhsContainer).findByText('Members').should('be.visible');
        cy.wrap(rhsContainer).findByText(testChannel.display_name).should('be.visible');
    });
}