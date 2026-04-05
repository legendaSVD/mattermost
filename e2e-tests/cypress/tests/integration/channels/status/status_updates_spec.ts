describe('Status of current user', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it("Changes to the current user's status made from the profile/status dropdown should be shown in real time", () => {
        verifyStatus('online');
        cy.uiGetSetStatusButton().click();
        cy.findByText('Away').click();
        verifyStatus('away');
        cy.uiGetSetStatusButton().click();
        cy.findByText('Offline').click();
        verifyStatus('offline');
        cy.uiGetSetStatusButton().click();
        cy.findByText('Online').click();
        verifyStatus('online');
    });
    it("Changes to the current user's status made using slash commands should be shown in real time", () => {
        verifyStatus('online');
        cy.postMessage('/away ');
        cy.findByText('You are now away').should('exist');
        verifyStatus('away');
        cy.postMessage('/offline ');
        cy.findByText('You are now offline').should('exist');
        verifyStatus('offline');
        cy.postMessage('/dnd ');
        cy.findByText('Do Not Disturb is enabled. You will not receive desktop or mobile push notifications until Do Not Disturb is turned off.').should('exist');
        verifyStatus('dnd');
        cy.postMessage('/online ');
        cy.findByText('You are now online').should('exist');
        verifyStatus('online');
    });
});
function verifyStatus(status: 'online' | 'away' | 'offline' | 'dnd') {
    cy.get('[aria-label="Status is \\"Online\\". Open user\'s account menu."]').
        should(status === 'online' ? 'exist' : 'not.exist');
    cy.get('[aria-label="Status is \\"Away\\". Open user\'s account menu."]').
        should(status === 'away' ? 'exist' : 'not.exist');
    cy.get('[aria-label="Status is \\"Offline\\". Open user\'s account menu."]').
        should(status === 'offline' ? 'exist' : 'not.exist');
    cy.get('[aria-label="Status is \\"Do not disturb\\". Open user\'s account menu."]').
        should(status === 'dnd' ? 'exist' : 'not.exist');
}