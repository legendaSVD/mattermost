import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {
    enableUsernameAndIconOverrideInt,
    enableUsernameAndIconOverride,
} from '../incoming_webhook/helpers';
describe('Outgoing webhook', () => {
    const triggerWord = 'text';
    const messageWithTriggerWord = 'text with some more text';
    const callbackUrl = `${Cypress.env().webhookBaseUrl}/post_outgoing_webhook`;
    const noChannelSelectionOption = '--- Select a channel ---';
    const overrideIconUrl = 'http://via.placeholder.com/150/00F/888';
    const defaultUsername = 'webhook';
    const overriddenUsername = 'user-overridden';
    const defaultIcon = 'webhook_icon.jpg';
    const overriddenIcon = 'webhook_override_icon.png';
    let sysadmin;
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    let siteName;
    let offTopicUrl;
    let testChannelUrl;
    before(() => {
        cy.apiGetConfig().then(({config}) => {
            siteName = config.TeamSettings.SiteName;
        });
        cy.apiGetMe().then(({user}) => {
            sysadmin = user;
        });
        cy.requireWebhookServer();
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnablePostUsernameOverride: false,
                EnablePostIconOverride: false,
            },
        });
        cy.apiInitSetup().then((out) => {
            testTeam = out.team;
            testChannel = out.channel;
            testUser = out.user;
            offTopicUrl = out.offTopicUrl;
            testChannelUrl = out.channelUrl;
        });
        cy.apiCreateUser().then(({user: user1}) => {
            otherUser = user1;
            cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        });
    });
    it('MM-T584 default username and profile pic Trigger = posting anything in the specified channel', () => {
        cy.apiAdminLogin();
        enableUsernameAndIconOverride(true);
        cy.visit(testChannelUrl);
        cy.postMessage('hello');
        setOutgoingWebhook(testTeam.name, siteName, {callbackUrl, channelSelect: testChannel.display_name});
        cy.url().should('include', testChannelUrl);
        postMessageInChannel(testUser, testChannelUrl, Date.now());
        verifyProfileNameAndIcon({username: defaultUsername, userIcon: defaultIcon});
        postMessageInChannel(testUser, testChannelUrl, Date.now());
        verifyProfileNameAndIcon({username: defaultUsername, userIcon: defaultIcon});
    });
    it('MM-T2035 default username and overridden profile pic (using command) Trigger = posting a trigger word in any channel', () => {
        cy.visit(testChannelUrl);
        cy.postMessage('hello');
        setOutgoingWebhook(testTeam.name, siteName, {callbackUrl, triggerWord, channelSelect: testChannel.display_name});
        cy.url().should('include', testChannelUrl);
        cy.apiAdminLogin();
        enableUsernameAndIconOverrideInt(false, true);
        cy.visit(testChannelUrl);
        editOutgoingWebhook(testTeam.name, siteName, {iconUrl: overrideIconUrl, channelSelect: noChannelSelectionOption});
        cy.url().should('include', testChannelUrl);
        postMessageInChannel(testUser, testChannelUrl, messageWithTriggerWord);
        verifyProfileNameAndIcon({username: sysadmin.username, userIcon: overriddenIcon});
        cy.visit(offTopicUrl);
        postMessageInChannel(testUser, offTopicUrl, messageWithTriggerWord);
        verifyProfileNameAndIcon({username: sysadmin.username, userIcon: overriddenIcon});
    });
    it('MM-T2036 overridden username and profile pic (using Mattermost UI)', () => {
        cy.visit(testChannelUrl);
        cy.postMessage('hello');
        setOutgoingWebhook(testTeam.name, siteName, {callbackUrl, triggerWord});
        cy.url().should('include', testChannelUrl);
        cy.apiAdminLogin();
        enableUsernameAndIconOverride(true);
        cy.visit(testChannelUrl);
        editOutgoingWebhook(testTeam.name, siteName, {username: overriddenUsername, iconUrl: overrideIconUrl});
        cy.url().should('include', testChannelUrl);
        postMessageInChannel(testUser, offTopicUrl, messageWithTriggerWord);
        verifyProfileNameAndIcon({username: overriddenUsername, userIcon: overriddenIcon});
    });
    it('MM-T2037 Outgoing Webhooks - overridden username and profile pic from webhook', () => {
        const usernameFromWebhook = 'user_from_webhook';
        const newCallbackUrl = callbackUrl + '?override_username=' + usernameFromWebhook + '&override_icon_url=' + overrideIconUrl;
        cy.visit(testChannelUrl);
        cy.postMessage('hello');
        setOutgoingWebhook(testTeam.name, siteName, {callbackUrl: newCallbackUrl, triggerWord});
        cy.url().should('include', testChannelUrl);
        cy.apiAdminLogin();
        enableUsernameAndIconOverride(true);
        cy.visit(testChannelUrl);
        editOutgoingWebhook(testTeam.name, siteName, {callbackUrl: newCallbackUrl, withConfirmation: true});
        cy.url().should('include', testChannelUrl);
        postMessageInChannel(testUser, offTopicUrl, messageWithTriggerWord);
        verifyProfileNameAndIcon({username: usernameFromWebhook, userIcon: overriddenIcon});
        postMessageInChannel(otherUser, testChannelUrl, messageWithTriggerWord);
        verifyProfileNameAndIcon({username: usernameFromWebhook, userIcon: overriddenIcon});
    });
    it('MM-T2038 Bot posts as a comment/reply', () => {
        const newCallbackUrl = callbackUrl + '?response_type=comment';
        cy.visit(testChannelUrl);
        cy.postMessage('hello');
        setOutgoingWebhook(testTeam.name, siteName, {callbackUrl: newCallbackUrl, triggerWord});
        cy.url().should('include', testChannelUrl);
        editOutgoingWebhook(testTeam.name, siteName, {callbackUrl: newCallbackUrl, withConfirmation: true});
        cy.url().should('include', testChannelUrl);
        postMessageInChannel(testUser, offTopicUrl, messageWithTriggerWord);
        cy.getLastPost().should('contain', 'comment');
    });
    it('MM-T2039 Outgoing Webhooks - Reply to bot post', () => {
        const secondMessage = 'some text';
        cy.visit(testChannelUrl);
        cy.postMessage('hello');
        setOutgoingWebhook(testTeam.name, siteName, {callbackUrl, triggerWord});
        cy.url().should('include', testChannelUrl);
        postMessageInChannel(testUser, offTopicUrl, messageWithTriggerWord);
        cy.postMessage(secondMessage);
        cy.getNthPostId(-2).then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.uiGetRHS();
            cy.postMessageReplyInRHS('A reply to the webhook post');
            cy.wait(TIMEOUTS.HALF_SEC);
        });
        cy.uiGetPostHeader().contains('Commented on ' + sysadmin.username + '\'s message: #### Outgoing Webhook Payload');
    });
    it('MM-T2040 Disable overriding username and profile pic in System Console', () => {
        cy.visit(testChannelUrl);
        cy.postMessage('hello');
        setOutgoingWebhook(testTeam.name, siteName, {callbackUrl, triggerWord});
        cy.url().should('include', testChannelUrl);
        cy.apiAdminLogin();
        enableUsernameAndIconOverride(true);
        enableUsernameAndIconOverride(false);
        postMessageInChannel(testUser, offTopicUrl, messageWithTriggerWord);
        verifyProfileNameAndIcon({username: sysadmin.username, userId: sysadmin.id});
    });
});
function postMessageInChannel(user, channelUrl, message) {
    cy.apiLogin(user);
    cy.visit(channelUrl);
    cy.postMessage(message);
    cy.uiWaitUntilMessagePostedIncludes('#### Outgoing Webhook Payload');
}
function setOutgoingWebhook(teamName, siteName, {callbackUrl, channelSelect, triggerWord}) {
    cy.uiOpenProductMenu('Integrations');
    cy.url().should('include', `${teamName}/integrations`);
    cy.get('.backstage-sidebar').should('be.visible').findByText('Outgoing Webhooks').click();
    cy.url().should('include', `${teamName}/integrations/outgoing_webhooks`);
    cy.findByText('Add Outgoing Webhook').click();
    cy.url().should('include', `${teamName}/integrations/outgoing_webhooks/add`);
    cy.get('.backstage-form').should('be.visible').within(() => {
        cy.get('#displayName').type('Webhook Title');
        cy.get('#description').type('Webhook Description');
        if (triggerWord) {
            cy.get('#triggerWords').type(triggerWord);
        }
        if (channelSelect) {
            cy.get('#channelSelect').select(channelSelect);
        }
        cy.get('#callbackUrls').type(callbackUrl);
        cy.findByText('Save').scrollIntoView().should('be.visible').click();
    });
    cy.findByText('Done').click();
    cy.url().should('include', `${teamName}/integrations/outgoing_webhooks`);
    cy.findByText(`Back to ${siteName}`).click();
}
function editOutgoingWebhook(teamName, siteName, {username, iconUrl, callbackUrl, channelSelect, withConfirmation}) {
    cy.uiOpenProductMenu('Integrations');
    cy.get('.backstage-sidebar').should('be.visible').findByText('Outgoing Webhooks').click();
    cy.get('.item-actions > a > span').click();
    cy.url().should('include', `${teamName}/integrations/outgoing_webhooks/edit`);
    cy.get('.backstage-form').should('be.visible').within(() => {
        if (username) {
            cy.get('#username').type(username);
        }
        if (iconUrl) {
            cy.get('#iconURL').scrollIntoView().type(iconUrl);
        }
        if (channelSelect) {
            cy.get('#channelSelect').select(channelSelect);
        }
        if (callbackUrl) {
            cy.get('#callbackUrls').type(callbackUrl);
        }
        cy.get('#saveWebhook').click().wait(TIMEOUTS.ONE_SEC);
    });
    if (withConfirmation) {
        cy.get('#confirmModalButton').should('be.visible').click();
    }
    cy.findByText(`Back to ${siteName}`).click();
}
function verifyProfileNameAndIcon({username, userIcon, userId}) {
    cy.uiGetPostHeader().findByText(username);
    if (userIcon) {
        cy.uiGetPostProfileImage().
            find('img').
            invoke('attr', 'src').
            then((url) => cy.request({url, encoding: 'base64'})).
            then(({status, body}) => {
                cy.fixture(userIcon).then((imageData) => {
                    expect(status).to.equal(200);
                    expect(body).to.eq(imageData);
                });
            });
    }
    if (userId) {
        cy.uiGetPostProfileImage().
            find('img').
            should('have.attr', 'src').
            and('include', `/api/v4/users/${userId}/image?_=`);
    }
}