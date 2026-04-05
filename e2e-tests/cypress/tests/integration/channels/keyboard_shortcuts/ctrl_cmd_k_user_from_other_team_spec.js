describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().
            then(({user, team}) => cy.
                wrap(user).as('mainUser').
                wrap(team).as('mainTeam'),
            );
        cy.apiInitSetup().
            then(({user, team}) => cy.
                wrap(user).as('otherUser').
                wrap(team).as('otherTeam'),
            );
    });
    it('MM-T1228_1 CTRL/CMD+K - Open DM with user not on the current team / with ANY', function() {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictDirectMessage: 'any',
            },
        });
        cy.apiLogin(this.mainUser);
        verifyUserIsFoundAndDMOpensOnClick(this.otherUser);
    });
    it('MM-T1228_2 CTRL/CMD+K - Open DM with user not on the current team / with TEAM', function() {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictDirectMessage: 'team',
            },
        });
        cy.apiLogin(this.mainUser);
        cy.visit('/');
        cy.typeCmdOrCtrl().type('K', {release: true});
        cy.findByRole('combobox', {name: 'quick switch input'}).type(this.otherUser.username);
        cy.findByTestId(this.otherUser.username).should('not.exist');
    });
    it('MM-T1228_3 CTRL/CMD+K - Open DM with user belonging to both teams / with ANY', function() {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictDirectMessage: 'any',
            },
        });
        cy.apiAddUserToTeam(this.mainTeam.id, this.otherUser.id);
        cy.apiLogin(this.mainUser);
        verifyUserIsFoundAndDMOpensOnClick(this.otherUser);
    });
    it('MM-T1228_4 CTRL/CMD+K - Open DM with user belonging to both teams / with TEAM', function() {
        cy.apiUpdateConfig({
            TeamSettings: {
                RestrictDirectMessage: 'team',
            },
        });
        cy.apiAddUserToTeam(this.mainTeam.id, this.otherUser.id);
        cy.apiLogin(this.mainUser);
        verifyUserIsFoundAndDMOpensOnClick(this.otherUser);
    });
});
function verifyUserIsFoundAndDMOpensOnClick(user) {
    cy.visit('/');
    cy.typeCmdOrCtrl().type('K', {release: true});
    cy.findByRole('combobox', {name: 'quick switch input'}).type(user.username);
    cy.findByTestId(user.username).should('be.visible');
    cy.findByTestId(user.username).click();
    cy.get('#channelHeaderTitle').should('contain', user.username);
}