import {verifyPostNextToNewMessageSeparator} from './helpers';
describe('Mark DM post as Unread ', () => {
    beforeEach(function() {
        cy.apiAdminLogin().
            apiCreateUser().
            its('user').as('userA').
            apiInitSetup().
            then(({user, team}) => cy.
                apiAddUserToTeam(team.id, this.userA.id).
                apiCreateDirectChannel([user.id, this.userA.id]).its('channel').as('dmChannel').
                wrap(user).as('mainUser').
                wrap(team).as('team').
                wrap(`/${team.name}/messages/@${this.userA.username}`).as('link'),
            );
    });
    it('MM-T248_1 Mark DM post as Unread', function() {
        const NUMBER_OF_USER_A_UNREAD_MESSAGES = 4;
        cy.postMessageAs({
            sender: this.mainUser,
            message: 'Initial message',
            channelId: this.dmChannel.id,
        });
        cy.postListOfMessages({
            numberOfMessages: 3,
            sender: this.userA,
            channelId: this.dmChannel.id,
        });
        cy.postMessageAs({
            sender: this.userA,
            message: 'Unread from here',
            channelId: this.dmChannel.id,
        }).as('unreadFromHere');
        cy.postListOfMessages({
            numberOfMessages: NUMBER_OF_USER_A_UNREAD_MESSAGES - 1,
            sender: this.userA,
            channelId: this.dmChannel.id,
        });
        cy.postListOfMessages({
            numberOfMessages: 3,
            sender: this.mainUser,
            channelId: this.dmChannel.id,
        });
        cy.apiLogin(this.mainUser).visit(this.link);
        cy.then(() => cy.uiClickPostDropdownMenu(this.unreadFromHere.id, 'Mark as Unread'));
        cy.then(() => verifyPostNextToNewMessageSeparator(this.unreadFromHere.data.message));
        cy.then(() => verifyChannelIsMarkedUnreadInLHS(this.userA.username, {
            numberOfUnreadMessages: NUMBER_OF_USER_A_UNREAD_MESSAGES,
        }));
        cy.get('.SidebarChannel:contains(Off-Topic)').click();
        cy.then(() => verifyChannelIsMarkedUnreadInLHS(this.userA.username, {
            numberOfUnreadMessages: NUMBER_OF_USER_A_UNREAD_MESSAGES,
        }));
        cy.get(`.SidebarChannel:contains(${this.userA.username})`).click();
        cy.then(() => verifyChannelIsMarkedReadInLHS(this.userA.username));
        cy.then(() => verifyPostNextToNewMessageSeparator(this.unreadFromHere.data.message));
    });
    it('MM-T248_2 Mark DM post as Unread in a reply thread', function() {
        const NUMBER_OF_USER_A_UNREAD_MESSAGES = 4;
        cy.postMessageAs({
            sender: this.mainUser,
            message: 'Initial message',
            channelId: this.dmChannel.id,
        }).as('root');
        cy.then(() => cy.postListOfMessages({
            numberOfMessages: 3,
            sender: this.userA,
            channelId: this.dmChannel.id,
            rootId: this.root.id,
        }));
        cy.then(() => cy.postMessageAs({
            sender: this.userA,
            message: 'Unread from here',
            channelId: this.dmChannel.id,
            rootId: this.root.id,
        })).as('unreadFromHere');
        cy.then(() => cy.postListOfMessages({
            numberOfMessages: NUMBER_OF_USER_A_UNREAD_MESSAGES - 1,
            sender: this.userA,
            channelId: this.dmChannel.id,
            rootId: this.root.id,
        }));
        cy.then(() => cy.postListOfMessages({
            numberOfMessages: 3,
            sender: this.mainUser,
            channelId: this.dmChannel.id,
            rootId: this.root.id,
        }));
        cy.apiLogin(this.mainUser).visit(this.link);
        cy.get('@root').its('id').then(cy.clickPostCommentIcon);
        cy.then(() => cy.uiClickPostDropdownMenu(this.unreadFromHere.id, 'Mark as Unread', 'RHS_COMMENT'));
        cy.then(() => verifyPostNextToNewMessageSeparator(this.unreadFromHere.data.message));
        cy.then(() => verifyChannelIsMarkedUnreadInLHS(this.userA.username, {
            numberOfUnreadMessages: NUMBER_OF_USER_A_UNREAD_MESSAGES,
        }));
        cy.get('.SidebarChannel:contains(Off-Topic)').click();
        cy.then(() => verifyChannelIsMarkedUnreadInLHS(this.userA.username, {
            numberOfUnreadMessages: NUMBER_OF_USER_A_UNREAD_MESSAGES,
        }));
        cy.get(`.SidebarChannel:contains(${this.userA.username})`).click();
        cy.then(() => verifyChannelIsMarkedReadInLHS(this.userA.username));
        cy.then(() => verifyPostNextToNewMessageSeparator(this.unreadFromHere.data.message));
    });
});
function verifyChannelIsMarkedUnreadInLHS(channelName, {numberOfUnreadMessages}) {
    cy.
        get('.SidebarChannelGroup_content').
        contains(channelName).
        parent().
        should('have.class', 'unread').
        find('.badge').
        should('contain.text', numberOfUnreadMessages);
}
function verifyChannelIsMarkedReadInLHS(channelName) {
    cy.
        get('.SidebarChannelGroup_content').
        contains(channelName).
        parent().
        should('not.have.class', 'unread').
        find('.badge').
        should('not.exist');
}