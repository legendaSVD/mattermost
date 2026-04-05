describe('Leave and Archive channel actions display as destructive', () => {
    let testUser: Cypress.UserProfile;
    let offTopicUrl: string;
    before(() => {
        cy.apiInitSetup().then(({user, offTopicUrl: url}) => {
            testUser = user;
            offTopicUrl = url;
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
        });
    });
    beforeEach(() => {
        cy.reload();
    });
    it('MM-T4943_1 Leave and Archive channel actions display as destructive in the channel dropdown menu', () => {
        cy.get('#channelHeaderTitle').should('be.visible').click();
        cy.findByText('View Info').should('be.visible');
        cy.findByText('Move to...').should('be.visible').trigger('mouseover');
        cy.findByText('Favorites').should('be.visible');
        cy.findByText('New Category').should('be.visible');
        cy.findByText('Move to...').should('be.visible').trigger('mouseout');
        cy.get('#channelNotificationPreferences').should('be.visible');
        cy.get('#channelToggleMuteChannel').should('be.visible');
        cy.get('#channelMembers').should('be.visible');
        cy.findByText('Channel Settings').should('be.visible');
        cy.get('#channelArchiveChannel').should('be.visible').focus().should('have.css', 'background-color', 'rgb(210, 75, 78)');
        cy.get('#channelLeaveChannel').should('be.visible').focus().should('have.css', 'background-color', 'rgb(210, 75, 78)');
    });
    it('MM-T4943_2 Leave channel actions display as destructive in the Edit Channel Menu ', () => {
        cy.uiGetChannelSidebarMenu('Off-Topic').within(() => {
            cy.findByText('Favorite').should('be.visible').should('not.have.css', 'color', 'rgb(210, 75, 78)');
            cy.findByText('Mute Channel').should('be.visible').should('not.have.css', 'color', 'rgb(210, 75, 78)');
            cy.findByText('Copy Link').should('be.visible').should('not.have.css', 'color', 'rgb(210, 75, 78)');
            cy.findByText('Add Members').should('be.visible').should('not.have.css', 'color', 'rgb(210, 75, 78)');
            cy.findByText('Move to...').should('be.visible').should('not.have.css', 'color', 'rgb(210, 75, 78)');
            cy.findByText('Leave Channel').should('be.visible').should('have.css', 'color', 'rgb(210, 75, 78)');
        });
    });
});