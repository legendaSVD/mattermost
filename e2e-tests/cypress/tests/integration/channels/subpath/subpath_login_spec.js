describe('Cookie with Subpath', () => {
    let testUser;
    let townsquareLink;
    before(() => {
        cy.shouldRunWithSubpath();
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            cy.apiLogout().then(() => {
                townsquareLink = `/${team.name}/channels/town-square`;
                cy.visit(townsquareLink);
            });
        });
    });
    it('should generate cookie with subpath', () => {
        cy.url().then((url) => {
            cy.location().its('origin').then((origin) => {
                let subpath = '';
                if (url !== origin) {
                    subpath = url.replace(origin, '').replace(townsquareLink, '');
                }
                cy.get('.login-body-card').should('be.visible');
                cy.get('#input_loginId').should('be.visible').type(testUser.username);
                cy.get('#input_password-input').should('be.visible').type(testUser.password);
                cy.get('#saveSetting').should('be.visible').click();
                cy.get('#channel_view').should('be.visible');
                cy.url().should('include', subpath);
                cy.url().should('include', '/channels/town-square');
                cy.getCookies().should('have.length', 5).each((cookie) => {
                    if (subpath) {
                        expect(cookie).to.have.property('path', subpath);
                    } else {
                        expect(cookie).to.have.property('path', '/');
                    }
                });
            });
        });
    });
});