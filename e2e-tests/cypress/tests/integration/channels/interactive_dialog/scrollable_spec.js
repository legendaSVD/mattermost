const webhookUtils = require('../../../../utils/webhook_utils');
let createdCommand;
let userAndChannelDialog;
describe('Interactive Dialog - Apps Form', () => {
    before(() => {
        cy.requireWebhookServer();
        cy.apiSaveTeammateNameDisplayPreference('username');
        cy.apiCreateTeam('test-team', 'Test Team').then(({team}) => {
            for (let i = 0; i < 20; i++) {
                cy.apiCreateChannel(team.id, `channel-${i}`, `Channel ${i}`);
            }
            cy.visit(`/${team.name}`);
            const webhookBaseUrl = Cypress.env().webhookBaseUrl;
            const command = {
                auto_complete: false,
                description: 'Test for user and channel dialog',
                display_name: 'Dialog with user and channel',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'user_and_channel_dialog',
                url: `${webhookBaseUrl}/user_and_channel_dialog_request`,
                username: '',
            };
            cy.apiCreateCommand(command).then(({data}) => {
                createdCommand = data;
                userAndChannelDialog = webhookUtils.getUserAndChannelDialog(createdCommand.id, webhookBaseUrl);
            });
        });
    });
    afterEach(() => {
        cy.reload();
    });
    it('MM-T2498 - Individual "User" and "Channel" screens are scrollable', () => {
        cy.get('#appsModal').should('not.exist');
        cy.postMessage(`/${createdCommand.trigger} `);
        cy.get('#appsModal').should('be.visible').within(() => {
            cy.get('.modal-header').should('be.visible').within(($elForm) => {
                cy.get('#appsModalIconUrl').should('be.visible').and('have.attr', 'src').and('not.be.empty');
                cy.get('#appsModalLabel').should('be.visible').and('have.text', userAndChannelDialog.dialog.title);
                cy.wrap($elForm).find('button.close').should('be.visible').and('contain', '×').and('contain', 'Close');
            });
            cy.get('.modal-body').should('be.visible').children('.form-group').should('have.length', 2).each(($elForm, index) => {
                const element = userAndChannelDialog.dialog.elements[index];
                cy.wrap($elForm).find('label').first().scrollIntoView().should('be.visible').and('contain', element.display_name);
                cy.wrap($elForm).find('[id^=\'MultiInput_\']').should('be.visible');
                cy.wrap($elForm).find('[id^=\'MultiInput_\']').click();
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__menu').should('be.visible');
                    cy.wrap(doc).find('.react-select__option').should('have.length.greaterThan', 0);
                });
                if (index === 0) {
                    expect(element.name).to.equal('someuserselector');
                    cy.document().then((doc) => {
                        cy.wrap(doc).find('.react-select__option').first().should('exist');
                        cy.wrap($elForm).find('[id^=\'MultiInput_\']').find('input').type('{uparrow}', {force: true});
                        cy.wrap($elForm).find('[id^=\'MultiInput_\']').find('input').type('{downarrow}'.repeat(10), {force: true});
                        cy.wrap(doc).find('.react-select__option').first().then(($firstOption) => {
                            expect($firstOption.length).to.be.greaterThan(0);
                        });
                        cy.wrap($elForm).find('[id^=\'MultiInput_\']').find('input').type('{uparrow}'.repeat(10), {force: true});
                        cy.wrap(doc).find('.react-select__option').first().should('exist');
                    });
                } else if (index === 1) {
                    expect(element.name).to.equal('somechannelselector');
                    cy.document().then((doc) => {
                        cy.wrap(doc).find('.react-select__option').first().should('exist');
                        cy.wrap($elForm).find('[id^=\'MultiInput_\']').find('input').type('{uparrow}', {force: true});
                        cy.wrap($elForm).find('[id^=\'MultiInput_\']').find('input').type('{downarrow}'.repeat(10), {force: true});
                        cy.wrap(doc).find('.react-select__option').first().then(($firstOption) => {
                            expect($firstOption.length).to.be.greaterThan(0);
                        });
                        cy.wrap($elForm).find('[id^=\'MultiInput_\']').find('input').type('{uparrow}'.repeat(10), {force: true});
                        cy.wrap(doc).find('.react-select__option').first().should('exist');
                    });
                }
                cy.document().then((doc) => {
                    cy.wrap(doc).find('.react-select__option').first().click({force: true});
                });
                if (element.help_text) {
                    cy.wrap($elForm).find('.help-text').should('exist').and('contain', element.help_text);
                }
            });
            cy.get('.modal-footer').should('be.visible').within(($elForm) => {
                cy.wrap($elForm).find('#appsModalCancel').should('be.visible').and('have.text', 'Cancel');
                cy.wrap($elForm).find('#appsModalSubmit').should('be.visible').and('have.text', userAndChannelDialog.dialog.submit_label);
            });
            cy.get('.modal-header').should('be.visible').within(($elForm) => {
                cy.wrap($elForm).find('button.close').should('be.visible').click();
            });
            cy.get('#appsModal').should('not.exist');
        });
    });
});