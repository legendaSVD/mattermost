describe('Emoji reactions to posts/messages in GM channels', () => {
    let userOne;
    let userTwo;
    let testTeam;
    let testGroupChannel;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            userOne = user;
            cy.apiCreateUser().then((data) => {
                userTwo = data.user;
                cy.apiAddUserToTeam(testTeam.id, userTwo.id);
                cy.apiCreateGroupChannel([userOne.id, userTwo.id]).then(({channel}) => {
                    testGroupChannel = channel;
                });
                cy.apiLogin(userOne);
                cy.visit(`/${testTeam.name}/channels/town-square`);
            });
        });
    });
    it('MM-T471 add a reaction to a message in a GM', () => {
        cy.visit(`/${testTeam.name}/messages/${testGroupChannel.name}`);
        cy.postMessage('This is a post');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker('slightly_frowning_face');
            cy.get(`#postReaction-${postId}-slightly_frowning_face .Reaction__number--display`).
                should('have.text', '1').
                should('be.visible');
        });
        cy.getLastPostId().then((postId) => {
            cy.findByLabelText('Add a reaction').should('not.be.visible');
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.get('#channelIntro').click();
            cy.findByLabelText('Add a reaction').should('not.be.visible');
            cy.viewport('iphone-6');
            cy.findByLabelText('Add a reaction').scrollIntoView().should('be.visible');
        });
    });
});