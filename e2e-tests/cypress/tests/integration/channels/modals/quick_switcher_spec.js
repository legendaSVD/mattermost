import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Quick switcher', () => {
    const userPrefix = 'az';
    const gmBadge = 'G';
    let testTeam;
    let testUser;
    let firstUser;
    let secondUser;
    let thirdUser;
    let testChannel;
    before(() => {
        cy.apiInitSetup().then(({user, team, channel}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
        cy.apiCreateUser({prefix: `${userPrefix}1`}).then(({user: user1}) => {
            firstUser = user1;
        });
        cy.apiCreateUser({prefix: `${userPrefix}2`}).then(({user: user1}) => {
            secondUser = user1;
        });
        cy.apiCreateUser({prefix: `${userPrefix}3`}).then(({user: user1}) => {
            thirdUser = user1;
        });
        cy.apiLogout();
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
    });
    it('MM-T3447_1 Should add recent user on top of results', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.focused().type(testChannel.display_name).wait(TIMEOUTS.HALF_SEC).type('{enter}');
        cy.postMessage('Testing quick switcher');
        cy.goToDm(secondUser.username);
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.focused().type('a').wait(TIMEOUTS.HALF_SEC);
        cy.get('.suggestion--selected').should('exist').and('contain.text', secondUser.username);
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-T3447_2 Should add latest interacted user on top of results instead of alphabetical order', () => {
        cy.goToDm(thirdUser.username);
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.focused().type('a').wait(TIMEOUTS.HALF_SEC);
        cy.get('.suggestion--selected').should('exist').and('contain.text', thirdUser.username);
        cy.get('body').typeWithForce('{esc}');
        cy.postMessage('Testing quick switcher');
        cy.goToDm(secondUser.username);
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.focused().type('a').wait(TIMEOUTS.HALF_SEC);
        cy.get('.suggestion--selected').should('exist').and('contain.text', secondUser.username);
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-T3447_3 Should match interacted users even with a partial match', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.focused().type('z2');
        cy.get('.suggestion--selected').should('exist').and('contain.text', secondUser.username);
        cy.get('body').typeWithForce('{esc}');
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.focused().type('z3');
        cy.get('.suggestion--selected').should('exist').and('contain.text', thirdUser.username);
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-T3447_4 Should not match GM if it is removed from LHS', () => {
        cy.apiCreateGroupChannel([testUser.id, firstUser.id, secondUser.id]).then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.postMessage('Hello to GM');
            cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
            cy.focused().type(userPrefix);
            cy.get('.suggestion--selected').should('exist').and('contain.text', gmBadge + userPrefix);
            cy.get('body').typeWithForce('{esc}');
            cy.uiOpenChannelMenu('Close Group Message');
            cy.goToDm(thirdUser.username);
            cy.postMessage('Hello to DM');
            cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
            cy.focused().type(userPrefix);
            cy.get('.suggestion--selected').should('exist').and('contain.text', thirdUser.username);
        });
    });
    it('MM-T3447_5 Should match GM even with space in search term', () => {
        cy.apiCreateGroupChannel([testUser.id, firstUser.id, thirdUser.id]).then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
            cy.focused().type(`${testUser.username} az3`);
            cy.get('.suggestion--selected').should('exist').and('contain.text', gmBadge + userPrefix);
        });
    });
});