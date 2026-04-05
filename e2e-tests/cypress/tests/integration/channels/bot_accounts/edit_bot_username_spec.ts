import {Team} from '@mattermost/types/teams';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Edit bot username', () => {
    let team: Team;
    before(() => {
        cy.apiInitSetup().then((out) => {
            team = out.team;
        });
    });
    it('MM-T2923 Edit bot username.', () => {
        cy.visit('/admin_console/integrations/bot_accounts');
        cy.findByTestId('ServiceSettings.EnableBotAccountCreationtrue', {timeout: TIMEOUTS.ONE_MIN}).should('be.checked');
        goToCreateBot();
        const initialBotName = `bot-${getRandomId()}`;
        cy.get('#username').clear().type(initialBotName);
        cy.get('#displayName').clear().type('Test Bot');
        cy.get('#saveBot').click();
        cy.get('#doneButton').click();
        cy.get('.backstage-list__item').contains('.backstage-list__item', initialBotName).as('botEntry');
        cy.get('@botEntry').then((el) => {
            const editLink = el.find('.item-actions>a');
            if (editLink.text() === 'Edit') {
                cy.wrap(editLink).click();
                cy.get('#username').should('have.value', initialBotName);
                cy.get('#displayName').should('have.value', 'Test Bot');
                cy.get('#description').should('have.value', '');
                const newBotName = `bot-${getRandomId()}`;
                cy.get('#username').clear().type(newBotName);
                cy.get('#saveBot').click();
                return cy.wrap(newBotName);
            }
            return cy.wrap(null);
        }).then((newBotName) => {
            cy.get('.backstage-list__item').contains('.backstage-list__item', newBotName).as('newbotEntry');
            cy.get('@newbotEntry').then((el) => {
                cy.wrap(el).scrollIntoView();
            });
        });
    });
    it('MM-T1838 Bot naming convention is enforced', () => {
        goToCreateBot();
        tryUsername('be', NAMING_WARNING_STANDARD);
        tryUsername('@be', NAMING_WARNING_STANDARD);
        tryUsername('abe.', NAMING_WARNING_ENDING_PERIOD);
        const validBotName = `abe-the-bot-${getRandomId()}`;
        tryUsername(validBotName);
    });
    const NAMING_WARNING_STANDARD = 'Usernames have to begin with a lowercase letter and be 3-22 characters long. You can use lowercase letters, numbers, periods, dashes, and underscores.';
    const NAMING_WARNING_ENDING_PERIOD = 'Bot usernames cannot have a period as the last character';
    function tryUsername(name: string, warningMessage?: string) {
        cy.get('#username').clear().type(name);
        cy.get('#saveBot').click();
        if (warningMessage) {
            cy.get('.backstage-form__footer .has-error').should('have.text', warningMessage);
        } else {
            cy.url().
                should('include', `/${team.name}/integrations/confirm`).
                should('match', /token=[a-zA-Z0-9]{26}/);
            cy.get('div.backstage-form').
                should('include.text', 'Setup Successful').
                and('include.text', name).
                and((confirmation) => {
                    expect(confirmation.text()).to.match(/Token: [a-zA-Z0-9]{26}/);
                });
            goToCreateBot();
        }
    }
    function goToCreateBot() {
        cy.visit(`/${team.name}/integrations/bots`);
        cy.get('#addBotAccount', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
    }
});