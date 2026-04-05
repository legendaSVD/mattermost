import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Notifications', () => {
    let testTeam;
    let firstUser;
    let secondUser;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            const firstUsername = `test${getRandomId()}`;
            cy.apiCreateUser({user: generateTestUser(firstUsername)}).then(({user: user1}) => {
                firstUser = user1;
                cy.apiAddUserToTeam(testTeam.id, firstUser.id);
            });
            const secondUsername = `${firstUsername}.one`;
            cy.apiCreateUser({user: generateTestUser(secondUsername)}).then(({user: user2}) => {
                secondUser = user2;
                cy.apiAddUserToTeam(testTeam.id, secondUser.id);
            });
        });
    });
    it('MM-T486 Users with the same firstname in their username should not get a mention when one of them leaves a channel', () => {
        cy.apiLogin(firstUser);
        cy.apiCreateChannel(testTeam.id, 'test_channel', 'Test Channel').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.apiAddUserToChannel(channel.id, secondUser.id);
            cy.get('#sidebarItem_off-topic', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').click();
            cy.apiLogout();
            cy.apiLogin(secondUser);
            cy.visit(`/${testTeam.name}`);
            cy.get(`#sidebarItem_${channel.name}`, {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').within(() => {
                cy.findByText(channel.display_name).should('be.visible');
                cy.get('#unreadMentions').should('have.text', '1');
            });
            cy.get(`#sidebarItem_${channel.name}`).click();
            checkUnreadMentions(channel);
            cy.uiOpenChannelMenu('Leave Channel');
            cy.apiLogout();
            cy.apiLogin(firstUser);
            cy.visit(`/${testTeam.name}/channels/town-square`);
            cy.uiOpenUserMenu().findByText(`@${firstUser.username}`);
            cy.get('body').type('{esc}');
            cy.get('.active').within(() => {
                cy.get('#sidebarItem_town-square').should('exist');
            });
            checkUnreadMentions(channel);
        });
    });
    function checkUnreadMentions(testChannel) {
        cy.get(`#sidebarItem_${testChannel.name}`).within(() => {
            cy.get('#unreadMentions').should('not.exist');
        });
    }
    function generateTestUser(username) {
        const randomId = getRandomId();
        return {
            email: `${username}${randomId}@sample.mattermost.com`,
            username,
            password: 'passwd',
            first_name: `First${randomId}`,
            last_name: `Last${randomId}`,
            nickname: `Nickname${randomId}`,
        };
    }
});