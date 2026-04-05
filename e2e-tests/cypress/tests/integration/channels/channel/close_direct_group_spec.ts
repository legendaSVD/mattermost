import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {ChainableT} from '../../../types';
function verifyChannelWasProperlyClosed(channelName: string) {
    cy.get('#channelHeaderTitle').should('contain', 'Town Square');
    cy.get('#sidebarItem_' + channelName).should('not.exist');
}
describe('Close direct messages', () => {
    let testUser: UserProfile;
    let otherUser: UserProfile;
    let testTeam: Team;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateUser().then(({user: newUser}) => {
                otherUser = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('Through channel header dropdown menu', () => {
        createAndVisitDMChannel([testUser.id, otherUser.id]).then((channel) => {
            cy.get('#channelHeaderTitle').click();
            cy.findByText('Close Direct Message').click();
            verifyChannelWasProperlyClosed(channel.name);
        });
    });
    function createAndVisitDMChannel(userIds: string[]): ChainableT<Channel> {
        return cy.apiCreateDirectChannel(userIds).then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.get('#channelHeaderTitle').should('contain', channel.display_name);
            return cy.wrap(channel);
        });
    }
});
describe('Close group messages', () => {
    let testUser: UserProfile;
    let otherUser1: UserProfile;
    let otherUser2: UserProfile;
    let testTeam: Team;
    before(() => {
        cy.apiAdminLogin();
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateUser({prefix: 'aaa'}).then(({user: newUser}) => {
                otherUser1 = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiCreateUser({prefix: 'bbb'}).then(({user: newUser}) => {
                otherUser2 = newUser;
                cy.apiAddUserToTeam(team.id, newUser.id);
            });
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('Through channel header dropdown menu', () => {
        createAndVisitGMChannel([otherUser1, otherUser2]).then((channel) => {
            cy.get('#channelHeaderTitle').click();
            cy.findByText('Close Group Message').click();
            verifyChannelWasProperlyClosed(channel.name);
        });
    });
    function createAndVisitGMChannel(users = []) {
        const userIds = users.map((user) => user.id);
        return cy.apiCreateGroupChannel(userIds).then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            const displayName = users.
                map((member) => member.username).
                sort((a, b) => a.localeCompare(b, 'en', {numeric: true})).
                join(', ');
            cy.get('#channelHeaderTitle').should('contain', displayName);
            return cy.wrap(channel);
        });
    }
});