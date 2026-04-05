import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
describe('Channel routing', () => {
    let testUser: UserProfile;
    let otherUser1: UserProfile;
    let otherUser2: UserProfile;
    let testTeam: Team;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiCreateUser({prefix: 'otherA'}).then(({user: newUser}) => {
                otherUser1 = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiCreateUser({prefix: 'otherB'}).then(({user: newUser}) => {
                otherUser2 = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('should go to town square channel view', () => {
        cy.get('#channelHeaderTitle').should('be.visible').should('contain', 'Town Square');
    });
    it('should go to private channel view', () => {
        cy.apiCreateChannel(testTeam.id, 'private-channel', 'Private channel', 'P').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', 'Private channel');
            cy.apiDeleteChannel(channel.id);
        });
    });
    it('should go to self direct channel using the multiple ways to go', () => {
        cy.apiCreateDirectChannel([testUser.id, testUser.id]).then(({channel: ownDMChannel}) => {
            cy.visit(`/${testTeam.name}/channels/${testUser.id}__${testUser.id}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', `${testUser.username} (you)`);
            cy.visit(`/${testTeam.name}/channels/${ownDMChannel.id}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', `${testUser.username} (you)`);
            cy.visit(`/${testTeam.name}/messages/@${testUser.username}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', `${testUser.username} (you)`);
            cy.visit(`/${testTeam.name}/messages/${testUser.email}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', `${testUser.username} (you)`);
        });
    });
    it('should go to other user direct channel using multiple ways to go', () => {
        cy.apiCreateDirectChannel([testUser.id, otherUser1.id]).then(({channel: dmChannel}) => {
            cy.visit(`/${testTeam.name}/channels/${testUser.id}__${otherUser1.id}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', otherUser1.username);
            cy.visit(`/${testTeam.name}/channels/${dmChannel.id}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', otherUser1.username);
            cy.visit(`/${testTeam.name}/messages/@${otherUser1.username}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', otherUser1.username);
            cy.visit(`/${testTeam.name}/messages/${otherUser1.email}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', otherUser1.username);
        });
    });
    it('should go group channel using group id', () => {
        const userGroupIds = [testUser.id, otherUser1.id, otherUser2.id];
        cy.apiCreateGroupChannel(userGroupIds).then(({channel: gmChannel}) => {
            cy.visit(`/${testTeam.name}/channels/${gmChannel.name}`);
            const displayName = gmChannel.display_name.split(', ').filter(((username) => username !== testUser.username)).join(', ');
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', displayName);
            cy.visit(`/${testTeam.name}/messages/${gmChannel.name}`);
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', displayName);
        });
    });
});