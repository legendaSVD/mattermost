import {Bot, BotPatch} from '@mattermost/types/bots';
import {ChainableT} from 'tests/types';
import {getRandomId} from '../../utils';
function apiCreateBot({prefix, bot}: Partial<{prefix: string; bot: BotPatch}> = {}): ChainableT<{bot: Bot & {fullDisplayName: string}}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: '/api/v4/bots',
        method: 'POST',
        body: bot || createBotPatch(prefix),
    }).then((response) => {
        expect(response.status).to.equal(201);
        const {body} = response;
        return cy.wrap({
            bot: {
                ...body,
                fullDisplayName: `${body.display_name} (@${body.username})`,
            },
        });
    });
}
Cypress.Commands.add('apiCreateBot', apiCreateBot);
function apiGetBots(page = 0, perPage = 200, includeDeleted = false): ChainableT<{bots: Bot[]}> {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/bots?page=${page}&per_page=${perPage}&include_deleted=${includeDeleted}`,
        method: 'GET',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap({bots: response.body});
    });
}
Cypress.Commands.add('apiGetBots', apiGetBots);
function apiDisableBot(userId) {
    return cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/bots/${userId}/disable`,
        method: 'POST',
    }).then((response) => {
        expect(response.status).to.equal(200);
        return cy.wrap(response);
    });
}
Cypress.Commands.add('apiDisableBot', apiDisableBot);
export function createBotPatch(prefix = 'bot'): BotPatch {
    const randomId = getRandomId();
    return {
        username: `${prefix}-${randomId}`,
        display_name: `Test Bot ${randomId}`,
        description: `Test bot description ${randomId}`,
    } as BotPatch;
}
function apiDeactivateTestBots() {
    return cy.apiGetBots().then(({bots}) => {
        bots.forEach((bot) => {
            if (bot?.display_name?.includes('Test Bot') || bot?.username.startsWith('bot-')) {
                cy.apiDisableBot(bot.user_id);
                cy.apiDeactivateUser(bot.user_id);
                cy.log(`Deactivated Bot: "${bot.username}"`);
            }
        });
    });
}
Cypress.Commands.add('apiDeactivateTestBots', apiDeactivateTestBots);
declare global {
    namespace Cypress {
        interface Chainable {
            apiCreateBot: typeof apiCreateBot;
            apiDeactivateTestBots: typeof apiDeactivateTestBots;
            apiGetBots: typeof apiGetBots;
            apiDisableBot: typeof apiDisableBot;
        }
    }
}