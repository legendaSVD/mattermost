describe('DND Status - Setting Your Own DND Status', () => {
    const dndTimes = [
        'dndTime-dont_clear_menuitem',
        'dndTime-thirty_minutes_menuitem',
        'dndTime-one_hour_menuitem',
        'dndTime-two_hours_menuitem',
        'dndTime-tomorrow_menuitem',
        'dndTime-custom_menuitem',
    ];
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-8497_1 Set status DND with predefined end times', () => {
        for (let i = 0; i < 5; i++) {
            openDndStatusSubMenu();
            cy.get(`.SubMenuItemContainer li#${dndTimes[i]}`).click();
            cy.uiGetProfileHeader().
                find('i').
                should('be.visible').
                and('have.class', 'icon-minus-circle');
            cy.apiUpdateUserStatus('online');
            cy.reload();
        }
    });
    it('MM-8497_2 Set status DND with custom end time', () => {
        openDndStatusSubMenu();
        cy.get(`.SubMenuItemContainer li#${dndTimes[4]}`).click();
        cy.get('.DndModal__footer span').should('have.text', 'Disable Notifications').click();
        verifyDNDUserStatus();
        cy.apiUpdateUserStatus('online');
        cy.reload();
        openDndStatusSubMenu();
        cy.get(`.SubMenuItemContainer li#${dndTimes[4]}`).click();
        cy.get('.dateTime__date .date-time-input').click();
        cy.get('.date-picker__popper').should('be.visible');
        cy.get('.date-picker__popper').find('.rdp-day_today').next('.rdp-day').click();
        cy.get('.DndModal__footer span').should('have.text', 'Disable Notifications').click();
        verifyDNDUserStatus();
        cy.apiUpdateUserStatus('online');
        cy.reload();
        openDndStatusSubMenu();
        cy.get(`.SubMenuItemContainer li#${dndTimes[4]}`).click();
        cy.get('.dateTime__time .date-time-input').click();
        cy.get('#expiryTimeMenu').should('be.visible');
        cy.get('#expiryTimeMenu li').last().click();
        cy.get('.DndModal__footer span').should('have.text', 'Disable Notifications').click();
        verifyDNDUserStatus();
        cy.apiUpdateUserStatus('online');
        cy.reload();
        openDndStatusSubMenu();
        cy.get(`.SubMenuItemContainer li#${dndTimes[4]}`).click();
        cy.get('.dateTime__date .date-time-input').click();
        cy.get('.date-picker__popper').should('be.visible');
        cy.get('.date-picker__popper').find('.rdp-day_today').next('.rdp-day').click();
        cy.get('.dateTime__time .date-time-input').click();
        cy.get('#expiryTimeMenu').should('be.visible');
        cy.get('#expiryTimeMenu li').last().click();
        cy.get('.DndModal__footer span').should('have.text', 'Disable Notifications').click();
        verifyDNDUserStatus();
    });
});
function openDndStatusSubMenu() {
    cy.uiGetSetStatusButton().click();
    cy.findByText('Do Not Disturb').trigger('mouseover');
}
function verifyDNDUserStatus() {
    cy.uiGetProfileHeader().
        find('i').
        should('be.visible').
        and('have.class', 'icon-minus-circle');
}