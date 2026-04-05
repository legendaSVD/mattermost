describe('Compact view: Markdown quotation', () => {
    let testTeam;
    let userOne;
    let userTwo;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            userOne = user;
            cy.apiCreateUser().then(({user: user2}) => {
                userTwo = user2;
                cy.apiAddUserToTeam(team.id, userTwo.id);
            });
        });
    });
    it('MM-T185 Compact view: Markdown quotation', () => {
        cy.apiLogin(userOne);
        cy.apiCreateDirectChannel([userOne.id, userTwo.id]).then(() => {
            cy.visit(`/${testTeam.name}/messages/@${userTwo.username}`);
            cy.postMessage('Hello' + Date.now());
            cy.apiSaveMessageDisplayPreference('compact');
            resetRoot(testTeam, userOne, userTwo);
            const message = '>Hello' + Date.now();
            cy.postMessage(message);
            checkQuote(message);
            resetRoot(testTeam, userOne, userTwo);
            cy.postMessage('Hello' + Date.now());
            cy.postMessage(message);
            checkQuote(message);
        });
    });
    function resetRoot(team, user1, user2) {
        cy.apiLogout();
        cy.apiLogin(user2);
        cy.visit(`/${testTeam.name}/messages/@${user1.username}`);
        cy.postMessage('Hello' + Date.now());
        cy.apiLogout();
        cy.apiLogin(user1);
        cy.visit(`/${testTeam.name}/messages/@${user2.username}`);
    }
    function checkQuote(message) {
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId} > blockquote > p`).should('be.visible').and('have.text', message.slice(1));
            cy.findAllByTestId('postView').filter('.other--root').last().find('.user-popover').then((userElement) => {
                const userRect = userElement[0].getBoundingClientRect();
                cy.get(`#postMessageText_${postId}`).find('blockquote').then((quoteElement) => {
                    const blockQuoteRect = quoteElement[0].getBoundingClientRect();
                    expect(userRect.right < blockQuoteRect.left || userRect.bottom < blockQuoteRect.top).to.equal(true);
                });
            });
        });
    }
});