describe('DM on sidebar', () => {
    let testUser;
    let otherUser;
    before(() => {
        cy.apiCreateUser().then(({user}) => {
            otherUser = user;
        });
        cy.apiInitSetup({loginAfter: true}).then(({user, townSquareUrl}) => {
            testUser = user;
            cy.visit(townSquareUrl);
        });
    });
    it('MM-T3832 DMs/GMs should not be removed from the sidebar when only viewed (no message)', () => {
        cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(({channel}) => {
            cy.postMessageAs({
                sender: otherUser,
                message: `Hey ${testUser.username}`,
                channelId: channel.id,
            });
            cy.get(`#sidebarItem_${channel.name}`).should('be.visible').click();
            cy.get('.SidebarLink:contains(Town Square)').should('be.visible').click();
            cy.url().should('contain', 'town-square');
            cy.visit('/');
            cy.get(`#sidebarItem_${channel.name}`).should('be.visible');
        });
    });
});