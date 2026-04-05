import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Notifications', () => {
    let testTeam;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.apiCreateUser().then(({user}) => {
                otherUser = user;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
                cy.apiLogin(otherUser);
            });
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('MM-T555 Notification Preferences do not save when modal is closed without saving', () => {
        openSettingsAndClickEmailEdit(true);
        openSettingsAndClickEmailEdit(false);
    });
    function openSettingsAndClickEmailEdit(shouldBeClicked = false) {
        cy.uiOpenSettingsModal().within(() => {
            cy.get('#emailEdit').click();
            if (shouldBeClicked) {
                cy.get('#emailNotificationImmediately').should('be.visible').and('be.checked');
                cy.get('#emailNotificationNever').should('be.visible').and('not.be.checked').click();
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.uiClose();
            } else {
                cy.get('#emailNotificationImmediately').should('be.visible').and('be.checked');
                cy.get('#emailNotificationNever').should('be.visible').and('not.be.checked');
            }
        });
    }
});