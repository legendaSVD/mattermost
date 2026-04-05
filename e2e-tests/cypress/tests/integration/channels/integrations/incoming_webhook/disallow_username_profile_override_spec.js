import {getRandomId} from '../../../../utils';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {enableUsernameAndIconOverride} from './helpers';
describe('Incoming webhook', () => {
    let sysadmin;
    let testTeam;
    let testChannel;
    let testUser;
    let incomingWebhook;
    before(() => {
        cy.apiGetMe().then(({user}) => {
            sysadmin = user;
        });
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            const newHook = {
                channel_id: testChannel.id,
                channel_locked: true,
                description: 'Incoming webhook - override',
                display_name: `incoming-override-${getRandomId()}`,
            };
            cy.apiCreateWebhook(newHook).then((hook) => {
                incomingWebhook = hook;
            });
        });
    });
    it('MM-T622 Disallow override of username and profile picture', () => {
        const iconUrl = 'https://mattermost.com/wp-content/uploads/2022/02/icon_WS.png';
        cy.apiAdminLogin();
        enableUsernameAndIconOverride(true);
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', testChannel.display_name);
        cy.postMessage('a');
        const payload1 = getPayload(testChannel, iconUrl);
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload1, waitFor: 'text'});
        cy.getLastPost().within(() => {
            cy.findByText(payload1.text).should('be.visible');
            cy.get('.post__header').find('.user-popover').should('have.text', payload1.username);
            const encodedIconUrl = encodeURIComponent(payload1.icon_url);
            cy.get('.profile-icon > img').should('have.attr', 'src', `${Cypress.config('baseUrl')}/api/v4/image?url=${encodedIconUrl}`);
        });
        cy.apiAdminLogin();
        enableUsernameAndIconOverride(false);
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', testChannel.display_name);
        cy.postMessage('b');
        const payload2 = getPayload(testChannel, iconUrl);
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload2, waitFor: 'text'});
        cy.getLastPost().within(() => {
            cy.findByText(payload2.text).should('be.visible');
            cy.get('.post__header').find('.user-popover').should('have.text', sysadmin.username);
            cy.get('.profile-icon > img').should('have.attr', 'src', `${Cypress.config('baseUrl')}/api/v4/users/${sysadmin.id}/image?_=0`);
        });
        cy.uiGetNthPost(-3).within(() => {
            cy.findByText(payload1.text).should('be.visible');
            cy.get('.post__header').find('.user-popover').should('have.text', sysadmin.username);
            cy.get('.profile-icon > img').should('have.attr', 'src', `${Cypress.config('baseUrl')}/api/v4/users/${sysadmin.id}/image?_=0`);
        });
    });
});
function getPayload(channel, iconUrl) {
    return {
        channel: channel.name,
        username: 'user-overriden',
        icon_url: iconUrl,
        text: `${getRandomId()} - this is from incoming webhook.`,
    };
}