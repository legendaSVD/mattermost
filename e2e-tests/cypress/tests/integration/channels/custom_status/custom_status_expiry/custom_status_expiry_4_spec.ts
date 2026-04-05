import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
describe('MM-T4066 Setting manual status clear time more than 7 days away', () => {
    before(() => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
        });
    });
    const defaultCustomStatuses = ['In a meeting', 'Out for lunch', 'Out sick', 'Working from home', 'On a vacation'];
    const defaultDurations = ["Don't clear", '30 minutes', '1 hour', '4 hours', 'Today', 'This week', 'Choose date and time'];
    const customStatus = {
        emoji: 'hamburger',
        text: 'Out for lunch',
        duration: '30 minutes',
    };
    dayjs.extend(advancedFormat);
    const today = dayjs();
    const dateToBeSelected = today.add(8, 'd');
    const months = dateToBeSelected.get('month') - today.get('month');
    it('MM-T4066_1 should open status dropdown', () => {
        cy.uiGetSetStatusButton().click();
        cy.get('#userAccountMenu').should('exist');
    });
    it('MM-T4066_2 Custom status modal opens with 5 default statuses listed', () => {
        cy.get('.userAccountMenu_setCustomStatusMenuItem').click();
        cy.get('#custom_status_modal').should('exist');
        defaultCustomStatuses.map((statusText) => cy.get('#custom_status_modal .statusSuggestion__content').contains('span', statusText));
    });
    it('MM-T4066_3 Correct custom status is selected with the correct emoji and correct duration', () => {
        cy.get('#custom_status_modal .StatusModal__emoji-button span').should('have.class', 'icon--emoji');
        cy.get('#custom_status_modal input.form-control').should('have.value', '');
        cy.get('#custom_status_modal .statusSuggestion__content').contains('span', customStatus.text).click();
        cy.get('#custom_status_modal .StatusModal__emoji-button span').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.get('#custom_status_modal input.form-control').should('have.value', customStatus.text);
        cy.get('#custom_status_modal .expiry-wrapper .expiry-value').should('have.text', customStatus.duration);
    });
    it('MM-T4066_4 Clear after dropdown opens with all default durations listed', () => {
        cy.get('#custom_status_modal .statusExpiry__menu #statusExpiryMenu').should('not.exist');
        cy.get('#custom_status_modal .statusExpiry__menu').click();
        cy.get('#custom_status_modal .statusExpiry__menu #statusExpiryMenu').should('exist');
        defaultDurations.map((duration, index) => cy.get(`#custom_status_modal #statusExpiryMenu li#expiry_menu_item_${index}`).should('have.text', duration));
    });
    it.skip('MM-T4066_5 should show date/time input on selecting Choose date and time', () => {
        cy.get('#custom_status_modal .dateTime').should('not.exist');
        cy.get('#custom_status_modal #statusExpiryMenu li').last().click();
        cy.get('#custom_status_modal .dateTime').should('exist');
    });
    it.skip('MM-T4066_6 should show selected date in the date input field', () => {
        cy.get('.dateTime__calendar-icon').click();
        cy.get('.date-picker__popper').should('be.visible');
        for (let i = 0; i < months; i++) {
            cy.get('i.icon.icon-chevron-right').click();
        }
        cy.get('.date-picker__popper').find(`.rdp-month button[aria-label="${dateToBeSelected.format('Do MMMM (dddd)')}"]`).click();
        cy.get('#custom_status_modal [role="button"][aria-label*="Date"]').should('contain.text', dateToBeSelected.format('MMM DD'));
    });
    it('MM-T4066_7 should set custom status when click on Set Status', () => {
        cy.get('#custom_status_modal .GenericModal__button.confirm').click();
        cy.get('#custom_status_modal').should('not.exist');
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('have.attr', 'data-emoticon', customStatus.emoji);
    });
    it.skip('MM-T4066_8 should show the set custom status with expiry when status dropdown is opened', () => {
        cy.get('.MenuWrapper .status-wrapper').click();
        cy.get('#statusDropdownMenu').should('exist');
        cy.get('.status-dropdown-menu .custom_status__container').should('have.text', customStatus.text);
        cy.get('.status-dropdown-menu .custom_status__row span.emoticon').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.get('.status-dropdown-menu .custom_status__expiry time').should('have.text', dateToBeSelected.format('MMM DD'));
    });
    it.skip('MM-52881 should show the selected date when reopening the date picker', () => {
        cy.get('.input-clear-x').click();
        cy.get('.custom_status__row').click();
        cy.get('.statusSuggestion__row').first().click();
        cy.get('.dateTime__calendar-icon').click();
        cy.get('.date-picker__popper').should('be.visible');
        for (let i = 0; i < months; i++) {
            cy.get('i.icon.icon-chevron-right').click();
        }
        cy.get('.date-picker__popper').find(`.rdp-month button[aria-label="${dateToBeSelected.format('Do MMMM (dddd)')}"]`).click();
        cy.get('.dateTime__calendar-icon').click();
        cy.get('.date-picker__popper').find(`.rdp-month button[aria-label="${dateToBeSelected.format('Do MMMM (dddd)')}"]`).should('have.class', 'rdp-day_selected');
    });
});