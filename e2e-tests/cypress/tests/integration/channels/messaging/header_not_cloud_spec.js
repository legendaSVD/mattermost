import * as TIMEOUTS from '../../../fixtures/timeouts';
import {matterpollPlugin} from '../../../utils/plugins';
describe('Header', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiInitSetup().then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T1837_1 - DM channel with bot displays a normal header', () => {
        cy.apiCreateBot().then(({bot}) => {
            cy.uiAddDirectMessage().click();
            cy.get('.more-modal__list .more-modal__row');
            cy.get('#moreDmModal input').
                type(bot.username, {force: true}).
                type('{enter}', {force: true});
            cy.get('#selectItems').contains(bot.username);
            cy.get('#saveItems').click();
            cy.get('#channelHeaderInfo').should('be.visible');
            cy.get('#channelHeaderDescription > .header-description__text').find('p').should('have.text', bot.description);
        });
    });
    it('MM-T1837_2 - DM channel with bot from plugin displays a normal header', () => {
        cy.apiUploadAndEnablePlugin(matterpollPlugin);
        cy.uiAddDirectMessage().click().wait(TIMEOUTS.ONE_SEC);
        cy.findByRole('dialog', {name: 'Direct Messages'}).should('be.visible').wait(TIMEOUTS.ONE_SEC);
        cy.findByRole('combobox', {name: 'Search for people'}).
            typeWithForce('matterpoll').wait(TIMEOUTS.ONE_SEC).
            typeWithForce('{enter}');
        cy.get('#selectItems').contains('matterpoll');
        cy.get('#saveItems').click();
        cy.get('#channelHeaderInfo').should('be.visible');
        cy.get('#channelHeaderDescription > .header-description__text').find('p').should('have.text', 'Poll Bot');
    });
});