import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('unreads channels', () => {
    let adminUser: Cypress.UserProfile;
    let otherUser: Cypress.UserProfile;
    const numOfTeams = 3;
    const createdTeams: Cypress.Team[] = [];
    const createdChannels: Cypress.Channel[] = [];
    before(() => {
        cy.apiInitSetup({promoteNewUserAsAdmin: true}).then(({user: admin, team, channel}) => {
            adminUser = admin;
            cy.apiCreateUser({prefix: 'other'}).then(({user: testUser}) => {
                otherUser = testUser;
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, otherUser.id);
                    cy.apiLogin(adminUser);
                    Cypress._.times(numOfTeams, (i) => {
                        cy.apiCreateTeam(`team-${i}`, `team-${i}`).then(({team: newTeam}) => {
                            createdTeams.push(newTeam);
                            cy.apiCreateChannel(newTeam.id, `channel-${i}`, `channel-${i}`).then(({channel: newChannel}) => {
                                createdChannels.push(newChannel);
                                cy.apiAddUserToTeam(newTeam.id, otherUser.id).then(() => {
                                    cy.apiAddUserToChannel(newChannel.id, otherUser.id);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    beforeEach(() => {
        cy.apiLogin(otherUser);
    });
    it('Check unreads on each team\'s channel', () => {
        cy.visit(`/${createdTeams[0].name}/channels/${createdChannels[0].name}`);
        cy.get('#teamSidebarWrapper').should('be.visible');
        Cypress._.times(numOfTeams, (i) => {
            cy.get(`#${createdTeams[i].name}TeamButton`, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
            cy.get('#SidebarContainer').should('be.visible').within(() => {
                cy.findByText(createdChannels[i].display_name).should('be.visible').click();
            });
            cy.findByTestId('post_textbox').should('not.be.disabled');
        });
    });
});