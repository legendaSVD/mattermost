import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Channel', () => {
    let testTeam: Team;
    let ownChannel: Channel;
    let otherChannel: Channel;
    let testUser: UserProfile;
    let offTopicUrl: string;
    const myChannelsDividerText = 'My Channels';
    const otherChannelsDividerText = 'Other Channels';
    before(() => {
        cy.apiInitSetup().then(({team, channel, user, offTopicUrl: url}) => {
            testTeam = team;
            ownChannel = channel;
            testUser = user;
            offTopicUrl = url;
            cy.apiCreateChannel(testTeam.id, 'delta-test', 'Delta Channel').then((out) => {
                otherChannel = out.channel;
            });
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
        });
    });
    it('Channel autocomplete should have both lists populated correctly', () => {
        cy.uiGetPostTextBox().clear().type('~').wait(TIMEOUTS.HALF_SEC);
        cy.get('#loadingSpinner').should('not.exist');
        cy.get('#suggestionList').should('be.visible').children().as('suggestionList');
        cy.get('@suggestionList').get('[role="presentation"]').contains(myChannelsDividerText, {matchCase: false});
        cy.get('@suggestionList').get('[role="option"]').should('contain', ownChannel.display_name);
        cy.get('@suggestionList').get('[role="option"]').should('contain', 'Off-Topic');
        cy.get('@suggestionList').get('[role="option"]').should('contain', 'Town Square');
        cy.get('@suggestionList').get('[role="presentation"]').contains(otherChannelsDividerText, {matchCase: false});
        cy.get('@suggestionList').get('[role="option"]').should('contain', otherChannel.display_name);
    });
    it('Joining a channel should alter channel mention autocomplete lists accordingly', () => {
        cy.uiGetPostTextBox().clear().wait(TIMEOUTS.HALF_SEC).type(`/join ~${otherChannel.name}`).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.url().should('include', `/${testTeam.name}/channels/${otherChannel.name}`);
        cy.uiGetPostTextBox().type('~').wait(TIMEOUTS.HALF_SEC);
        cy.get('#loadingSpinner').should('not.exist');
        cy.get('#suggestionList').should('be.visible').children().as('suggestionList');
        cy.get('@suggestionList').get('[role="presentation"]').contains(myChannelsDividerText, {matchCase: false});
        cy.get('@suggestionList').get('[role="option"]').should('contain', ownChannel.display_name);
        cy.get('@suggestionList').get('[role="option"]').should('contain', otherChannel.display_name);
        cy.get('@suggestionList').get('[role="option"]').should('contain', 'Off-Topic');
        cy.get('@suggestionList').get('[role="option"]').should('contain', 'Town Square');
    });
    it('Getting removed from a channel should alter channel mention autocomplete lists accordingly', () => {
        cy.apiAdminLogin();
        cy.removeUserFromChannel(otherChannel.id, testUser.id).then((res) => {
            expect(res.status).to.equal(200);
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
            cy.uiGetPostTextBox().clear().type('~').wait(TIMEOUTS.HALF_SEC);
            cy.get('#loadingSpinner').should('not.exist');
            cy.get('#suggestionList').should('be.visible').children().as('suggestionList');
            cy.get('@suggestionList').get('[role="presentation"]').contains(myChannelsDividerText, {matchCase: false});
            cy.get('@suggestionList').get('[role="option"]').should('contain', ownChannel.display_name);
            cy.get('@suggestionList').get('[role="option"]').should('contain', 'Off-Topic');
            cy.get('@suggestionList').get('[role="option"]').should('contain', 'Town Square');
            cy.get('@suggestionList').get('[role="presentation"]').contains(otherChannelsDividerText, {matchCase: false});
            cy.get('@suggestionList').get('[role="option"]').should('contain', otherChannel.display_name);
        });
    });
});