import {getRandomId} from '../../../utils';
describe('Create bot', () => {
    it('MM-T1810 Create a Bot via the UI', () => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableUserAccessTokens: true,
            },
        });
        createBot();
    });
    it('MM-T1811 Create a Bot when personal access tokens are set to False', () => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableUserAccessTokens: false,
            },
        });
        createBot();
    });
});
function createBot() {
    cy.apiInitSetup().then(({team}) => {
        cy.visit(`/${team.name}/channels/town-square`);
        cy.postMessage('hello');
        cy.uiOpenProductMenu('Integrations');
        cy.get('a.integration-option[href$="/bots"]').click();
        cy.get('#addBotAccount').click();
        cy.get('#username').type(`bot-${getRandomId()}`);
        cy.get('#displayName').type('Test Bot');
        cy.get('#saveBot').click();
        cy.url().
            should('include', `/${team.name}/integrations/confirm`).
            should('match', /token=[a-zA-Z0-9]{26}/);
        cy.get('div.backstage-form').
            should('include.text', 'Setup Successful').
            should((confirmation) => {
                expect(confirmation.text()).to.match(/Token: [a-zA-Z0-9]{26}/);
            });
        cy.get('#doneButton').click();
    });
}