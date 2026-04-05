import {deletePostAndVerifyScroll, postListOfMessages, scrollCurrentChannelFromTop} from './helpers';
describe('Scroll', () => {
    let testChannelId;
    let testChannelLink;
    let otherUser;
    const multilineString = `A
    multiline
    message`;
    before(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            testChannelId = channel.id;
            testChannelLink = `/${team.name}/channels/${channel.name}`;
            cy.apiCreateUser().then(({user: user2}) => {
                otherUser = user2;
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannelId, otherUser.id);
                });
            });
            cy.visit(testChannelLink);
        });
    });
    it('MM-T2372 Post list does not scroll when the offscreen post is deleted', () => {
        cy.postMessageAs({sender: otherUser, message: multilineString, channelId: testChannelId});
        cy.getLastPostId().then((multilineMessageID) => {
            postListOfMessages({sender: otherUser, channelId: testChannelId});
            scrollCurrentChannelFromTop('100%');
            deletePostAndVerifyScroll(multilineMessageID, {user: otherUser});
        });
    });
});