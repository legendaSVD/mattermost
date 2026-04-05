import * as TIMEOUTS from '../../../fixtures/timeouts';
import {spyNotificationAs} from '../../../support/notification';
import {getAdminAccount} from '../../../support/env';
import {
    changeDesktopNotificationAs,
    changeTeammateNameDisplayAs,
} from './helper';
describe('Desktop notifications', () => {
    let testTeam;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            otherUser = user;
            testTeam = team;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiCreateUser().then(({user}) => {
            testUser = user;
            cy.apiAddUserToTeam(testTeam.id, testUser.id);
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('MM-T489_1 Display teammate nickname when nickname exists', () => {
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            spyNotificationAs('withNotification', 'granted');
            changeDesktopNotificationAs('mentions');
            changeTeammateNameDisplayAs('#name_formatFormatB');
            const actualMsg = `@${testUser.username} first`;
            const expected = `@${otherUser.nickname}: ${actualMsg}`;
            cy.postMessageAs({sender: otherUser, message: actualMsg, channelId: channel.id});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('@withNotification').should('have.been.calledWithMatch', channel.display_name, (args) => {
                expect(args.body, `Notification body: "${args.body}" should match: "${expected}"`).to.equal(expected);
                return true;
            });
        });
    });
    it('MM-T489_2 Display teammates first and last name when nickname does not exists', () => {
        cy.apiGetChannelByName(testTeam.name, 'Off-Topic').then(({channel}) => {
            patchUser(otherUser.id, {nickname: ''});
            spyNotificationAs('withNotification', 'granted');
            changeDesktopNotificationAs('mentions');
            changeTeammateNameDisplayAs('#name_formatFormatB');
            const actualMsg = `@${testUser.username} second`;
            const expected = `@${otherUser.first_name} ${otherUser.last_name}: ${actualMsg}`;
            cy.postMessageAs({sender: otherUser, message: actualMsg, channelId: channel.id});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('@withNotification').should('have.been.calledWithMatch', channel.display_name, (args) => {
                expect(args.body, `Notification body: "${args.body}" should match: "${expected}"`).to.equal(expected);
                return true;
            });
        });
    });
});
function patchUser(userId, data) {
    const sysadmin = getAdminAccount();
    return cy.externalRequest({
        user: sysadmin,
        method: 'PUT',
        path: `users/${userId}/patch`,
        data,
    }).its('status').should('eq', 200);
}