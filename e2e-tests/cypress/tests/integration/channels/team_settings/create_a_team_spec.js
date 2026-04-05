import {getRandomId} from '../../../utils';
describe('Teams Suite', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('hello');
        });
    });
    it('MM-T383 Create a new team', () => {
        cy.uiOpenTeamMenu('Create a team');
        const teamName = 'Team Test';
        cy.get('#teamNameInput').should('be.visible').type(teamName);
        cy.get('#teamNameNextButton').should('be.visible').click();
        const teamURL = `team-${getRandomId()}`;
        cy.get('#teamURLInput').should('be.visible').type(teamURL);
        cy.get('#teamURLFinishButton').should('be.visible').click();
        cy.get('#channelHeaderTitle').should('contain', 'Town Square');
        cy.url().should('include', teamURL + '/channels/town-square');
        cy.uiGetLHSHeader().findByText(teamName);
    });
    it('MM-T1437 Try to create a new team using restricted words', () => {
        [
            'plugins',
            'login',
            'admin',
            'channel',
            'post',
            'api',
            'oauth',
            'error',
            'help',
        ].forEach((reservedTeamPath) => {
            tryReservedTeamURLAndVerifyError(reservedTeamPath);
        });
    });
});
function tryReservedTeamURLAndVerifyError(teamURL) {
    cy.uiOpenTeamMenu('Create a team');
    cy.get('#teamNameInput').should('be.visible').type(teamURL);
    cy.findByText('Next').should('be.visible').click();
    cy.get('#teamURLInput').should('be.visible').clear().type(teamURL);
    cy.findByText('Finish').should('exist').click();
    cy.get('form').within(() => {
        cy.findByText(/This URL\s/).should('exist');
        cy.findByText(/starts with a reserved word/).should('exist');
        cy.findByText(/\sor is unavailable. Please try another./).should('exist');
    });
    cy.findByText('Back').click();
}