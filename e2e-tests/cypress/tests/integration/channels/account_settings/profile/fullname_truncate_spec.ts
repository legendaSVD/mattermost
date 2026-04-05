import {getRandomId} from '../../../../utils';
describe('Profile > Profile Settings> Full Name', () => {
    let firstUser;
    let secondUser;
    const firstName = 'This Is a Long Name';
    const lastName = 'That Should Truncate';
    before(() => {
        cy.apiInitSetup().then(({team, user, offTopicUrl}) => {
            firstUser = user;
            cy.apiCreateUser().then(({user: user1}) => {
                secondUser = user1;
                cy.apiAddUserToTeam(team.id, secondUser.id);
                cy.apiLogin(firstUser);
                cy.visit(offTopicUrl);
            });
        });
    });
    it('MM-T2046 Full Name - Truncated in popover', () => {
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#nameDesc').click();
        cy.get('#firstName').clear().type(firstName);
        cy.get('#lastName').clear().type(lastName);
        cy.get('#saveSetting').click();
        cy.contains('#nameDesc', `${firstName} ${lastName}`);
        cy.uiClose();
    });
    it('MM-T2047 Truncated in popover (visual verification)', () => {
        cy.postMessage(`this is a test message ${getRandomId()}`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).should('be.visible');
            cy.get(`#post_${postId} img`).click();
            cy.get('div.user-profile-popover').should('be.visible');
            cy.get('button.closeButtonRelativePosition').click();
            cy.findByTestId(`popover-fullname-${firstUser.username}`).should('have.css', 'text-overflow', 'clip');
        });
    });
    it('MM-T2048 Empty full name: @ still displays before username', () => {
        cy.uiOpenTeamMenu('View members');
        cy.get('.modal-title').should('be.visible');
        cy.get('#searchUsersInput').should('be.visible').type(secondUser.nickname);
        cy.contains('button.user-popover', `@${secondUser.username}`);
    });
});