import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Message permalink', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    let notInChannelUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
            cy.apiCreateUser({prefix: 'notinchannel'}).then(({user: user1}) => {
                notInChannelUser = user1;
                cy.apiAddUserToTeam(testTeam.id, notInChannelUser.id);
            });
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1630 - "Jump" to convo works every time for a conversation', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        let index = 0;
        for (index = 0; index < 25; index++) {
            cy.uiGetPostTextBox().clear().type(String(index)).type('{enter}');
        }
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().clear().type('in:town-square').wait(TIMEOUTS.HALF_SEC).type('{enter}{enter}');
        cy.get('.search-item__jump').first().click();
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', index - 1);
        });
        cy.getNthPostId(-index).then((postId) => {
            cy.get(`#post_${postId}`).scrollIntoView();
        });
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().clear().type('in:town-square').wait(TIMEOUTS.HALF_SEC).type('{enter}{enter}');
        cy.get('.search-item__jump').first().click();
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', index - 1);
        });
    });
    it('MM-T2222 - Channel shortlinking - ~ autocomplete', () => {
        const publicChannelName = 'town-square';
        const publicChannelDisplayName = 'Town Square';
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.uiGetPostTextBox().clear().type('~' + publicChannelName.substring(0, 3)).wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('be.visible').within(() => {
            cy.findByText(publicChannelDisplayName).should('be.visible');
        });
        cy.uiGetPostTextBox().type('{enter}{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', publicChannelDisplayName);
            cy.get('a.mention-link').click();
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', publicChannelDisplayName);
        });
    });
    it('MM-T2224 - Channel shortlinking - link joins public channel', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetPostTextBox().clear().type(`~${testChannel.display_name}`).wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').within(() => {
            cy.findByText(testChannel.display_name).should('be.visible');
        });
        cy.uiGetPostTextBox().
            type('{enter}').
            should('contain', testChannel.name).
            type('{enter}');
        cy.uiWaitUntilMessagePostedIncludes(testChannel.display_name);
        cy.apiLogout();
        cy.apiLogin(notInChannelUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('contain', `${testChannel.display_name}`);
            cy.get('a.mention-link').click();
            cy.get('#channelHeaderTitle').should('be.visible').should('contain', `${testChannel.display_name}`);
        });
    });
    it('MM-T2234 - Permalink - auto joins public channel', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.postMessage('Test');
        cy.getLastPostId().then((id) => {
            const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${id}`;
            cy.clickPostDotMenu(id);
            cy.uiClickCopyLink(permalink, id);
            cy.visit(`/${testTeam.name}/channels/town-square`);
            cy.visit(permalink);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`).should('contain', 'Test');
            });
        });
    });
    it('MM-T2236 - Permalink - does not auto join private channel', () => {
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel', 'P').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.postMessage('Test');
            cy.getLastPostId().then((id) => {
                const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${id}`;
                cy.clickPostDotMenu(id);
                cy.uiClickCopyLink(permalink, id);
                cy.visit(`/${testTeam.name}/channels/town-square`);
                cy.apiLogout();
                cy.apiLogin(testUser);
                cy.visit(permalink);
                cy.findByText('Permalink belongs to a deleted message or to a channel to which you do not have access.').should('be.visible');
            });
        });
    });
    it('MM-T3471 - Clicking/tapping channel URL link joins public channel', () => {
        let tempUser;
        cy.apiCreateUser({prefix: 'temp'}).then(({user: user1}) => {
            tempUser = user1;
            cy.apiAddUserToTeam(testTeam.id, tempUser.id);
            cy.apiLogout();
            cy.apiLogin(otherUser);
            cy.visit(`/${testTeam.name}/channels/off-topic`);
            cy.uiGetPostTextBox().clear().type(`${Cypress.config('baseUrl')}/${testTeam.name}/channels/${testChannel.name}`).type('{enter}');
            cy.apiLogout();
            cy.apiLogin(tempUser);
            cy.visit(`/${testTeam.name}/channels/off-topic`);
            cy.getLastPostId().then(() => {
                cy.get('a.markdown__link').click();
                cy.get('#channelHeaderTitle').should('be.visible').should('contain', `${testChannel.display_name}`);
            });
        });
    });
    it('MM-T5526 - Non-channel-admin users can use message links in private channels', () => {
        let tempUser;
        let privateChannel;
        let permalink;
        let testMessagePostId;
        const postMessage = 'This is posted for non-channel-admins';
        cy.apiCreateChannel(testTeam.id, 'private', 'Private', 'P').then(({channel}) => {
            privateChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${privateChannel.name}`);
        });
        cy.postMessage(postMessage);
        cy.getLastPostId().then((id) => {
            testMessagePostId = id;
            permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${id}`;
            cy.postMessage(permalink);
        });
        cy.apiCreateUser({prefix: 'temp'}).then(({user: user1}) => {
            tempUser = user1;
            cy.apiAddUserToTeam(testTeam.id, tempUser.id);
            cy.apiAddUserToChannel(privateChannel.id, tempUser.id);
            cy.apiLogout();
            cy.apiLogin(tempUser);
            cy.visit(`/${testTeam.name}/channels/${privateChannel.name}`);
            cy.get('div.attachment--permalink').click();
            cy.url().should('contain', testMessagePostId);
            cy.get(`#post_${testMessagePostId}.post--highlight`).should('be.visible');
        });
    });
});