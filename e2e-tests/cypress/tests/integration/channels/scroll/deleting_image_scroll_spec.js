import {deletePostAndVerifyScroll, postListOfMessages, scrollCurrentChannelFromTop} from './helpers';
describe('Scroll', () => {
    let testChannelId;
    let testChannelLink;
    let mainUser;
    let otherUser;
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({user, team, channel}) => {
            mainUser = user;
            testChannelId = channel.id;
            testChannelLink = `/${team.name}/channels/${channel.name}`;
            cy.apiCreateUser().then(({user: user2}) => {
                otherUser = user2;
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannelId, otherUser.id);
                });
            });
        });
    });
    it('MM-T2373_1 Post list does not scroll when the offscreen-above post with image attachment is deleted', () => {
        cy.apiLogin(otherUser);
        cy.visit(testChannelLink);
        postMessageWithImageAttachment().then((attachmentPostId) => {
            postListOfMessages({sender: otherUser, channelId: testChannelId});
            cy.apiLogin(mainUser);
            cy.visit(testChannelLink);
            scrollCurrentChannelFromTop(0);
            scrollCurrentChannelFromTop('90%');
            deletePostAndVerifyScroll(attachmentPostId, {user: otherUser});
        });
    });
    it('MM-T2373_2 Post list does not scroll when the offscreen-below post with image attachment is deleted', () => {
        cy.apiLogin(otherUser);
        cy.visit(testChannelLink);
        postListOfMessages({sender: otherUser, channelId: testChannelId});
        postMessageWithImageAttachment().then((attachmentPostId) => {
            cy.apiLogin(mainUser);
            cy.visit(testChannelLink);
            scrollCurrentChannelFromTop('65%');
            deletePostAndVerifyScroll(attachmentPostId, {user: otherUser});
        });
    });
});
function postMessageWithImageAttachment() {
    cy.get('#fileUploadInput').attachFile('huge-image.jpg');
    cy.postMessage('Bla-bla-bla');
    return cy.getLastPostId();
}