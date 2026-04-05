import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let testTeam;
    let testUser;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
    });
    it('MM-T1665_1 Deactivated user is not shown in Direct Messages modal when no previous conversation', () => {
        cy.apiCreateUser().then(({user: deactivatedUser}) => {
            cy.apiAddUserToTeam(testTeam.id, deactivatedUser.id);
            cy.externalActivateUser(deactivatedUser.id, false);
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/town-square`);
            cy.uiAddDirectMessage().click().wait(TIMEOUTS.ONE_SEC);
            cy.findByRole('dialog', {name: 'Direct Messages'}).should('be.visible').wait(TIMEOUTS.ONE_SEC);
            cy.findByRole('combobox', {name: 'Search for people'}).typeWithForce(deactivatedUser.email);
            cy.get('.no-channel-message').should('be.visible').and('contain', 'No results found matching');
        });
    });
    it('MM-T1665_2 Deactivated user is shown in Direct Messages modal when had previous conversation', () => {
        cy.apiCreateUser().then(({user: deactivatedUser}) => {
            cy.apiAddUserToTeam(testTeam.id, deactivatedUser.id);
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/messages/@${deactivatedUser.username}`);
            cy.postMessage(`Hello ${deactivatedUser.username}`);
            cy.externalActivateUser(deactivatedUser.id, false);
            cy.uiAddDirectMessage().click();
            cy.get('#moreDmModal').should('be.visible').contains('Direct Messages');
            cy.get('#selectItems input').should('be.focused').typeWithForce(deactivatedUser.email);
            cy.get('#moreDmModal .more-modal__row--selected').should('be.visible').
                and('contain', deactivatedUser.username).
                and('contain', 'Deactivated');
        });
    });
    it('MM-T5669 Navigating DM list using Up/Down arrow keys scrolls it', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiAddDirectMessage().click().wait(TIMEOUTS.ONE_SEC);
        cy.get('#moreDmModal').should('be.visible').contains('Direct Messages');
        cy.get('#multiSelectList').then((dmList) => {
            const dmListBottom = dmList[0].getBoundingClientRect().bottom;
            cy.get('#multiSelectList>div').each((listItem, index, listItems) => {
                const itemBottom = listItem[0].getBoundingClientRect().bottom;
                if (itemBottom > dmListBottom) {
                    for (let i = 0; i <= index; i++) {
                        cy.get('#moreDmModal').trigger('keydown', {key: 'ArrowDown'});
                    }
                    cy.wrap(listItem).should('be.visible');
                    for (let i = 0; i <= index; i++) {
                        cy.get('#moreDmModal').trigger('keydown', {key: 'ArrowUp'});
                    }
                    cy.wrap(listItems[0]).should('be.visible');
                    return false;
                }
                return listItems;
            });
        });
    });
});