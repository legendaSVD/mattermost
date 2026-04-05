describe('Verify Accessibility Support in different Buttons', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('hello');
            cy.getLastPostId().then((postId) => {
                cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
                cy.uiGetChannelPinButton().click();
            });
        });
    });
    it('MM-T1459 Accessibility Support in RHS expand and close icons', () => {
        cy.clickPostCommentIcon();
        cy.get('#rhsContainer').
            should('be.visible').
            within(() => {
                cy.get('button.sidebar--right__expand').
                    should('have.attr', 'aria-label', 'Expand Sidebar Icon');
                cy.get('#rhsCloseButton').
                    should('have.attr', 'aria-label', 'Close').
                    within(() => {
                        cy.get('.icon-close').should('have.attr', 'aria-label', 'Close Sidebar Icon');
                    });
                cy.get('#rhsCloseButton').click();
            });
    });
    it('MM-T1461 Accessibility Support in different buttons in Channel Header', () => {
        cy.uiGetChannelFavoriteButton().
            focus().
            tab({shift: true}).
            tab();
        cy.uiGetChannelFavoriteButton().
            should('be.focused').
            and('have.attr', 'aria-label', 'add to favorites').
            click();
        cy.uiGetChannelFavoriteButton().
            should('have.attr', 'aria-label', 'remove from favorites');
        cy.uiGetChannelFavoriteButton().
            focus().
            tab({shift: true}).
            tab();
        cy.focused().tab().tab().tab();
        cy.uiGetChannelPinButton().
            should('be.focused').
            and('have.attr', 'aria-label', 'Pinned messages').
            tab().tab().tab().tab();
    });
});