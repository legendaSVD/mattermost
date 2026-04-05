describe('Search', () => {
    let testTeam;
    let testUser;
    let userOne;
    let userTwo;
    let userThree;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateUser({prefix: 'aaa'}).then(({user: user1}) => {
                userOne = user1;
                cy.apiAddUserToTeam(testTeam.id, userOne.id);
            });
            cy.apiCreateUser({prefix: 'bbb'}).then(({user: user2}) => {
                userTwo = user2;
                cy.apiAddUserToTeam(testTeam.id, userTwo.id);
            });
            cy.apiCreateUser({prefix: 'ccc'}).then(({user: user3}) => {
                userThree = user3;
                cy.apiAddUserToTeam(testTeam.id, userThree.id);
            });
            cy.apiLogin(testUser);
        });
    });
    it('S14673 - Search "in:[username]" returns results in GMs', () => {
        const groupMembers = [testUser, userOne, userTwo, userThree];
        cy.apiCreateGroupChannel(groupMembers.map((member) => member.id)).then(({channel}) => {
            cy.visit(`/${testTeam.name}/messages/${channel.name}`);
            const message = `hello${Date.now()}`;
            cy.postMessage(message);
            cy.uiGetSearchContainer().should('be.visible').click();
            cy.uiGetSearchBox().type('in:');
            const sortedUsernames = groupMembers.
                map((member) => member.username).
                sort((a, b) => a.localeCompare(b, 'en', {numeric: true}));
            cy.uiGetSearchBox().find('.suggestion-list__main').contains(sortedUsernames.join(',')).click();
            cy.uiGetSearchBox().type('{enter}');
            cy.uiGetSearchContainer().should('be.visible').click();
            cy.uiGetSearchBox().clear().type(`${message}{enter}`);
            cy.findAllByTestId('search-item-container').should('be.visible').and('have.length', 1).within(() => {
                cy.get('.search-channel__name').should('be.visible').and('have.text', sortedUsernames.filter((username) => username !== testUser.username).join(', '));
                cy.get('.search-highlight').should('be.visible').and('have.text', message);
            });
        });
    });
    it('Search "in:[username]" returns results file in GMs', () => {
        const groupMembers = [testUser, userOne, userTwo, userThree];
        cy.apiCreateGroupChannel(groupMembers.map((member) => member.id)).then(({channel}) => {
            cy.visit(`/${testTeam.name}/messages/${channel.name}`);
            cy.get('#advancedTextEditorCell').find('#fileUploadInput').attachFile('word-file.doc');
            cy.get('.post-image__thumbnail').should('be.visible');
            cy.uiGetPostTextBox().clear().type('{enter}');
            cy.uiGetSearchContainer().should('be.visible').click();
            cy.uiGetSearchBox().type('in:');
            const sortedUsernames = groupMembers.
                map((member) => member.username).
                sort((a, b) => a.localeCompare(b, 'en', {numeric: true}));
            cy.uiGetSearchBox().find('.suggestion-list__main').contains(sortedUsernames.join(',')).click();
            cy.uiGetSearchBox().type('word-file{enter}');
            cy.get('.files-tab').should('be.visible').click();
            cy.findAllByTestId('search-item-container').should('be.visible').and('have.length', 1).within(() => {
                cy.get('.Tag').should('be.visible').and('have.text', 'Group Message');
                cy.get('.fileDataName').should('be.visible').and('have.text', 'word-file.doc');
            });
        });
    });
});