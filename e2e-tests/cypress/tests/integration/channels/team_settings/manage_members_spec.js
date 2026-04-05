import {
    promoteToChannelOrTeamAdmin,
} from '../enterprise/system_console/channel_moderation/helpers.ts';
describe('Manage Members', () => {
    let testTeam;
    let testUser;
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
        });
    });
    it('MM-T2331 System Admin can promote Member to Team Admin', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Manage members');
        cy.get(`#teamMembersDropdown_${testUser.username}`).should('be.visible').click();
        cy.get('li').contains('Make Team Admin').should('be.visible').click();
        cy.get(`#teamMembersDropdown_${testUser.username} span:contains(Team Admin)`).should('be.visible');
    });
    it('MM-T2334 Team Admin can promote Member to Team Admin', () => {
        promoteToChannelOrTeamAdmin(testUser.id, testTeam.id, 'teams');
        cy.apiCreateUser({prefix: 'nonAdminUser'}).then(({user}) => {
            cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                cy.apiLogin(testUser);
                cy.visit(`/${testTeam.name}/channels/town-square`);
                cy.uiOpenTeamMenu('Manage members');
                cy.get(`#teamMembersDropdown_${user.username}`).should('be.visible').click();
                cy.get('li').contains('Make Team Admin').should('be.visible').click();
                cy.get(`#teamMembersDropdown_${user.username} span:contains(Team Admin)`).should('be.visible');
            });
        });
    });
    it('MM-T2335 Remove a team member and ensure they cannot rejoin if the team is not joinable', () => {
        promoteToChannelOrTeamAdmin(testUser.id, testTeam.id, 'teams');
        cy.apiCreateUser({prefix: 'nonAdminUser'}).then(({user}) => {
            cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                cy.apiCreateTeam('other-team', 'Other Team').then(({team: otherTeam}) => {
                    cy.apiAddUserToTeam(otherTeam.id, user.id).then(() => {
                        cy.apiLogin(testUser);
                        cy.visit(`/${testTeam.name}/channels/town-square`);
                        cy.uiOpenTeamMenu('Manage members');
                        cy.get(`#teamMembersDropdown_${user.username}`).should('be.visible').click();
                        cy.get('li').contains('Remove from Team').should('be.visible').click();
                        cy.get(`#teamMembersDropdown_${user.username}`).should('not.exist');
                        cy.apiLogin(user);
                        cy.visit(`/${otherTeam.name}/channels/town-square`);
                        cy.uiGetLHSHeader().should('contain', otherTeam.display_name);
                        cy.visit(`/${testTeam.name}/channels/town-square`);
                        cy.url().should('include', '/error?type=team_not_found');
                    });
                });
            });
        });
    });
    it('MM-T2338 Remove a team member and ensure they can rejoin with invite link', () => {
        promoteToChannelOrTeamAdmin(testUser.id, testTeam.id, 'teams');
        cy.apiCreateUser({prefix: 'nonAdminUser'}).then(({user}) => {
            cy.apiAddUserToTeam(testTeam.id, user.id).then(() => {
                cy.apiLogin(testUser);
                cy.visit(`/${testTeam.name}/channels/town-square`);
                cy.uiOpenTeamMenu('Manage members');
                cy.get(`#teamMembersDropdown_${user.username}`).should('be.visible').click();
                cy.get('li').contains('Remove from Team').should('be.visible').click();
                cy.get(`#teamMembersDropdown_${user.username}`).should('not.exist');
                cy.get('#teamMembersModal').find('button.close').should('be.visible').click();
                cy.getInvitePeopleLink({user: testUser}).then((inviteLink) => {
                    cy.apiLogin(user);
                    cy.visit(`/${testTeam.name}/channels/town-square`);
                    cy.url().should('include', '/error?type=team_not_found');
                    cy.visit(inviteLink);
                    cy.uiGetLHSHeader().should('contain', testTeam.display_name);
                });
            });
        });
    });
});