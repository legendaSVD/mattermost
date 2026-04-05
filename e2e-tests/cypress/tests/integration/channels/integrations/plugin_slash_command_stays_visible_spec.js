import {agendaPlugin} from '../../../utils/plugins';
describe('Integrations', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiInitSetup().then(({team, user, channel}) => {
            cy.apiUploadAndEnablePlugin(agendaPlugin);
            cy.apiLogin(user);
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T2835 Slash command help stays visible for plugin', () => {
        cy.get('#suggestionList').should('not.exist').then(() => {
            cy.findByTestId('post_textbox').type('/agenda ');
            cy.get('#suggestionList').should('be.visible');
        });
    });
});