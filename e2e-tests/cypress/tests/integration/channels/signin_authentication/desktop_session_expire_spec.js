import {getAdminAccount} from '../../../support/env';
import {spyNotificationAs} from '../../../support/notification';
import timeouts from '../../../fixtures/timeouts';
import {fillCredentialsForUser} from './helpers';
describe('Authentication', () => {
    let testTeam;
    let testUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
        });
    });
    it('MM-T419 Desktop session expires when the focus is on the tab', () => {
        cy.apiLogout();
        cy.visit('/login');
        fillCredentialsForUser(testUser);
        cy.uiOpenSettingsModal().within(() => {
            cy.findByText('Desktop and mobile notifications').should('be.visible').click();
            cy.get('#desktopNotificationNever').check();
            cy.uiSaveAndClose();
        });
        spyNotificationAs('withNotification', 'granted');
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.postMessage('hello');
        const sysadmin = getAdminAccount();
        cy.externalRequest({user: sysadmin, method: 'post', path: `users/${testUser.id}/sessions/revoke/all`});
        cy.get('.AlertBanner.warning', {timeout: timeouts.ONE_MIN}).should('contain.text', 'Your session has expired. Please log in again.');
        cy.wait(timeouts.HALF_MIN);
        cy.get('@withNotification').should('have.been.calledOnce').and('have.been.calledWithMatch', 'Mattermost', ({body}) => {
            const expected = 'Session Expired: Please sign in to continue receiving notifications.';
            expect(body, `Notification body: "${body}" should match: "${expected}"`).to.equal(expected);
            return true;
        });
    });
});