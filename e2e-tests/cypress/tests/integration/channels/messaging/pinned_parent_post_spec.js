describe('Messaging', () => {
    let testTeam;
    let testChannel;
    let receiver;
    let sender;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            receiver = user;
            testTeam = team;
            testChannel = channel;
            cy.apiCreateUser().then(({user: user1}) => {
                sender = user1;
                cy.apiAddUserToTeam(testTeam.id, sender.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, sender.id);
                });
            });
            cy.apiLogin(receiver);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.postMessage('Hello');
        });
    });
    it('MM-T123 Pinned parent post: reply count remains in center channel and is correct', () => {
        cy.apiLogin(sender);
        cy.reload();
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.get(`#CENTER_commentIcon_${postId}`).click({force: true});
            for (let i = 0; i < 5; i++) {
                cy.uiGetReplyTextBox().click().should('be.visible').type(`Hello to you too ${i}`);
                cy.uiGetReply().should('be.enabled').click();
            }
            cy.get('#rhsCloseButton').click();
            cy.uiClickPostDropdownMenu(postId, 'Pin to Channel');
            cy.get(`#post_${postId}`).findByText('Pinned').should('exist');
            cy.get(`#CENTER_commentIcon_${postId}`).find('span').eq(0).find('span').eq(1).should('have.text', '5');
        });
    });
});