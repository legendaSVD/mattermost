describe('Emoji reactions to posts/messages', () => {
    let userOne;
    let userTwo;
    let testTeam;
    const emoji = 'slightly_frowning_face';
    const otherEmoji = 'sweat_smile';
    beforeEach(() => {
        cy.apiAdminLogin().apiInitSetup().then(({team, user}) => {
            testTeam = team;
            userOne = user;
            cy.apiCreateUser().then((data) => {
                userTwo = data.user;
                cy.apiAddUserToTeam(testTeam.id, userTwo.id);
                cy.apiLogin(userOne);
                cy.visit(`/${testTeam.name}/channels/off-topic`);
                cy.postMessage('hello');
            });
        });
    });
    it('adding a reaction to a post is visible to another user in the channel', () => {
        cy.getLastPost().trigger('mouseover');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker(emoji);
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
        });
        cy.apiLogout();
        cy.apiLogin(userTwo);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
        });
    });
    it('another user adding to existing reaction increases reaction count', () => {
        cy.getLastPost().trigger('mouseover');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker(emoji);
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
        });
        cy.apiLogout().apiLogin(userTwo);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postReaction-${postId}-${emoji}`).click();
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '2').
                should('be.visible');
        });
    });
    it('a reaction added by current user has highlighted background color', () => {
        cy.getLastPost().trigger('mouseover');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker(emoji);
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
            cy.get(`#postReaction-${postId}-${emoji}`).
                should('be.visible').
                should('have.css', 'background-color').
                and('eq', 'rgba(28, 88, 217, 0.08)');
        });
    });
    it("can click another user's reaction to detract from it", () => {
        cy.getLastPost().trigger('mouseover');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker(emoji);
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
        });
        cy.apiLogout().apiLogin(userTwo);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postReaction-${postId}-${emoji}`).click();
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '2').
                should('be.visible');
        });
        cy.apiLogout().apiLogin(userOne);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#postReaction-${postId}-${emoji}`).click();
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
        });
    });
    it('can add a reaction to a post with an existing reaction', () => {
        cy.getLastPost().trigger('mouseover');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker(emoji);
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
        });
        cy.apiLogout().apiLogin(userTwo);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#addReaction-${postId}`).click({force: true});
            cy.get('#emojiPicker').should('be.visible');
            cy.clickEmojiInEmojiPicker(otherEmoji);
            cy.get('#emojiPicker').should('not.exist');
            cy.get(`#postReaction-${postId}-${otherEmoji}`).should('be.visible');
        });
    });
    it('can remove a reaction to a post with an existing reaction', () => {
        cy.getLastPost().trigger('mouseover');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker(emoji);
            cy.get(`#postReaction-${postId}-${emoji} .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker(otherEmoji);
            cy.get(`#postReaction-${postId}-${otherEmoji} .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#postReaction-${postId}-${otherEmoji}`).should('be.visible');
            cy.get(`#postReaction-${postId}-${otherEmoji}`).click();
            cy.get(`#postReaction-${postId}-${otherEmoji}`).should('not.exist');
        });
    });
});