import {getRandomId} from '../../../../utils';
import {checkboxesTitleToIdMap} from '../system_console/channel_moderation/constants';
import {enablePermission, goToSystemScheme, saveConfigForScheme} from '../system_console/channel_moderation/helpers';
describe('Integrations page', () => {
    const webhookBaseUrl = Cypress.env('webhookBaseUrl');
    let user1;
    let user2;
    let testChannelUrl1;
    let oauthClientID;
    let oauthClientSecret;
    const testApp = `Test${getRandomId()}`;
    before(() => {
        cy.apiRequireLicense();
        cy.requireWebhookServer();
        cy.apiUpdateConfig({ServiceSettings: {EnableOAuthServiceProvider: true}});
        cy.apiInitSetup().then(({team, user}) => {
            user1 = user;
            testChannelUrl1 = `/${team.name}/channels/town-square`;
            cy.apiCreateUser().then(({user: otherUser}) => {
                user2 = otherUser;
                cy.apiAddUserToTeam(team.id, user2.id);
            });
        });
        goToSystemScheme();
        enablePermission(checkboxesTitleToIdMap.ALL_USERS_MANAGE_OAUTH_APPLICATIONS);
        saveConfigForScheme();
    });
    it('MM-T646 OAuth 2.0 trusted', () => {
        cy.apiLogin(user1);
        cy.visit(testChannelUrl1);
        cy.uiOpenProductMenu('Integrations');
        cy.get('#oauthApps').click();
        cy.get('#addOauthApp').click();
        cy.findByText('Is Trusted').should('not.exist');
        cy.get('div.backstage-form > form > div:first').should('contain', 'Display Name');
    });
    it('MM-T647 Copy icon for OAuth 2.0 Applications', () => {
        cy.apiLogin(user1);
        cy.visit(testChannelUrl1);
        cy.uiOpenProductMenu('Integrations');
        cy.get('#oauthApps').click();
        cy.get('#addOauthApp').click();
        const randomApp = `Random${getRandomId()}`;
        cy.get('#name').type(randomApp);
        cy.get('#description').type(randomApp);
        cy.get('#homepage').type('https://www.test.com/');
        cy.get('#callbackUrls').type('https://www.test.com/');
        cy.get('#saveOauthApp').click();
        cy.get('.fa-copy').should('exist');
        cy.findByText('Client ID').parent().invoke('text').then((text) => {
            cy.wrap(text.substring(3)).as('clientID');
        });
        cy.get('#doneButton').click();
        cy.get('@clientID').then((clientID) => {
            const cId = clientID as unknown as string;
            cy.contains('.item-details', cId).within(() => {
                cy.contains('.item-details__token', 'Client ID').should('exist').within(() => {
                    cy.get('.fa-copy').should('exist');
                });
                cy.contains('.item-details__token', 'Client Secret').should('exist').within(() => {
                    cy.contains('***************').should('exist');
                    cy.get('.fa-copy').should('not.exist');
                });
                cy.findByText('Show Secret').click();
                cy.findByText('Hide Secret').should('exist');
                cy.findByText('Show Secret').should('not.exist');
                cy.contains('.item-details__token', 'Client Secret').should('exist').within(() => {
                    cy.contains('***************').should('not.exist');
                    cy.get('.fa-copy').should('exist');
                });
            });
        });
    });
    it('MM-T648_1 OAuth 2.0 Application - Setup', () => {
        cy.apiLogin(user1);
        cy.visit(testChannelUrl1);
        cy.uiOpenProductMenu('Integrations');
        cy.get('#oauthApps').click();
        cy.get('#addOauthApp').click();
        cy.get('#name').type(testApp);
        cy.get('#description').type(testApp);
        cy.get('#homepage').type('https://www.test.com/');
        cy.get('#callbackUrls').type(`${webhookBaseUrl}/complete_oauth`);
        cy.get('#saveOauthApp').click();
        cy.get('.fa-copy').should('exist');
        cy.findByText('Client ID').parent().invoke('text').then((text) => {
            cy.wrap(text.substring(11)).as('clientID');
        });
        cy.findByText('Client Secret').parent().invoke('text').then((text) => {
            cy.wrap(text.substring(15)).as('clientSecret');
        });
        cy.get('@clientID').then((clientID) => {
            oauthClientID = clientID;
            cy.get('@clientSecret').then((clientSecret) => {
                oauthClientSecret = clientSecret;
                cy.postIncomingWebhook({
                    url: `${webhookBaseUrl}/send_oauth_credentials`,
                    data: {
                        appID: clientID,
                        appSecret: clientSecret,
                    }});
            });
        });
        cy.get('#doneButton').click();
    });
    it('MM-T648_2 OAuth 2.0 Application - Exchange tokens', () => {
        cy.apiLogin(user1);
        cy.visit(`${webhookBaseUrl}/start_oauth`);
        cy.findByText('Allow').click();
        cy.findByText('OK').should('exist');
    });
    it('MM-T648_3 OAuth 2.0 Application - Post message using OAuth credentials', () => {
        cy.visit(testChannelUrl1);
        cy.getCurrentChannelId().then((channelId) => {
            const message = 'OAuth test 01';
            cy.postIncomingWebhook({
                url: `${webhookBaseUrl}/post_oauth_message`,
                data: {
                    channelId,
                    message,
                }});
            cy.findByText(message).should('exist');
        });
    });
    it('MM-T649 Edit Oauth 2.0 Application', () => {
        cy.apiLogin(user2);
        cy.visit(testChannelUrl1);
        cy.uiOpenProductMenu('Integrations');
        cy.get('#oauthApps').click();
        cy.get('.item-details').should('not.exist');
        cy.apiAdminLogin();
        cy.visit(testChannelUrl1);
        cy.uiOpenProductMenu('Integrations');
        cy.get('#oauthApps').click();
        cy.get('.item-details').should('be.visible');
        cy.contains('.item-details', oauthClientID).should('exist').within(() => {
            cy.get('.item-details__token').should('contain', oauthClientID);
            cy.findByText('Edit').should('exist').click();
        });
        cy.get('#description').invoke('val').then(($text) => {
            if (!(String($text)).match('Edited$')) {
                cy.get('#description').type('Edited');
            }
        });
        cy.get('#saveOauthApp').click({force: true});
        cy.contains('.item-details', oauthClientID).should('exist').within(() => {
            cy.findByText(`${testApp}Edited`).should('exist');
        });
        cy.visit(testChannelUrl1);
        cy.getCurrentChannelId().then((channelId) => {
            const message = 'OAuth test 02';
            cy.postIncomingWebhook({
                url: `${webhookBaseUrl}/post_oauth_message`,
                data: {
                    channelId,
                    message,
                }});
            cy.findByText(message).should('exist');
        });
    });
    it('MM-T650 Deauthorize OAuth 2.0 Application', () => {
        cy.apiLogin(user1);
        cy.visit(testChannelUrl1);
        cy.uiGetSetStatusButton().click();
        cy.get('#accountSettings').click();
        cy.get('#securityButton').click();
        cy.get('#appsEdit').click();
        cy.get(`[data-app="${oauthClientID}"]`).should('exist').click();
        cy.get(`[data-app="${oauthClientID}"]`).should('not.exist');
        cy.get('#accountSettingsHeader').within(() => {
            cy.get('button.close').click();
        });
        cy.getCurrentChannelId().then((channelId) => {
            const message = 'OAuth test 03';
            cy.postIncomingWebhook({
                url: `${webhookBaseUrl}/post_oauth_message`,
                data: {
                    channelId,
                    message,
                }});
            cy.findByText(message).should('not.exist');
        });
    });
    it('MM-T651_1 Reconnect OAuth 2.0 Application - Connect application', () => {
        cy.apiLogin(user1);
        cy.visit(`${webhookBaseUrl}/start_oauth`);
        cy.findByText('Allow').click();
        cy.findByText('OK').should('exist');
    });
    it('MM-T651_2 Reconnect OAuth 2.0 Application - Post message using OAuth credentials', () => {
        cy.apiLogin(user1);
        cy.visit(testChannelUrl1);
        cy.getCurrentChannelId().then((channelId) => {
            const message = 'OAuth test 04';
            cy.postIncomingWebhook({
                url: `${webhookBaseUrl}/post_oauth_message`,
                data: {
                    channelId,
                    message,
                }});
            cy.findByText(message).should('exist');
        });
    });
    it('MM-T652 Regenerate Secret', () => {
        cy.apiLogin(user1);
        cy.visit(testChannelUrl1);
        cy.uiOpenProductMenu('Integrations');
        cy.get('#oauthApps').click();
        cy.contains('.item-details', oauthClientID).within(() => {
            cy.findByText('Regenerate Secret').click();
            cy.contains('.item-details__token', 'Client Secret').within(() => {
                cy.get('strong').invoke('text').then((clientSecret) => {
                    expect(clientSecret).to.not.equal(oauthClientSecret);
                    oauthClientSecret = clientSecret;
                });
            });
        });
        cy.visit(testChannelUrl1);
        cy.getCurrentChannelId().then((channelId) => {
            const message = 'OAuth test 05';
            cy.postIncomingWebhook({
                url: `${webhookBaseUrl}/post_oauth_message`,
                data: {
                    channelId,
                    message,
                }});
            cy.findByText(message).should('exist');
        });
    });
    it('MM-T653 Unsuccessful reconnect with incorrect secret', () => {
        cy.apiLogin(user2);
        cy.visit(`${webhookBaseUrl}/start_oauth`, {failOnStatusCode: false});
        cy.findByText('Allow').click();
        cy.contains('Invalid client credentials.').should('exist');
    });
    it('MM-T654 Successful reconnect with updated secret', () => {
        cy.apiAdminLogin();
        cy.postIncomingWebhook({
            url: `${webhookBaseUrl}/send_oauth_credentials`,
            data: {
                appID: oauthClientID,
                appSecret: oauthClientSecret,
            }});
        cy.visit(`${webhookBaseUrl}/start_oauth`, {failOnStatusCode: false});
        cy.findByText('Allow').click();
        cy.findByText('OK').should('exist');
    });
    it('MM-T655 Delete OAuth 2.0 Application', () => {
        cy.apiLogin(user1);
        cy.visit(testChannelUrl1);
        cy.uiOpenProductMenu('Integrations');
        cy.get('#oauthApps').click();
        cy.contains('.item-details', oauthClientID).within(() => {
            cy.findByText('Delete').click();
        });
        cy.contains('#confirmModalButton', 'Yes, delete it').click();
        cy.visit(testChannelUrl1);
        cy.getCurrentChannelId().then((channelId) => {
            const message = 'OAuth test 06';
            cy.postIncomingWebhook({
                url: `${webhookBaseUrl}/post_oauth_message`,
                data: {
                    channelId,
                    message,
                }});
            cy.findByText(message).should('not.exist');
        });
    });
});