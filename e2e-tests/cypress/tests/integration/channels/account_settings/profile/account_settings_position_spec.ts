describe('Profile > Profile Settings > Position', () => {
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('hello from master hacker');
        });
    });
    it('MM-T2063 Position', () => {
        const position = 'Master hacker';
        cy.uiOpenProfileModal('Profile Settings').within(() => {
            cy.findByRole('heading', {name: 'Position'}).should('be.visible').click();
            cy.findByRole('textbox', {name: 'Position'}).
                should('be.visible').
                and('be.focused').
                type(position).
                should('have.value', position);
            cy.uiSaveAndClose();
        });
        cy.get('.profile-icon > img').as('profileIconForPopover').click();
        cy.contains('div.user-profile-popover', position).should('be.visible');
    });
    it('MM-T2064 Position / 128 characters', () => {
        const longPosition = 'Master Hacker II'.repeat(8);
        cy.uiOpenProfileModal('Profile Settings').within(() => {
            const minPositionHeader = () => cy.findByRole('heading', {name: 'Position'});
            const maxPositionInput = () => cy.findByRole('textbox', {name: 'Position'});
            minPositionHeader().click();
            maxPositionInput().type(longPosition);
            cy.uiSave();
            maxPositionInput().should('not.exist');
            minPositionHeader().click();
            maxPositionInput().invoke('val').then((val) => {
                expect(val.toString().length).to.equal(128);
            });
            maxPositionInput().focus().type('random');
            maxPositionInput().invoke('val').then((val) => {
                expect(val).to.equal(longPosition);
            });
            cy.uiSave();
        });
    });
});