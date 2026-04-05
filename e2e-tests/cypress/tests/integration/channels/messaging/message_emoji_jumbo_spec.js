const normalSize = '21px';
const jumboSize = '32px';
const testCases = [
    {message: 'This is a normal reply with emoji :smile:', emojiSize: normalSize},
    {message: ':smile:', emojiSize: jumboSize},
    {message: ':smile: :yum:', emojiSize: jumboSize},
];
function verifyLastPostStyle(expectedSize) {
    cy.getLastPostId().then((postId) => {
        const postMessageTextId = `#rhsPostMessageText_${postId}`;
        cy.get(`#rhsContainer .post-right__content ${postMessageTextId} span.emoticon`).each(($el) => {
            cy.wrap($el).as('message');
            cy.get('@message').should('have.css', 'height', expectedSize).and('have.css', 'width', expectedSize);
        });
    });
}
describe('Message', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
        });
    });
    it('MM-T162 Emojis show as jumbo in reply thread', () => {
        const messageText = 'This is a test message';
        cy.postMessage(messageText);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            testCases.forEach((testCase) => {
                cy.postMessageReplyInRHS(testCase.message);
                verifyLastPostStyle(testCase.emojiSize);
            });
        });
    });
});