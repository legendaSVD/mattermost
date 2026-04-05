import * as MESSAGES from '../../../fixtures/messages';
describe('DM/GM filtering and sorting', () => {
    let testUser;
    before(() => {
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({user, townSquareUrl}) => {
            testUser = user;
            cy.visit(townSquareUrl);
        });
    });
    it('MM-T2003 Number of direct messages to show', () => {
        const receivingUser = testUser;
        cy.intercept('**/api/v4/users/status/ids**').as('userStatus');
        cy.uiGetLHSHeader();
        cy.get('button.SidebarChannelGroupHeader_groupButton:contains(DIRECT MESSAGES)').should('be.visible').click();
        for (let i = 0; i < 41; i++) {
            cy.apiCreateUser().then(({user}) => {
                cy.apiCreateDirectChannel([receivingUser.id, user.id]).then(({channel}) => {
                    cy.postMessageAs({
                        sender: user,
                        message: MESSAGES.TINY,
                        channelId: channel.id,
                    });
                    cy.wait('@userStatus');
                    cy.get('.SidebarChannelGroup:contains(DIRECT MESSAGES) a[id^="sidebarItem"]').should('be.visible').should('have.length', Math.min(i + 1, 2));
                    cy.get(`#sidebarItem_${channel.name}`).should('be.visible').click();
                });
            });
        }
        cy.get('button.SidebarChannelGroupHeader_groupButton:contains(DIRECT MESSAGES)').should('be.visible').click();
        cy.get('.SidebarChannelGroup:contains(DIRECT MESSAGES) a[id^="sidebarItem"]').should('have.length', 40);
        cy.uiOpenSettingsModal('Sidebar');
        cy.get('#limitVisibleGMsDMsDesc').should('be.visible').should('contain', '40');
        cy.get('#limitVisibleGMsDMsEdit').should('be.visible').click();
        cy.get('#limitVisibleGMsDMs').should('be.visible').click();
        cy.get('.react-select__option:contains(All Direct Messages)').should('be.visible').click();
        cy.uiSaveAndClose();
        cy.get('.SidebarChannelGroup:contains(DIRECT MESSAGES) a[id^="sidebarItem"]').should('have.length', 41);
        cy.uiOpenSettingsModal('Sidebar');
        cy.get('#limitVisibleGMsDMsEdit').should('be.visible').click();
        cy.get('#limitVisibleGMsDMs').should('be.visible').click();
        cy.get('.react-select__option:contains(10)').should('be.visible').click();
        cy.uiSaveAndClose();
        cy.get('.SidebarChannelGroup:contains(DIRECT MESSAGES) a[id^="sidebarItem"]').should('have.length', 10);
    });
});