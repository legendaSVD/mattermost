import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let firstUser;
    let secondUser;
    let offTopicUrl;
    before(() => {
        cy.apiInitSetup().then(({team, user, offTopicUrl: url}) => {
            firstUser = user;
            offTopicUrl = url;
            cy.apiCreateUser().then(({user: user1}) => {
                secondUser = user1;
                cy.apiAddUserToTeam(team.id, secondUser.id);
            });
            cy.apiLogin(firstUser);
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T1224 - CTRL/CMD+K - Open DM using mouse', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.findByRole('combobox', {name: 'quick switch input'}).should('be.focused').type(secondUser.username.substring(0, 6)).wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('be.visible').within(() => {
            cy.findByTestId(secondUser.username).scrollIntoView().should('exist').click().wait(TIMEOUTS.HALF_SEC);
        });
        cy.get('#channelIntro').should('be.visible').within(() => {
            cy.get('.channel-intro__title').
                should('be.visible').
                and('have.text', secondUser.username);
            cy.get('.channel-intro__text').
                should('be.visible').
                and('contain', `This is the start of your direct message history with ${secondUser.username}.`).
                and('contain', 'Messages and files shared here are not shown to anyone else.');
        });
        cy.uiGetPostTextBox().should('be.focused');
        cy.postMessage(`Hi there, ${secondUser.username}!`);
        cy.apiLogout();
        cy.reload();
        cy.apiLogin(secondUser);
        cy.visit(offTopicUrl);
        cy.uiGetLhsSection('DIRECT MESSAGES').findByLabelText(`${firstUser.username} 1 mention`).should('exist');
    });
});