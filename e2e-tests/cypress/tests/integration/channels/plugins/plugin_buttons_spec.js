import * as TIMEOUTS from '../../../fixtures/timeouts';
import {demoPlugin, testPlugin} from '../../../utils/plugins';
describe('collapse on 15 plugin buttons', () => {
    let testTeam;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
        });
        cy.apiUninstallAllPlugins();
    });
    it('MM-T1649 Greater than 15 plugin buttons collapse to one icon in top nav', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.apiUploadAndEnablePlugin(testPlugin).then(() => {
            cy.wait(TIMEOUTS.TWO_SEC);
            cy.get('.channel-header__icon').its('length').then((icons) => {
                cy.apiUploadAndEnablePlugin(demoPlugin).then(() => {
                    cy.wait(TIMEOUTS.TWO_SEC);
                    const maxPluginHeaderCount = 15;
                    cy.get('.channel-header__icon').should('have.length', icons - (maxPluginHeaderCount - 1));
                    cy.get('#pluginCount').should('have.text', maxPluginHeaderCount + 1);
                    cy.get('#pluginChannelHeaderButtonDropdown').click();
                    cy.get('ul.dropdown-menu.channel-header_plugin-dropdown').should('exist');
                    cy.apiDisablePluginById(demoPlugin.id).then(() => {
                        cy.wait(TIMEOUTS.TWO_SEC);
                        cy.get('.channel-header__icon').should('have.length', icons);
                    });
                });
            });
        });
    });
});