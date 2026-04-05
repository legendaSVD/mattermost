describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup().then(({team, channel, user: testUser}) => {
            cy.apiCreateUser().then(({user: otherUser}) => {
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, otherUser.id).then(() => {
                        cy.apiLogin(testUser);
                        cy.visit(`/${team.name}/messages/@${otherUser.username}`);
                        cy.get('#channelIntro').should('be.visible').
                            and('contain', `This is the start of your direct message history with ${otherUser.username}.`);
                        cy.postMessage('Test');
                    });
                });
            });
        });
    });
    it('MM-T133 Visual verification of tooltips on post hover menu', () => {
        cy.getLastPostId().then((postId) => {
            verifyToolTip(postId, `#CENTER_flagIcon_${postId}`, 'Save Message');
            verifyToolTip(postId, `#CENTER_reaction_${postId}`, 'Add Reaction');
            verifyToolTip(postId, `#CENTER_commentIcon_${postId}`, 'Reply');
        });
    });
    function verifyToolTip(postId, targetElement, label) {
        cy.get(`#post_${postId}`).trigger('mouseover');
        cy.get(targetElement).trigger('mouseenter', {force: true});
        cy.findByText(label).should('be.visible');
        cy.get(targetElement).trigger('mouseleave', {force: true});
        cy.findByText(label).should('not.exist');
    }
});