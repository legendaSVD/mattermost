import {demoPlugin} from '../../../utils';
describe('Link tooltips', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        const newSettings = {
            PluginSettings: {
                Enable: true,
            },
            ServiceSettings: {
                EnableGifPicker: true,
            },
            FileSettings: {
                EnablePublicLink: true,
            },
        };
        cy.apiUpdateConfig(newSettings);
        cy.apiUploadAndEnablePlugin(demoPlugin);
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T3422 fade in and out with an animation', () => {
        const url = 'www.test.com';
        cy.postMessage(url);
        cy.uiWaitUntilMessagePostedIncludes(url);
        cy.findByText(url).should('exist').focus();
        cy.findByText('This is a custom tooltip from the Demo Plugin').should('be.visible');
        cy.get('body').type('{esc}');
    });
});