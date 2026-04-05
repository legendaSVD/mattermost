describe('Profile > Profile Settings > Full Name', () => {
    let testUser;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({user, offTopicUrl}) => {
            testUser = user;
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T2043 Enter first name', () => {
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#nameEdit').should('be.visible').click();
        cy.get('#firstName').clear();
        cy.get('#firstName').should('be.visible').type(testUser.first_name + '_new');
        cy.uiSave();
        cy.get('#nameDesc').should('be.visible').should('contain', testUser.first_name + '_new ' + testUser.last_name);
        cy.uiClose();
    });
    it('MM-T2042 Full Name starting blank stays blank', () => {
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#nameEdit').should('be.visible').click();
        cy.get('#firstName').should('be.visible').clear();
        cy.get('#lastName').should('be.visible').clear();
        cy.uiSave();
        cy.get('#nameEdit').should('be.visible').click();
        cy.uiSave();
        cy.findByText("Click 'Edit' to add your full name").should('be.visible');
        cy.get('#nameEdit').should('be.visible').click();
        cy.get('#firstName').should('be.visible').should('have.value', '');
        cy.get('#lastName').should('be.visible').should('have.value', '');
        cy.uiClose();
    });
});