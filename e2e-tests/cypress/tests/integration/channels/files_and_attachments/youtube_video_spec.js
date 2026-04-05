import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('YouTube Video', () => {
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableLinkPreviews: true,
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T2258 YouTube Video play, collapse', () => {
        const youtubeUrl = 'https://www.youtube.com/watch?v=gLNmtUEvI5A';
        cy.postMessage(youtubeUrl);
        cy.uiWaitUntilMessagePostedIncludes(youtubeUrl);
        cy.getLastPost().within(() => {
            cy.get('.play-button', {timeout: TIMEOUTS.TEN_SEC}).click();
            cy.get('.video-playing iframe').should('exist');
            cy.get('.post__embed-visibility').click();
            cy.get('.post__embed-container').should('not.exist');
            cy.get('.post__embed-visibility').click();
            cy.get('.play-button').should('exist');
            cy.get('.video-playing iframe').should('not.exist');
        });
    });
});