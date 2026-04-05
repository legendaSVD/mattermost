import {Team} from '@mattermost/types/teams';
import * as MESSAGES from '../../../fixtures/messages';
import {getRandomId} from '../../../utils';
describe('Edit bot', () => {
    let testTeam: Team;
    before(() => {
        cy.apiInitSetup().then(({team, townSquareUrl}) => {
            testTeam = team;
            cy.visit(townSquareUrl);
            cy.postMessage('hello');
        });
    });
    it('MM-T1840 Description allows for special character', () => {
        const userName = `bot-${getRandomId()}`;
        const description = MESSAGES.LARGE.concat('!@#$%&*');
        createBot(userName, testTeam.name);
        cy.get('.backstage-list__item').contains('.backstage-list__item', userName).as('botEntry');
        cy.get('@botEntry').then((el) => {
            const editLink = el.find('.item-actions>a');
            if (editLink.text() === 'Edit') {
                cy.wrap(editLink).click();
                cy.get('#username').should('have.value', userName);
                cy.get('#displayName').should('have.value', '');
                cy.get('#description').should('have.value', '');
                cy.get('#description').clear().type(description);
                cy.get('#saveBot').click();
            }
        });
        cy.get('@botEntry').then((el) => {
            cy.wrap(el).scrollIntoView();
            cy.wrap(el.find('.bot-details__description')).should('have.text', description);
        });
    });
    function createBot(userName, teamName) {
        cy.uiOpenProductMenu('Integrations');
        cy.get('a.integration-option[href$="/bots"]').click();
        cy.get('#addBotAccount').click();
        cy.get('#username').type(userName);
        cy.get('#saveBot').click();
        cy.url().
            should('include', `/${teamName}/integrations/confirm`).
            should('match', /token=[a-zA-Z0-9]{26}/);
        cy.get('div.backstage-form').
            should('include.text', 'Setup Successful').
            should((confirmation) => {
                expect(confirmation.text()).to.match(/Token: [a-zA-Z0-9]{26}/);
            });
        cy.get('#doneButton').click();
    }
});