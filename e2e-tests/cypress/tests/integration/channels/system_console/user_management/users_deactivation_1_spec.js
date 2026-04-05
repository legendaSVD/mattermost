import * as MESSAGES from '../../../../fixtures/messages';
describe('System Console > User Management > Deactivation', () => {
    let team1;
    let otherAdmin;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            team1 = team;
        });
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            otherAdmin = sysadmin;
        });
    });
    beforeEach(() => {
        cy.apiLogin(otherAdmin);
        cy.visit(`/${team1.name}`);
    });
    it('MM-T951 Reopened DM shows archived icon in LHS No status indicator in channel header Message box replaced with "You are viewing an archived channel with a deactivated user." in center and RHS - KNOWN ISSUE: MM-42529', () => {
        cy.apiCreateUser({prefix: 'other'}).then(({user}) => {
            cy.sendDirectMessageToUser(user, MESSAGES.SMALL);
            cy.clickPostCommentIcon();
            cy.get('#channelHeaderDescription .status').should('be.visible');
            cy.apiDeactivateUser(user.id);
            cy.get('.channel-archived__message').contains('You are viewing an archived channel with a deactivated user. New messages cannot be posted.');
            cy.get('#rhsContainer .post-create-message').contains('You are viewing an archived channel with a deactivated user. New messages cannot be posted.');
            cy.get('#channelHeaderDescription .status').should('not.exist');
            cy.uiGetLhsSection('DIRECT MESSAGES').
                find('.active').should('be.visible').
                find('.icon-archive-outline').should('be.visible');
        });
    });
});