import {getRandomId} from '../../../../utils';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Incoming webhook', () => {
    let testTeam;
    let incomingWebhook;
    before(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            const newIncomingHook = {
                channel_id: channel.id,
                channel_locked: false,
                description: 'Incoming webhook - setting',
                display_name: 'webhook-setting',
            };
            cy.apiCreateWebhook(newIncomingHook).then((hook) => {
                incomingWebhook = hook;
            });
        });
    });
    it('MM-T623 Lock to this channel on webhook configuration works', () => {
        cy.apiCreateChannel(testTeam.id, 'other-channel', 'Other Channel').then(({channel}) => {
            const payload1 = getPayload(channel);
            cy.postIncomingWebhook({url: incomingWebhook.url, data: payload1});
            switchToChannel(testTeam.name, channel.name);
            waitUntilWebhookPosted(payload1.text);
            editIncomingWebhook(incomingWebhook.id, testTeam.name, true);
            const payload2 = getPayload(channel);
            cy.task('postIncomingWebhook', {url: incomingWebhook.url, data: payload2}).then((res) => {
                expect(res.status).equal(403);
                expect(res.data.message).equal('This webhook is not permitted to post to the requested channel.');
            });
            editIncomingWebhook(incomingWebhook.id, testTeam.name, false);
            cy.postIncomingWebhook({url: incomingWebhook.url, data: payload2});
            switchToChannel(testTeam.name, channel.name);
            waitUntilWebhookPosted(payload2.text);
        });
    });
});
function switchToChannel(teamName, channelName) {
    cy.visit(`/${teamName}/channels/town-square`);
    cy.get(`#sidebarItem_${channelName}`, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click({force: true});
}
function editIncomingWebhook(incomingWebhookId, teamName, lockToChannel) {
    cy.visit(`/${teamName}/integrations/incoming_webhooks/edit?id=${incomingWebhookId}`);
    cy.get('.backstage-header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').within(() => {
        cy.findByText('Incoming Webhooks').should('be.visible');
        cy.findByText('Edit').should('be.visible');
    });
    cy.findByLabelText('Lock to this channel').should('exist').as('lockChannel');
    if (lockToChannel) {
        cy.get('@lockChannel').check();
    } else {
        cy.get('@lockChannel').uncheck();
    }
    cy.findByText('Update').click();
    cy.url().should('include', `/${teamName}/integrations/incoming_webhooks`).wait(TIMEOUTS.ONE_SEC);
}
function getPayload(channel) {
    return {
        channel: channel.name,
        text: `${getRandomId()} - this is from incoming webhook`,
    };
}
function waitUntilWebhookPosted(text) {
    cy.waitUntil(() => cy.getLastPost().then((el) => {
        const postedMessageEl = el.find('.post-message__text > p')[0];
        return Boolean(postedMessageEl && postedMessageEl.textContent.includes(text));
    }));
}