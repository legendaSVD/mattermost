describe('Custom Status - Recent Statuses', () => {
    const customStatus = {
        emoji: 'grinning',
        text: 'Busy',
    };
    const defaultStatus = {
        emoji: 'calendar',
        text: 'In a meeting',
    };
    before(() => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T3847_1 set a status', () => {
        cy.uiOpenUserMenu('Set custom status');
        cy.get('#custom_status_modal .StatusModal__input input').typeWithForce(customStatus.text);
        cy.get('#custom_status_modal .StatusModal__emoji-button').click();
        cy.clickEmojiInEmojiPicker(customStatus.emoji);
        cy.get('#custom_status_modal .GenericModal__button.confirm').click();
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('have.attr', 'data-emoticon', customStatus.emoji);
    });
    it('MM-T3847_2 should show status in the top in the Recents list', () => {
        cy.uiOpenUserMenu(customStatus.text);
        cy.get('#custom_status_modal .StatusModal__clear-container').click();
        cy.get('#custom_status_modal input.form-control').should('have.value', '');
        cy.get('#custom_status_modal #statusSuggestion__recents .statusSuggestion__row').first().find('.statusSuggestion__text').should('have.text', customStatus.text);
    });
    it('MM-T3847_3 should remove the status from Recents list when corresponding clear button is clicked', () => {
        cy.get('#custom_status_modal #statusSuggestion__recents .statusSuggestion__row').first().trigger('mouseover');
        cy.get('#custom_status_modal #statusSuggestion__recents .statusSuggestion__row').first().get('.suggestion-clear').should('be.visible');
        cy.get('#custom_status_modal #statusSuggestion__recents .statusSuggestion__row').first().get('.suggestion-clear').click();
        cy.get('#custom_status_modal .statusSuggestion__content').should('not.contain', customStatus.text);
    });
    it('MM-T3847_4 should set default status when clicked on the status', () => {
        cy.get('#custom_status_modal .statusSuggestion__content').contains('span', defaultStatus.text).click();
        cy.get('#custom_status_modal .GenericModal__button.confirm').click();
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('have.attr', 'data-emoticon', defaultStatus.emoji);
    });
    it('MM-T3847_5 should show status set in step 4 in the top in the Recents list', () => {
        cy.uiOpenUserMenu(defaultStatus.text);
        cy.get('#custom_status_modal .StatusModal__clear-container').click();
        cy.get('#custom_status_modal input.form-control').should('have.value', '');
        cy.get('#custom_status_modal #statusSuggestion__recents .statusSuggestion__row').first().find('.statusSuggestion__text').should('have.text', defaultStatus.text);
    });
    it('MM-T3847_6 should remove the default status from Recents and show in the Suggestions', () => {
        cy.get('#custom_status_modal #statusSuggestion__recents .statusSuggestion__row').first().trigger('mouseover');
        cy.get('#custom_status_modal #statusSuggestion__recents .statusSuggestion__row').first().get('.suggestion-clear').should('be.visible');
        cy.get('#custom_status_modal #statusSuggestion__recents').should('contain', defaultStatus.text);
        cy.get('#custom_status_modal #statusSuggestion__suggestions').should('not.contain', defaultStatus.text);
        cy.get('#custom_status_modal #statusSuggestion__recents .statusSuggestion__row').first().get('.suggestion-clear').click();
        cy.get('#custom_status_modal #statusSuggestion__recents').should('not.exist');
        cy.get('#custom_status_modal #statusSuggestion__suggestions').should('contain', defaultStatus.text);
    });
});