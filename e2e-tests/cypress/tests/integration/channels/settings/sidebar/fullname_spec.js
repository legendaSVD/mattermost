import {getRandomId} from '../../../../utils';
describe('Settings > Sidebar > General', () => {
    const randomId = getRandomId();
    const newFirstName = `정트리나${randomId}/trina.jung/집단사무국(CO)`;
    let testUser;
    let otherUser;
    let offTopicUrl;
    before(() => {
        cy.apiInitSetup().then(({team, user, offTopicUrl: url}) => {
            testUser = user;
            offTopicUrl = url;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(team.id, otherUser.id);
            });
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
            cy.uiOpenProfileModal('Profile Settings');
            cy.get('#nameDesc').click();
            cy.get('#firstName').clear().type(newFirstName);
            cy.uiSave();
        });
    });
    it('MM-T183 Filtering by first name with Korean characters', () => {
        const {username} = testUser;
        cy.apiLogin(otherUser);
        cy.visit(offTopicUrl);
        cy.uiGetPostTextBox().clear().type(`@${newFirstName.substring(0, 11)}`);
        cy.uiVerifyAtMentionInSuggestionList({...testUser, first_name: newFirstName}, true);
        cy.uiGetPostTextBox().tab();
        cy.uiGetPostTextBox().should('have.value', `@${username} `);
        cy.uiGetPostTextBox().type('{enter}');
        cy.get(`[data-mention="${username}"]`).
            last().
            scrollIntoView().
            should('be.visible');
    });
});