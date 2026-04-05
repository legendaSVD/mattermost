describe('Channel users interactions', () => {
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
    it('MM-T216 Scroll to bottom when sending a message', () => {
        cy.get('#sidebarItem_off-topic').click({force: true});
        const message = `I\'m messaging!${'\n2'.repeat(30)}`;
        cy.postMessageAs({sender, message, channelId: testChannel.id});
        const hello = 'Hello';
        cy.postMessage(hello);
        cy.uiWaitUntilMessagePostedIncludes(hello);
        cy.get(`#sidebarItem_${testChannel.name}`).click({force: true});
        cy.findByTestId('NotificationSeparator').
            find('span').
            should('be.visible').
            and('have.text', 'New Messages');
        cy.uiGetPostTextBox().clear().type('message123{enter}');
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('have.text', 'message123');
        });
    });
});