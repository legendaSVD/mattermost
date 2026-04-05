import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Managing bot accounts', () => {
    let botName: string;
    before(() => {
        cy.apiRequireLicenseForFeature('LDAP');
        cy.apiCreateBot().then(({bot}) => {
            botName = bot.username;
        });
    });
    it('MM-T1855 Bot cannot login', () => {
        cy.apiLogout();
        cy.visit('/login');
        cy.get('.login-body-card-title').click();
        cy.findByPlaceholderText('Email, Username or AD/LDAP Username', {timeout: TIMEOUTS.ONE_MIN}).clear().type(botName);
        cy.findByPlaceholderText('Password').clear().type('invalidPassword@#%(^!');
        cy.get('#saveSetting').should('not.be.disabled').click();
        cy.findByText('Bot login is forbidden.').should('exist').and('be.visible');
    });
});