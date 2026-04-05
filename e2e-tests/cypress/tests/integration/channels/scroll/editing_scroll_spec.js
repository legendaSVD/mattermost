import * as TIMEOUTS from '../../../fixtures/timeouts';
import {postListOfMessages, scrollCurrentChannelFromTop} from './helpers';
describe('Scroll', () => {
    let firstPostBeforeScroll;
    let lastPostBeforeScroll;
    let testChannelId;
    let testChannelLink;
    let otherUser;
    const multilineString = `A
    multiline
    message`;
    const newMultilineMessage = `This
    is
    a new
    multiline
    message`;
    before(() => {
        cy.apiCreateUser().then(({user}) => {
            otherUser = user;
        });
        cy.apiInitSetup().then(({team, channel}) => {
            testChannelId = channel.id;
            testChannelLink = `/${team.name}/channels/${channel.name}`;
            cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                cy.apiAddUserToChannel(testChannelId, otherUser.id);
                cy.visit(testChannelLink);
            });
        });
    });
    it('MM-T2371 Post list does not scroll when the offscreen post is edited', () => {
        cy.postMessageAs({sender: otherUser, message: multilineString, channelId: testChannelId});
        cy.getLastPostId().then((postId) => {
            const multilineMessageID = postId;
            postListOfMessages({sender: otherUser, channelId: testChannelId});
            scrollCurrentChannelFromTop('100%');
            cy.get('.post-message__text:visible').first().then((postMessage) => {
                firstPostBeforeScroll = postMessage.text();
            });
            cy.get('.post-message__text:visible').last().then((postMessage) => {
                lastPostBeforeScroll = postMessage.text();
            });
            cy.externalRequest({user: otherUser, method: 'PUT', path: `posts/${multilineMessageID}`, data: {id: multilineMessageID, message: newMultilineMessage}});
            cy.wait(TIMEOUTS.FIVE_SEC);
            cy.get('.post-message__text:visible').first().then((firstPostAfterScroll) => {
                expect(firstPostAfterScroll.text()).equal(firstPostBeforeScroll);
            });
            cy.get('.post-message__text:visible').last().then((lastPostAfterScroll) => {
                expect(lastPostAfterScroll.text()).equal(lastPostBeforeScroll);
            });
        });
    });
});