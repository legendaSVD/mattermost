import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Category sorting', () => {
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T3916 Create Category character limit', () => {
        cy.uiBrowseOrCreateChannel('Create new category');
        cy.get('#editCategoryModal').should('be.visible').wait(TIMEOUTS.HALF_SEC).within(() => {
            cy.findByText('Create New Category').should('be.visible');
            cy.findByPlaceholderText('Name your category').should('be.visible').type('abcdefghijklmnopqrstuvwxyz');
        });
        cy.get('#editCategoryModal .MaxLengthInput.has-error').should('be.visible');
        cy.get('#editCategoryModal .MaxLengthInput__validation').should('be.visible').should('contain', '-4');
        cy.get('#editCategoryModal .GenericModal__button.confirm').should('be.visible').should('be.disabled');
        cy.get('#editCategoryModal .MaxLengthInput').should('be.visible').type('{backspace}{backspace}{backspace}{backspace}');
        cy.get('#editCategoryModal .MaxLengthInput.has-error').should('not.exist');
        cy.get('#editCategoryModal .MaxLengthInput__validation').should('not.exist');
        cy.get('#editCategoryModal .GenericModal__button.confirm').should('be.visible').should('not.be.disabled');
        cy.get('#editCategoryModal .GenericModal__button.confirm').should('be.visible').click();
        cy.findByLabelText('abcdefghijklmnopqrstuv').should('be.visible');
    });
});