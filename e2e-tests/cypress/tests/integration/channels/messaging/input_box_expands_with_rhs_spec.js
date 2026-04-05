import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getAdminAccount} from '../../../support/env';
describe('Messaging', () => {
    const admin = getAdminAccount();
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
            Cypress._.times(30, (i) => {
                cy.postMessageAs({sender: admin, message: `[${i}]`, channelId: channel.id});
            });
        });
    });
    it('MM-T208 Input box on main thread can expand with RHS open', () => {
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.clickPostCommentIcon();
        cy.get('#rhsCloseButton').should('exist');
        cy.uiGetPostTextBox().clear();
        cy.uiGetPostTextBox().then((post) => {
            cy.wrap(parseInt(post[0].clientHeight, 10)).as('previousHeight');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).scrollIntoView();
        });
        for (let i = 0; i < 13; i++) {
            cy.uiGetPostTextBox().type('{shift}{enter}');
            cy.uiGetPostTextBox().then((post) => {
                const height = parseInt(post[0].clientHeight, 10);
                cy.get('@previousHeight').should('be.lessThan', height);
                cy.wrap(height).as('previousHeight');
            });
        }
        cy.uiGetPostTextBox().type('{shift}{enter}');
        cy.uiGetPostTextBox().then((post) => {
            const height = parseInt(post[0].clientHeight, 10);
            cy.get('@previousHeight').should('equal', height);
        });
        cy.getNthPostId(-1).then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('be.visible');
        });
        cy.uiGetPostTextBox().clear();
        cy.getNthPostId(-29).then((postId) => {
            cy.get(`#postMessageText_${postId}`).scrollIntoView();
        });
        for (let i = 0; i < 14; i++) {
            cy.uiGetPostTextBox().type('{shift}{enter}');
        }
        cy.getNthPostId(-29).then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('be.visible');
        });
    });
});