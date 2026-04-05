import * as TIMEOUTS from '../../../fixtures/timeouts';
import {spyNotificationAs} from '../../../support/notification';
describe('Direct Message', () => {
    let testTeam;
    let testUser;
    let otherUser;
    let townsquareLink;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            townsquareLink = `/${team.name}/channels/town-square`;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
            });
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
        cy.visit(townsquareLink);
    });
    it('MM-T449 - Edit a direct message body', () => {
        const originalMessage = 'Hello';
        const editedMessage = 'Hello World';
        cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(({channel}) => {
            cy.postMessageAs({sender: testUser, message: originalMessage, channelId: channel.id}).wait(TIMEOUTS.HALF_SEC);
        }).apiLogout().wait(TIMEOUTS.HALF_SEC);
        cy.apiLogin(otherUser).then(() => {
            cy.visit(`/${testTeam.name}/messages/@${testUser.username}`);
            cy.getLastPostId().then((postId) => {
                const postText = `#postMessageText_${postId}`;
                cy.get(postText).should('have.text', originalMessage);
            });
        }).apiLogout().wait(TIMEOUTS.HALF_SEC);
        cy.apiLogin(testUser).then(() => {
            cy.visit(`/${testTeam.name}/messages/@${otherUser.username}`);
            cy.uiGetPostTextBox();
            cy.uiGetPostTextBox().clear().type('{uparrow}');
            cy.get('#edit_textbox').should('be.visible');
            cy.get('#edit_textbox').should('have.text', originalMessage).type(' World{enter}', {delay: 100});
            cy.get('#edit_textbox').should('not.exist');
            cy.getLastPostId().then((postId) => {
                const postEdited = `#postEdited_${postId}`;
                cy.get(postEdited).should('be.visible').and('have.text', 'Edited');
            });
        }).apiLogout().wait(TIMEOUTS.HALF_SEC);
        cy.apiLogin(otherUser).then(() => {
            cy.visit(`/${testTeam.name}/messages/@${testUser.username}`);
            cy.get('#sidebarItem_off-topic').
                scrollIntoView().
                find('#unreadMentions').
                should('not.exist');
            cy.getLastPostId().then((postId) => {
                const postText = `#postMessageText_${postId}`;
                const postEdited = `#postEdited_${postId}`;
                cy.get(postText).should('have.text', `${editedMessage} Edited`);
                cy.get(postEdited).should('be.visible');
            });
        }).apiLogout().wait(TIMEOUTS.HALF_SEC);
    });
    it('MM-T457 - Self direct message', () => {
        spyNotificationAs('withNotification', 'granted');
        cy.uiAddDirectMessage().click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#selectItems input').
            typeWithForce(testUser.username).
            wait(TIMEOUTS.HALF_SEC);
        cy.get(`#displayedUserName${testUser.username}`).should('be.visible');
        cy.get(`#displayedUserName${testUser.username}`).click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#channelHeaderTitle').should('contain', `${testUser.username} (you)`);
        cy.postMessage('todo list for today: 1,2,3');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('@withNotification').should('not.have.been.called');
    });
    it('MM-T458 - Edit direct message channel header', () => {
        cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(({channel}) => {
            cy.postMessageAs({sender: otherUser, message: 'Hello', channelId: channel.id}).wait(TIMEOUTS.HALF_SEC);
        });
        cy.visit(`/${testTeam.name}/messages/@${otherUser.username}`);
        cy.get('#channelHeaderTitle').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#channelEditHeader').click().wait(TIMEOUTS.HALF_SEC);
        const message = 'This is a line{shift}{enter}{shift}{enter}This is another line';
        const expectedMessage = 'This is a line\n\nThis is another line';
        cy.get('#edit_textbox').type(message).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.get('#channelHeaderDescription .header-description__text').trigger('mouseenter');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('.channel-header-text-popover').should('be.visible');
        cy.get('.channel-header-text-popover').should(($el) => {
            expect($el.get(0).innerText).to.eq(expectedMessage);
        });
    });
    it('MM-T1536 - Mute & Unmute', () => {
        cy.apiCreateDirectChannel([testUser.id, otherUser.id]).then(({channel}) => {
            cy.postMessageAs({sender: otherUser, message: 'Hello', channelId: channel.id}).wait(TIMEOUTS.HALF_SEC);
        });
        cy.visit(`/${testTeam.name}/messages/@${otherUser.username}`);
        cy.uiOpenChannelMenu('Mute');
        cy.uiGetLhsSection('DIRECT MESSAGES').find('.muted').first().should('contain', otherUser.username);
        cy.uiOpenChannelMenu('Unmute');
        cy.uiGetLhsSection('DIRECT MESSAGES').find('.muted').should('not.exist');
    });
});