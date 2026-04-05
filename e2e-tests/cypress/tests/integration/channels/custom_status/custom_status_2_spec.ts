describe('Custom Status - Setting a Custom Status', () => {
    const defaultCustomStatuses = ['In a meeting', 'Out for lunch', 'Out sick', 'Working from home', 'On a vacation'];
    const customStatus = {
        emoji: 'calendar',
        text: 'In a meeting',
    };
    before(() => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    it('MM-T3836_1 should open status dropdown', () => {
        cy.uiGetSetStatusButton().click();
        cy.uiGetStatusMenuContainer();
        cy.get('body').type('{esc}');
    });
    it('MM-T3836_2 Custom status modal opens with 5 default statuses listed', () => {
        cy.uiGetSetStatusButton().click();
        cy.uiGetStatusMenuContainer().findByText('Set custom status').click();
        cy.get('#custom_status_modal').should('exist');
        defaultCustomStatuses.map((statusText) => cy.get('#custom_status_modal .statusSuggestion__content').contains('span', statusText));
    });
    it('MM-T3836_3 "In a meeting" is selected with the calendar emoji', () => {
        cy.get('#custom_status_modal .StatusModal__emoji-button span').should('have.class', 'icon--emoji');
        cy.get('#custom_status_modal input.form-control').should('have.value', '');
        cy.get('#custom_status_modal .statusSuggestion__content').contains('span', customStatus.text).click();
        cy.get('#custom_status_modal .StatusModal__emoji-button span').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.get('#custom_status_modal input.form-control').should('have.value', customStatus.text);
    });
    it('MM-T3836_4 In a meeting is cleared when clicked on "x" in the input', () => {
        cy.get('#custom_status_modal .statusSuggestion').should('not.exist');
        cy.get('#custom_status_modal .StatusModal__clear-container').click();
        cy.get('#custom_status_modal input.form-control').should('have.value', '');
        defaultCustomStatuses.map((statusText) => cy.get('#custom_status_modal .statusSuggestion__content').contains('span', statusText));
    });
    it('MM-T3836_5 "In a meeting" is selected with the calendar emoji', () => {
        cy.get('#custom_status_modal .StatusModal__emoji-button span').should('have.class', 'icon--emoji');
        cy.get('#custom_status_modal input.form-control').should('have.value', '');
        cy.get('#custom_status_modal .statusSuggestion__content').contains('span', customStatus.text).click();
        cy.get('#custom_status_modal .StatusModal__emoji-button span').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.get('#custom_status_modal input.form-control').should('have.value', customStatus.text);
    });
    it('MM-T3836_6 should set custom status when click on Set Status', () => {
        cy.get('#custom_status_modal .GenericModal__button.confirm').click();
        cy.get('#custom_status_modal').should('not.exist');
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('have.attr', 'data-emoticon', customStatus.emoji);
    });
    it('MM-T3836_7 should display the custom status tooltip when hover on the emoji in LHS header', () => {
        cy.uiGetProfileHeader().
            find('.emoticon').
            trigger('mouseover');
        cy.get('#custom-status-tooltip').should('exist').and('be.visible');
        cy.get('#custom-status-tooltip').within(() => {
            cy.get(`span[data-emoticon="${customStatus.emoji}"]`).should('exist');
            cy.findByText(customStatus.text).should('exist');
        });
    });
    it('MM-T3836_8 should open custom status modal when emoji in LHS header is clicked', () => {
        cy.get('#custom_status_modal').should('not.exist');
        cy.uiGetProfileHeader().
            find('.emoticon').
            click();
        cy.get('#custom_status_modal').should('exist');
    });
});