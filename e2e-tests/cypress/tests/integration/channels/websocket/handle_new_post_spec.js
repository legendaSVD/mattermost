import {beRead, beUnread} from '../../../support/assertions';
import {getAdminAccount} from '../../../support/env';
import {getRandomId} from '../../../utils';
describe('Handle new post', () => {
    const admin = getAdminAccount();
    let channel1;
    let team1;
    let user1;
    before(() => {
        cy.apiInitSetup().then(({channel, team, user}) => {
            channel1 = channel;
            team1 = team;
            user1 = user;
            cy.apiLogin(user1);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it.skip('MM-T4609 - should mark channel as unread when a message is sent in another channel', () => {
        cy.get(`#sidebarItem_${channel1.name}`).click();
        cy.get(`#sidebarItem_${channel1.name}`).should(beRead);
        cy.get(`#sidebarItem_${channel1.name} .badge`).should('not.exist');
        cy.get('#sidebarItem_town-square').click();
        cy.postMessageAs({sender: admin, message: 'post', channelId: channel1.id});
        cy.get(`#sidebarItem_${channel1.name}`).should(beUnread);
        cy.get(`#sidebarItem_${channel1.name} .badge`).should('not.exist');
    });
    it.skip('MM-T4610 - should show the mention badge when a mention is sent in another channel', () => {
        cy.get(`#sidebarItem_${channel1.name}`).click();
        cy.get(`#sidebarItem_${channel1.name}`).should(beRead);
        cy.get(`#sidebarItem_${channel1.name} .badge`).should('not.exist');
        cy.get('#sidebarItem_town-square').click();
        cy.postMessageAs({sender: admin, message: `@${user1.username}`, channelId: channel1.id});
        cy.get(`#sidebarItem_${channel1.name}`).should(beUnread);
        cy.get(`#sidebarItem_${channel1.name} .badge`).should('exist').contains('1');
        cy.postMessageAs({sender: admin, message: `@${user1.username}`, channelId: channel1.id});
        cy.get(`#sidebarItem_${channel1.name}`).should(beUnread);
        cy.get(`#sidebarItem_${channel1.name} .badge`).should('exist').contains('2');
    });
    it('MM-T2015 - should show the mention badge when added to another channel', () => {
        const baseUrl = Cypress.config('baseUrl');
        const channelName = 'channel_' + getRandomId();
        cy.externalRequest({
            user: admin,
            baseUrl,
            method: 'post',
            path: 'channels',
            data: {
                display_name: channelName,
                name: channelName,
                team_id: team1.id,
                type: 'O',
            },
        }).then((response) => {
            expect(response.status).to.equal(201);
            const channel = response.data;
            cy.externalAddUserToChannel(user1.id, channel.id);
        });
        cy.get(`#sidebarItem_${channelName}`).should(beUnread);
        cy.get(`#sidebarItem_${channelName} .badge`).should('exist').contains('1');
    });
    it('MM-25452 should only show one mention added to another channel with network lag', () => {
        const baseUrl = Cypress.config('baseUrl');
        const channelName = 'channel_' + getRandomId();
        cy.externalRequest({
            user: admin,
            baseUrl,
            method: 'post',
            path: 'channels',
            data: {
                display_name: channelName,
                name: channelName,
                team_id: team1.id,
                type: 'O',
            },
        }).then((response) => {
            expect(response.status).to.equal(201);
            const channel = response.data;
            cy.delayRequestToRoutes([`channels/${channel.id}`], 100);
            cy.externalAddUserToChannel(user1.id, channel.id);
        });
        cy.get(`#sidebarItem_${channelName}`).should(beUnread);
        cy.get(`#sidebarItem_${channelName} .badge`).should('exist').contains('1');
    });
});