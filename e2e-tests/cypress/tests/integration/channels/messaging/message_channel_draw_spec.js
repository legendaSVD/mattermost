import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
import {drawPlugin} from '../../../utils/plugins';
describe('M17448 Does not post draft message', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
            },
        });
        cy.apiUploadAndEnablePlugin(drawPlugin);
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
        });
    });
    it('on successful upload via "Draw" plugin', () => {
        const draft = `Draft message ${getRandomId()}`;
        cy.uiGetPostTextBox().clear().type(draft);
        cy.get('#fileUploadButton').click();
        cy.get('#fileUploadOptions').findByText('Draw').click();
        cy.get('canvas').trigger('pointerdown').trigger('pointerup').click();
        cy.findByText('Upload').should('be.visible').click();
        cy.uiGetPostTextBox().
            wait(TIMEOUTS.HALF_SEC).
            should('have.text', draft);
    });
    it('on upload cancel via "Draw" plugin', () => {
        const draft = `Draft message ${getRandomId()}`;
        cy.uiGetPostTextBox().clear().type(draft);
        cy.get('#fileUploadButton').click();
        cy.get('#fileUploadOptions').findByText('Draw').click();
        cy.findByText('Cancel').should('be.visible').click();
        cy.uiGetPostTextBox().
            wait(TIMEOUTS.HALF_SEC).
            should('have.text', draft);
    });
    it('on upload attempt via "Your Computer', () => {
        const draft = `Draft message ${getRandomId()}`;
        cy.uiGetPostTextBox().clear().type(draft);
        cy.get('#fileUploadButton').click();
        cy.get('#fileUploadOptions').findByText('Your computer').click();
        cy.uiGetPostTextBox().wait(TIMEOUTS.HALF_SEC).
            should('have.text', draft);
    });
});