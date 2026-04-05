import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Interactive Menu - Action Button Error Handling', () => {
    let incomingWebhook;
    before(() => {
        cy.requireWebhookServer();
        cy.apiInitSetup().then(({team, channel}) => {
            const newIncomingHook = {
                channel_id: channel.id,
                channel_locked: true,
                description: 'Incoming webhook for action button error testing',
                display_name: 'actionErrorTest' + Date.now(),
            };
            cy.apiCreateWebhook(newIncomingHook).then((hook) => {
                incomingWebhook = hook;
            });
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-65023 should display error message when action button fails', () => {
        const payload = getPayloadWithErrorAction();
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload, waitFor: 'attachment-pretext'});
        cy.findByText('Error Button 1').should('be.visible');
        cy.findByText('Error Button 1').should('be.visible').click({force: true});
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('.has-error').should('be.visible');
        cy.get('.has-error .control-label').should('contain.text', 'Action integration error.');
    });
    it('MM-65023 should clear error message when successful action is triggered', () => {
        const payload = getPayloadWithErrorAndSuccess(Cypress.env().webhookBaseUrl);
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload, waitFor: 'attachment-pretext'});
        cy.findByText('Error Button').should('be.visible');
        cy.findByText('Success Button').should('be.visible');
        cy.findByText('Error Button').should('be.visible').click({force: true});
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('.has-error').should('be.visible');
        cy.get('.has-error .control-label').should('contain.text', 'Action integration error.');
        cy.findByText('Success Button').should('be.visible').click({force: true});
        cy.uiWaitUntilMessagePostedIncludes('a < a | b > a');
        cy.contains('.attachment', 'Action Button Error Clear Test - Error and Success')
            .find('.has-error').should('not.exist');
    });
    it('MM-65023 should display tooltip on action button hover', () => {
        const payload = getPayloadWithTooltip();
        cy.postIncomingWebhook({url: incomingWebhook.url, data: payload, waitFor: 'attachment-pretext'});
        cy.findByText('Button with Tooltip').should('be.visible');
        cy.findByText('Button with Tooltip').should('be.visible').trigger('mouseenter', {force: true});
        cy.get('.tooltipContainer').should('be.visible').and('contain.text', 'This is a helpful tooltip');
    });
});
function getPayloadWithErrorAction() {
    return {
        attachments: [{
            pretext: 'Action Button Error Test - Single Button',
            actions: [{
                name: 'Error Button 1',
                tooltip: 'This button will trigger an error',
                integration: {
                    url: 'http://invalid-url-test1.example.com/fail',
                    context: {
                        action: 'trigger_error_test1',
                    },
                },
            }],
        }],
    };
}
function getPayloadWithErrorAndSuccess(webhookBaseUrl) {
    return {
        attachments: [{
            pretext: 'Action Button Error Clear Test - Error and Success',
            actions: [{
                name: 'Error Button',
                tooltip: 'This button will trigger an error',
                integration: {
                    url: 'http://invalid-url-test2.example.com/fail',
                    context: {
                        action: 'trigger_error_test2',
                    },
                },
            }, {
                name: 'Success Button',
                tooltip: 'This button will work',
                integration: {
                    url: `${webhookBaseUrl}/slack_compatible_message_response`,
                    context: {
                        action: 'show_spoiler',
                        spoiler: 'a < a | b > a',
                        skipSlackParsing: true,
                    },
                },
            }],
        }],
    };
}
function getPayloadWithTooltip() {
    return {
        attachments: [{
            pretext: 'Action Button Tooltip Test',
            actions: [{
                name: 'Button with Tooltip',
                tooltip: 'This is a helpful tooltip',
                integration: {
                    url: 'http://localhost:3000/success',
                    context: {
                        action: 'tooltip_test',
                    },
                },
            }],
        }],
    };
}