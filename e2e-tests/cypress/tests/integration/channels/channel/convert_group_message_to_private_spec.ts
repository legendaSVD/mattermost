import {Channel} from '@mattermost/types/channels';
import {Team, TeamMembership} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
describe('Group Message Conversion To Private Channel', () => {
    let testTeam1: Team;
    let testTeam2: Team;
    let testUser1: UserProfile;
    let testUser2: UserProfile;
    let testUser3: UserProfile;
    let gm: Channel;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam1 = team;
            testUser1 = user;
            cy.apiCreateTeam('gmconversionteam2', 'GM Conversion Team 2').then(({team: team2}) => {
                testTeam2 = team2;
                cy.apiCreateUser({prefix: 'other'}).then(({user: user2}) => {
                    testUser2 = user2;
                    cy.apiCreateUser({prefix: 'other'}).then(({user: user3}) => {
                        testUser3 = user3;
                        const teamMembers1 = [testUser1, testUser2, testUser3].map((u) => ({team_id: testTeam1.id, user_id: u.id}));
                        cy.apiAddUsersToTeam(testTeam1.id, teamMembers1 as TeamMembership[]).then(() => {
                            const teamMembers2 = [testUser1, testUser2, testUser3].map((u) => ({team_id: testTeam2.id, user_id: u.id}));
                            cy.apiAddUsersToTeam(testTeam2.id, teamMembers2 as TeamMembership[]).then(() => {
                                cy.apiCreateGroupChannel([testUser1.id, testUser2.id, testUser3.id]).then(({channel}) => {
                                    gm = channel;
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    it('GM conversion', () => {
        cy.visit(`/${testTeam1.name}/messages/${gm.name}`);
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByRole('menuitem', {name: 'Settings'}).trigger('mouseover');
        cy.findByText('Convert to Private Channel').click();
        cy.get('.GenericModal__button.delete.disabled').wait(2000);
        cy.findByText('Select Team').click({force: true});
        cy.findByText(testTeam2.display_name).click();
        cy.findByPlaceholderText('Channel name').type('Converted Channel');
        cy.get('.GenericModal__button.delete').click();
        cy.url().should('contain', `/${testTeam2.name}/channels/converted-channel`);
        cy.get('.SidebarChannel:contains("Converted Channel")').get('.icon.icon-lock-outline').should('be.visible');
    });
    it('When users belong to only one common team', () => {
        let testUser4;
        let gm2;
        cy.apiCreateUser({prefix: 'other'}).then(({user}) => {
            testUser4 = user;
            const teamMembers = [testUser1, testUser2, testUser3, testUser4].map((u) => ({
                team_id: testTeam2.id,
                user_id: u.id,
            }));
            cy.apiAddUsersToTeam(testTeam2.id, teamMembers as TeamMembership[]).then(() => {
                cy.apiCreateGroupChannel([testUser1.id, testUser2.id, testUser3.id, testUser4.id]).then(({channel}) => {
                    gm2 = channel;
                    cy.visit(`/${testTeam1.name}/messages/${gm2.name}`);
                    cy.get('#channelHeaderDropdownButton').click();
                    cy.findByRole('menuitem', {name: 'Settings'}).trigger('mouseover');
                    cy.findByText('Convert to Private Channel').click();
                    cy.get('.GenericModal__button.delete.disabled').wait(2000);
                    cy.contains('Select Team').should('not.exist');
                    cy.findByPlaceholderText('Channel name').type('Converted Channel 2');
                    cy.get('.GenericModal__button.delete').click();
                    cy.url().should('contain', `/${testTeam2.name}/channels/converted-channel-2`);
                    cy.get('.SidebarChannel:contains("Converted Channel 2")').get('.icon.icon-lock-outline').should('be.visible');
                });
            });
        });
    });
    it('When users have no common team', () => {
        let testUser5;
        let gm3;
        let testTeam3;
        cy.apiCreateUser({prefix: 'other'}).then(({user}) => {
            testUser5 = user;
            cy.apiCreateTeam('gmconversionteam3', 'GM Conversion Team 3').then(({team}) => {
                testTeam3 = team;
                const teamMembers = [{
                    team_id: testTeam3.id,
                    user_id: testUser5.id,
                }];
                cy.apiAddUsersToTeam(testTeam3.id, teamMembers as TeamMembership[]).then(() => {
                    cy.apiCreateGroupChannel([testUser1.id, testUser2.id, testUser3.id, testUser5.id]).then(({channel}) => {
                        gm3 = channel;
                        cy.visit(`/${testTeam1.name}/messages/${gm3.name}`);
                        cy.get('#channelHeaderDropdownButton').click();
                        cy.findByRole('menuitem', {name: 'Settings'}).trigger('mouseover');
                        cy.findByText('Convert to Private Channel').click();
                        cy.findByText('Unable to convert to a channel because group members are part of different teams').wait(2000);
                    });
                });
            });
        });
    });
    it('websocket event should update channel category correctly when in channel', () => {
        cy.apiCreateGroupChannel([testUser1.id, testUser2.id, testUser3.id]).then(({channel}) => {
            gm = channel;
            cy.visit(`/${testTeam1.name}/messages/${gm.name}`);
            cy.get('#channelHeaderDropdownButton').should('be.visible');
            const timestamp = Date.now();
            cy.apiConvertGMToPrivateChannel(gm.id, testTeam2.id, `Channel ${timestamp}`, `c-${timestamp}`).then(() => {
                cy.url().should('contain', `${testTeam2.name}/channels/c-${timestamp}`);
            });
        });
    });
});