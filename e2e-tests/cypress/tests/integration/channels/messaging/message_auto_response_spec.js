import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Auto Response In DMs', () => {
    const AUTO_RESPONSE_MESSAGE = 'Out of Office';
    const MESSAGES = ['Message1', 'Message2', 'Message3'];
    let userA;
    let userB;
    let testTeam;
    let offTopicUrl;
    before(() => {
        cy.apiUpdateConfig({TeamSettings: {ExperimentalEnableAutomaticReplies: true}});
        cy.apiInitSetup().then((out) => {
            userA = out.user;
            testTeam = out.team;
            offTopicUrl = out.offTopicUrl;
            cy.apiCreateUser().then(({user}) => {
                userB = user;
                cy.apiAddUserToTeam(testTeam.id, userB.id);
            });
        });
    });
    it('MM-T4004 Out-of-office automatic reply sends only one in a direct message within one calendar day', () => {
        cy.apiLogin(userB);
        cy.visit(offTopicUrl);
        cy.uiOpenSettingsModal().within(() => {
            cy.get('#autoResponderEdit').should('exist').scrollIntoView().and('be.visible').click();
            cy.get('#autoResponderActive').should('be.visible').click();
            cy.get('#autoResponderMessageInput').should('be.visible').clear();
            cy.get('#autoResponderMessageInput').should('be.visible').clear().type(AUTO_RESPONSE_MESSAGE);
            cy.uiSaveAndClose();
        });
        cy.apiLogout();
        cy.apiLogin(userA);
        cy.visit(offTopicUrl);
        cy.uiAddDirectMessage().click();
        cy.get('#selectItems input').typeWithForce(userB.username);
        cy.findByText('Loading', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible');
        cy.findByText('Loading').should('not.exist');
        cy.get('#multiSelectList').findByText(`@${userB.username}`).click();
        cy.findByText('Go').click();
        cy.postMessage(MESSAGES[0]);
        cy.getLastPostId().then((replyId) => {
            cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', AUTO_RESPONSE_MESSAGE);
        });
        cy.postMessage(MESSAGES[1]);
        cy.getLastPostId().then((replyId) => {
            cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', MESSAGES[1]);
        });
        cy.postMessage(MESSAGES[2]);
        cy.getLastPostId().then((replyId) => {
            cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', MESSAGES[2]);
        });
    });
});