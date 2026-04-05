describe('Custom Status - Setting Your Own Custom Status', () => {
    const customStatus = {
        emoji: 'grinning',
        text: 'Busy',
    };
    before(() => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T3846_1 should change the emoji to speech balloon when typed in the input', () => {
        cy.uiOpenUserMenu('Set custom status');
        cy.get('#custom_status_modal .StatusModal__emoji-button span').should('have.class', 'icon--emoji');
        cy.get('#custom_status_modal .StatusModal__input input').typeWithForce(customStatus.text);
        cy.get('#custom_status_modal .StatusModal__emoji-button span').invoke('attr', 'data-emoticon').should('contain', 'speech_balloon');
    });
    it('MM-T3846_2 should display the emoji picker when clicked on the emoji button', () => {
        cy.get('#custom_status_modal .StatusModal__emoji-button').click();
        cy.get('#emojiPicker').should('exist');
    });
    it('MM-T3846_3 should select the emoji from the emoji picker', () => {
        cy.get('#emojiPicker').should('exist');
        cy.clickEmojiInEmojiPicker(customStatus.emoji);
        cy.get('#emojiPicker').should('not.exist');
        cy.get('#custom_status_modal .StatusModal__emoji-button span').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
    });
    it('MM-T3846_4 should set custom status when click on Set Status', () => {
        cy.get('#custom_status_modal .GenericModal__button.confirm').click();
        cy.get('#custom_status_modal').should('not.exist');
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('have.attr', 'data-emoticon', customStatus.emoji);
        cy.get('body').type('{esc}');
    });
    it('MM-T3846_5 should show custom status with emoji in the status dropdown', () => {
        cy.uiOpenUserMenu().within(() => {
            cy.findByText(customStatus.text).should('exist');
            cy.get(`span[data-emoticon="${customStatus.emoji}"]`).should('exist');
        });
        cy.get('body').type('{esc}');
    });
    it('MM-T3846_6 should show previously set status in the first position in Recents list', () => {
        cy.uiOpenUserMenu().within(() => {
            cy.findByText(customStatus.text).should('exist').click({force: true});
        });
        cy.get('#custom_status_modal').should('exist');
        cy.get('#custom_status_modal .statusSuggestion__row').first().find('.statusSuggestion__text').should('have.text', customStatus.text);
        cy.get('#custom_status_modal .statusSuggestion__row').first().find('span.emoticon').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
    });
    it('MM-T3846_7 should set the same status again when clicked on the Set status', () => {
        cy.get('#custom_status_modal .statusSuggestion__row').first().click();
        cy.get('#custom_status_modal .GenericModal__button.confirm').click();
        cy.get('#custom_status_modal').should('not.exist');
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('have.attr', 'data-emoticon', customStatus.emoji);
    });
    it('MM-T3846_8 should clear the status when clicked on Clear status button', () => {
        cy.uiOpenUserMenu(customStatus.text);
        cy.findByRole('dialog', {name: 'Set a status'});
        cy.findByText('Clear Status').click();
        cy.uiOpenUserMenu().within(() => {
            cy.findByText(customStatus.text).should('not.exist');
        });
    });
});