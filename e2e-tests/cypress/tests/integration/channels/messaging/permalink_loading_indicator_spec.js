import {getRandomId} from '../../../utils';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let testTeam;
    let testPrivateChannel;
    let testPublicChannel;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            testTeam = team;
            testPublicChannel = channel;
            cy.apiCreateChannel(testTeam.id, 'private', 'Private', 'P').then((out) => {
                testPrivateChannel = out.channel;
            });
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('MM-T3308 Permalink to first post in channel does not show endless loading indicator above', () => {
        const message = getRandomId();
        const maxMessageCount = 10;
        cy.get('#sidebarItem_' + testPrivateChannel.name).click({force: true});
        for (let i = 1; i <= maxMessageCount; i++) {
            cy.postMessage(`${message}-${i}`);
        }
        cy.getNthPostId(-maxMessageCount).then((permalinkPostId) => {
            const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${permalinkPostId}`;
            cy.clickPostDotMenu(permalinkPostId);
            cy.uiClickCopyLink(permalink, permalinkPostId);
            cy.get('#sidebarItem_' + testPublicChannel.name).click({force: true});
            cy.postMessage(permalink);
            cy.uiWaitUntilMessagePostedIncludes(permalink);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId} > p > .markdown__link`).scrollIntoView().click();
                cy.url().should('include', `/${testTeam.name}/channels/${testPrivateChannel.name}/${permalinkPostId}`);
                cy.wait(TIMEOUTS.FIVE_SEC).url().should('include', `/${testTeam.name}/channels/${testPrivateChannel.name}`).and('not.include', `/${permalinkPostId}`);
                cy.get('#channelIntro').contains('p.channel-intro__text', `This is the start of ${testPrivateChannel.display_name}`).scrollIntoView().should('be.visible');
            });
            cy.getLastPostId().then((clickedPostId) => {
                cy.get(`#postMessageText_${clickedPostId}`).scrollIntoView().should('be.visible').and('have.text', `${message}-${maxMessageCount}`);
                cy.get('.loading-screen').should('not.exist');
                cy.get('.more-messages-text').should('not.exist');
            });
        });
    });
});