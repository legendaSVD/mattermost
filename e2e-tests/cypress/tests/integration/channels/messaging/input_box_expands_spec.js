describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel, user}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
            Cypress._.times(30, (i) => {
                cy.postMessageAs({sender: user, message: `[${i}]`, channelId: channel.id});
            });
        });
    });
    it('MM-T207 Input box on main thread can expand with RHS closed', () => {
        cy.get('body').then((body) => {
            if (body.find('rhsCloseButton').length) {
                cy.get('#rhsCloseButton').click({force: true});
            }
        });
        cy.get('#rhsCloseButton').should('not.exist');
        cy.uiGetPostTextBox().clear();
        cy.uiGetPostTextBox().then((post) => {
            cy.wrap(parseInt(post[0].clientHeight, 10)).as('previousHeight');
        });
        cy.getLastPostId().then((postId) => {
            cy.get(`#postMessageText_${postId}`).scrollIntoView();
        });
        for (let i = 0; i < 15; i++) {
            cy.uiGetPostTextBox().type('{shift}{enter}');
            cy.uiGetPostTextBox().then((post) => {
                const height = parseInt(post[0].clientHeight, 10);
                cy.get('@previousHeight').should('be.most', height);
                cy.wrap(height).as('previousHeight');
            });
        }
        cy.uiGetPostTextBox().type('{shift}{enter}');
        cy.uiGetPostTextBox().then((post) => {
            const height = parseInt(post[0].clientHeight, 10);
            cy.get('@previousHeight').should('equal', height);
        });
        cy.getNthPostId(-1).then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('be.visible');
        });
        cy.uiGetPostTextBox().clear();
        cy.getNthPostId(-29).then((postId) => {
            cy.get(`#postMessageText_${postId}`).scrollIntoView();
        });
        for (let i = 0; i < 15; i++) {
            cy.uiGetPostTextBox().type('{shift}{enter}');
        }
        cy.getNthPostId(-29).then((postId) => {
            cy.get(`#postMessageText_${postId}`).should('be.visible');
        });
    });
});