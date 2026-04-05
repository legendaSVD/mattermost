import {getRandomId} from '../../../utils';
describe('Multi Team and DM', () => {
    let testChannel;
    let testTeam;
    let testUser;
    const unique = `${getRandomId(4)}`;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            Cypress._.times(4, () => {
                cy.apiCreateUser({prefix: 'common'}).then(() => {
                    cy.apiAddUserToTeam(testTeam.id, user.id);
                });
            });
            Cypress._.times(2, () => {
                cy.apiCreateUser({prefix: unique}).then(() => {
                    cy.apiAddUserToTeam(testTeam.id, user.id);
                });
            });
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        });
    });
    it('MM-T444 DM More... show user count', () => {
        cy.uiAddDirectMessage().click();
        cy.get('#multiSelectHelpMemberInfo > :nth-child(2)').then((number) => {
            const totalUsers = number.text().split(' ').slice(2, 3);
            cy.findByRole('combobox', {name: 'Search for people'}).typeWithForce(unique).then(() => {
                cy.get('#multiSelectList').within(() => {
                    cy.get('.more-modal__details').should('have.length', 2);
                });
                cy.get('#multiSelectHelpMemberInfo').should('contain', 'Use ↑↓ to browse, ↵ to select. You can add 7 more people. ').should('contain', `2 of ${totalUsers} members`);
            });
        });
    });
});