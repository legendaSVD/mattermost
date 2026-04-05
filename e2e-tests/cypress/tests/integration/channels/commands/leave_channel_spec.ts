import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Leave Channel Command', () => {
    let testChannel;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            testChannel = channel;
            cy.visit(`/${team.name}/channels/town-square`);
            cy.get('#channelHeaderTitle').should('be.visible').and('contain', 'Town Square');
        });
    });
    it('Should be redirected to last channel when user leaves channel with /leave command', () => {
        cy.get('#sidebarItem_' + testChannel.name).click({force: true});
        cy.findAllByTestId('postView').last().scrollIntoView().should('be.visible');
        cy.postMessage('/leave ');
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.url().should('include', '/channels/town-square');
        cy.get('#channelHeaderTitle').should('be.visible').and('contain', 'Town Square');
    });
});