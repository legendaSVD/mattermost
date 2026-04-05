import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Integrations', () => {
    const away = {name: 'away', ariaLabel: 'Away', message: 'You are now away', className: 'icon-clock'};
    const offline = {name: 'offline', ariaLabel: 'Offline', message: 'You are now offline', className: 'icon-circle-outline'};
    const online = {name: 'online', ariaLabel: 'Online', message: 'You are now online', className: 'icon-check', profileClassName: 'icon-check-circle'};
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T670 /away', () => {
        setStatus(online.name);
        verifyUserStatus(away);
    });
    it('MM-T672 /offline', () => {
        setStatus(online.name);
        verifyUserStatus(offline);
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.findByLabelText('channel header region').findByText('Off-Topic').should('be.visible');
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.findByLabelText('channel header region').findByText('Off-Topic').should('be.visible');
        cy.findByText('New Messages').should('not.exist');
        cy.uiGetNthPost(-2).within(() => {
            cy.findByText(offline.message);
            cy.findByLabelText('Mattermost Logo').should('be.visible');
            cy.get('.post__img').find('.status').should('not.exist');
        });
    });
    it('MM-T674 /online', () => {
        setStatus(offline.name);
        verifyUserStatus(online);
    });
});
function setStatus(status) {
    cy.apiUpdateUserStatus(status);
}
function verifyUserStatus(testCase) {
    cy.uiGetPostTextBox().clear().type('/');
    cy.get('#suggestionList').should('be.visible');
    cy.uiGetPostTextBox().type(`${testCase.name}{enter}`).wait(TIMEOUTS.ONE_HUNDRED_MILLIS).type('{enter}');
    cy.getLastPost().within(() => {
        cy.findByText(testCase.message);
        cy.findByText('(Only visible to you)');
    });
    cy.get('#userAccountMenuButtonDescribedBy').should('exist').and('include.text', `Status is "${testCase.name.charAt(0).toUpperCase() + testCase.name.slice(1)}"`);
    cy.postMessage(testCase.name);
    cy.get('.post__img').last().findByLabelText(testCase.ariaLabel);
}