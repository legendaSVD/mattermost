import {Team} from '@mattermost/types/teams';
import {getRandomId} from '../../../utils';
import * as TIMEOUTS from '../../../fixtures/timeouts';
export function createBotInteractive(team: Team, username = `bot-${getRandomId()}`) {
    cy.visit(`/${team.name}/integrations/bots`);
    cy.get('#addBotAccount').click();
    cy.get('#username').type(username);
    cy.get('#displayName').type('Test Bot');
    cy.get('#saveBot').click();
    cy.url({timeout: TIMEOUTS.ONE_MIN}).
        should('include', `/${team.name}/integrations/confirm`).
        should('match', /token=[a-zA-Z0-9]{26}/);
    cy.get('div.backstage-form').
        should('include.text', 'Setup Successful').
        should((confirmation) => {
            expect(confirmation.text()).to.match(/Token: [a-zA-Z0-9]{26}/);
        });
    return cy.get('div.backstage-form').invoke('text');
}