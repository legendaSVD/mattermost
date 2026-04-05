import {getRandomId} from '../../../utils';
describe('Integrations', () => {
    let teamName;
    before(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            teamName = team.name;
            Cypress._.times(2, (i) => {
                const newIncomingHook = {
                    channel_id: channel.id,
                    description: `Incoming webhook Test Description ${i}`,
                    display_name: `Test ${i}`,
                };
                cy.apiCreateWebhook(newIncomingHook);
            });
            Cypress._.times(2, (i) => {
                const newOutgoingHook = {
                    team_id: team.id,
                    display_name: `Test ${i} `,
                    trigger_words: [`test-trigger-${i}`],
                    callback_urls: ['https://mattermost.com'],
                };
                cy.apiCreateWebhook(newOutgoingHook, false);
            });
            Cypress._.times(2, (i) => {
                const slashCommand1 = {
                    description: `Test Slash Command ${i}`,
                    display_name: `Test ${i}`,
                    method: 'P',
                    team_id: team.id,
                    trigger: `trigger${i}`,
                    url: 'https://google.com',
                };
                cy.apiCreateCommand(slashCommand1);
            });
            Cypress._.times(2, () => {
                cy.apiCreateBot();
            });
            cy.visit(`/${teamName}/integrations`);
        });
    });
    it('MM-T571 Integration search gives feed back when there are no results', () => {
        cy.viewport('ipad-2');
        const results = 'Test';
        const noResults = `${getRandomId(6)}`;
        cy.get('#incomingWebhooks').click();
        cy.get('#searchInput').type(results).then(() => {
            cy.get('#emptySearchResultsMessage').should('not.exist');
        });
        cy.get('#searchInput').clear().type(noResults);
        cy.get('#emptySearchResultsMessage').contains(`No incoming webhooks match ${noResults}`);
        cy.get('#outgoingWebhooks').click();
        cy.get('#searchInput').type(results).then(() => {
            cy.get('#emptySearchResultsMessage').should('not.exist');
        });
        cy.get('#searchInput').clear().type(noResults);
        cy.get('#emptySearchResultsMessage').contains(`No outgoing webhooks match ${noResults}`);
        cy.get('#slashCommands').click();
        cy.get('#searchInput').type(results).then(() => {
            cy.get('#emptySearchResultsMessage').should('not.exist');
        });
        cy.get('#searchInput').clear().type(noResults);
        cy.get('#emptySearchResultsMessage').contains(`No commands match ${noResults}`);
        cy.get('#botAccounts').click();
        cy.get('#searchInput').type(results).then(() => {
            cy.get('#emptySearchResultsMessage').should('not.exist');
        });
        cy.get('#searchInput').clear().type(noResults);
        cy.get('#emptySearchResultsMessage').contains(`No bot accounts match ${noResults}`);
    });
});