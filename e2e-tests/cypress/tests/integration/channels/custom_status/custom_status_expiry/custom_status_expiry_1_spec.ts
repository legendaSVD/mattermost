import dayjs from 'dayjs';
describe('MM-T4063 Custom status expiry', () => {
    before(() => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    const defaultCustomStatuses = ['In a meeting', 'Out for lunch', 'Out sick', 'Working from home', 'On a vacation'];
    const customStatus = {
        emoji: 'hamburger',
        emojiAriaLabel: ':hamburger:',
        text: 'Out for lunch',
        duration: '30 minutes',
    };
    const waitingTime = 30;
    let expiresAt = dayjs();
    let expiresAtAcceptableValues = [''];
    let expiresAtRegexp: RegExp;
    const expiryTimeFormat = 'h:mm A';
    it('MM-T4063_1 should open status dropdown', () => {
        cy.uiGetSetStatusButton().click();
        cy.uiGetStatusMenu();
        cy.get('body').click();
    });
    it('MM-T4063_2 Custom status modal opens with 5 default statuses listed', () => {
        cy.uiOpenUserMenu('Set custom status');
        cy.findByRole('dialog', {name: 'Set a status'}).should('exist').within(() => {
            defaultCustomStatuses.forEach((statusText) => {
                cy.findByText(statusText).should('exist');
            });
        });
    });
    it('MM-T4063_3 Correct custom status is selected with the correct emoji and correct duration', () => {
        cy.get('#custom_status_modal .StatusModal__emoji-button span').should('have.class', 'icon--emoji');
        cy.get('#custom_status_modal input.form-control').should('have.value', '');
        cy.get('#custom_status_modal .statusSuggestion__content').contains('span', customStatus.text).click();
        cy.get('#custom_status_modal .StatusModal__emoji-button span').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.get('#custom_status_modal input.form-control').should('have.value', customStatus.text);
        cy.get('#custom_status_modal .expiry-wrapper .expiry-value').should('have.text', customStatus.duration);
    });
    it('MM-T4063_4 should set custom status when click on Set Status', () => {
        cy.get('#custom_status_modal .GenericModal__button.confirm').click();
        cy.get('#custom_status_modal').should('not.exist');
        expiresAt = dayjs().add(waitingTime, 'minute');
        expiresAtAcceptableValues = [-1, 0, 1].map((el) =>
            expiresAt.add(el, 'minute').format(expiryTimeFormat),
        );
        expiresAtRegexp = new RegExp(`(${expiresAtAcceptableValues.join('|')})`);
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('have.attr', 'data-emoticon', customStatus.emoji);
    });
    it('MM-T4063_5 should show the set custom status with expiry when status dropdown is opened', () => {
        cy.uiGetSetStatusButton().click();
        cy.uiGetStatusMenu().within(() => {
            cy.findByText(customStatus.text).should('exist');
            cy.findByLabelText(customStatus.emojiAriaLabel).should('exist');
            cy.findByText(expiresAtRegexp).should('exist');
        });
    });
    it('MM-T4063_6 custom status should be cleared after duration of set custom status', () => {
        cy.clock(Date.now());
        cy.tick(waitingTime * 60 * 1000);
        cy.get('.status-dropdown-menu .custom_status__expiry', {timeout: 40000}).should('not.exist');
    });
    it('MM-T4063_7 current custom status should display expiry time in custom status modal', () => {
        cy.get('.userAccountMenu_customStatusMenuItem').should('be.visible').click();
        cy.get('#custom_status_modal .statusSuggestion__content').contains('span', customStatus.text).click();
        cy.get('#custom_status_modal .expiry-value').invoke('text').should('match', expiresAtRegexp);
        cy.get('#custom_status_modal .modal-header .close').click();
    });
    it('MM-T4063_8 previous custom status duration should be reset if custom status is expired', () => {
        cy.clock(Date.now());
        cy.tick(waitingTime * 60 * 1000).then(() => {
            cy.uiOpenUserMenu().within(() => {
                cy.findByText('Set custom status').should('exist').and('be.visible');
            });
        });
    });
});