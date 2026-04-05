import {demoPlugin, jiraPlugin} from '../../../utils/plugins';
describe('Integrations', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiUploadAndEnablePlugin(demoPlugin);
        cy.apiUploadAndEnablePlugin(jiraPlugin);
        cy.apiInitSetup().then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T2829 Test an example of plugin that uses sub commands', () => {
        cy.uiGetPostTextBox().clear().type('/jira ');
        cy.get('#suggestionList').findByText('info').scrollIntoView().should('be.visible');
        cy.uiGetPostTextBox().type('inf');
        cy.get('#suggestionList').should('be.visible').children().should('have.length', 1);
        cy.get('#suggestionList').findByText('info').should('be.visible');
        cy.get('#suggestionList').findByText('info').should('be.visible').click();
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).
                should('contain.text', '(Only visible to you)').
                should('contain.text', 'is not a valid Mattermost SITEURL.');
        });
    });
    it('MM-T2830 Test an example of a plugin using static list', () => {
        cy.uiGetPostTextBox().clear().type('/jira ');
        cy.get('#suggestionList').should('contain.text', 'instance').scrollIntoView().should('be.visible');
        cy.uiGetPostTextBox().type('i');
        cy.get('#suggestionList').should('be.visible').children().
            should('contain.text', 'issue').
            should('contain.text', 'instance').
            should('contain.text', 'info');
        cy.uiGetPostTextBox().clear().type('/jira instance settings ');
        cy.get('#suggestionList').should('contain.text', 'notifications').scrollIntoView().should('be.visible');
        cy.uiGetPostTextBox().type('notifications ');
        cy.get('#suggestionList').should('be.visible').children().
            should('contain.text', 'on').
            should('contain.text', 'off');
        cy.uiGetPostTextBox().type('{downarrow}{downarrow}{enter}');
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).
                should('contain.text', '(Only visible to you)').
                should('contain.text', 'is not a valid Mattermost SITEURL.');
        });
    });
    it('MM-T2831 Test an example of plugin using dynamic list', () => {
        cy.uiGetPostTextBox().clear().type('/autocomplete_test dynamic-arg ');
        cy.get('#suggestionList').should('be.visible').children().
            should('contain.text', 'suggestion 1 (hint)').
            should('contain.text', 'suggestion 2 (hint)');
        cy.uiGetPostTextBox().type('{downarrow}{downarrow}{enter}');
        cy.uiGetPostTextBox().type('{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).
                should('contain.text', '(Only visible to you)').
                should('contain.text', 'Executed command: /autocomplete_test dynamic-arg suggestion 2');
        });
    });
    it('MM-T2832 Use a slash command that omits the optional argument', () => {
        cy.uiGetPostTextBox().clear().type('/autocomplete_test optional-arg {enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).contains('Executed command: /autocomplete_test optional-arg');
        });
    });
    it('MM-T2833 Use a slash command that accepts an optional argument', () => {
        cy.uiGetPostTextBox().clear().type('/autocomplete_test optional-arg --name1 testarg {enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).contains('Executed command: /autocomplete_test optional-arg --name1 testarg');
        });
    });
    it('MM-T2834 Slash command help stays visible for system slash command', () => {
        cy.uiGetPostTextBox().type('/rename');
        cy.get('#suggestionList').should('be.visible').children().should('have.length', 1);
        cy.get('#suggestionList').children().eq(0).findByText('Rename the channel').should('be.visible');
        cy.uiGetPostTextBox().type(' ');
        cy.findByText('Rename the channel').should('not.exist');
        cy.get('#suggestionList').should('be.visible').children().should('have.length', 2);
        cy.get('#suggestionList').children().eq(0).findByText('Execute Current Command').should('be.visible');
        cy.get('.slash-command__desc').contains('[text]').should('be.visible');
    });
    it('MM-T2835 Slash command help stays visible for plugin', () => {
        cy.uiGetPostTextBox().clear().type('/jira ');
        cy.get('#suggestionList').should('be.visible').children().should('have.length', 11);
    });
});