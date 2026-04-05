import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Keyboard Shortcuts', () => {
    let testUser;
    let otherUser;
    const count = 3;
    const teamAndChannels = [];
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testUser = user;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(channel.id, otherUser.id);
                    cy.apiLogin(testUser);
                    Cypress._.times(2, (i) => {
                        cy.apiCreateTeam(`team${i}`, `Team${i}`).then(({team: testTeam}) => {
                            teamAndChannels.push({team: testTeam, channels: []});
                            const channelName = `channel${i}`;
                            const channelDisplayName = `Channel${i}`;
                            Cypress._.times(count, (j) => {
                                cy.apiCreateChannel(testTeam.id, channelName + j, channelDisplayName + j).then(({channel: testChannel}) => {
                                    teamAndChannels[i].channels.push(testChannel);
                                    cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                                        cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
    });
    it('MM-T1241 - CTRL/CMD+K: Unreads', () => {
        const otherUserMention = `@${otherUser.username}`;
        Cypress._.forEach(teamAndChannels, (teamAndChannel, i) => {
            cy.visit(`/${teamAndChannel.team.name}/channels/off-topic`);
            Cypress._.forEach(teamAndChannel.channels, (channel, j) => {
                cy.get('#sidebarItem_' + channel.name).scrollIntoView().click();
                const message = i === j ? 'without mention' : `mention ${otherUserMention} `;
                cy.postMessage(message);
                cy.uiWaitUntilMessagePostedIncludes(message);
            });
        });
        cy.apiLogout();
        cy.apiLogin(otherUser);
        const baseCount = 1;
        const withMention = 1;
        const team2 = teamAndChannels[1].team;
        const team2Channels = teamAndChannels[1].channels;
        cy.visit(`/${team2.name}/channels/off-topic`);
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').
            findByRole('option', {name: team2Channels[2].display_name}).should('be.visible').and('have.class', 'suggestion--selected').
            find('.badge').should('be.visible').and('have.text', baseCount + withMention);
        cy.findByRole('combobox', {name: 'quick switch input'}).type('{downarrow}');
        cy.get('#suggestionList').
            findByRole('option', {name: team2Channels[1].display_name}).should('be.visible').and('have.class', 'suggestion--selected').
            find('.badge').should('be.visible').and('have.text', baseCount);
        cy.findByRole('combobox', {name: 'quick switch input'}).type('{downarrow}');
        cy.get('#suggestionList').
            findByRole('option', {name: team2Channels[0].display_name}).should('be.visible').and('have.class', 'suggestion--selected').
            find('.badge').should('be.visible').and('have.text', baseCount + withMention);
        cy.findByRole('combobox', {name: 'quick switch input'}).type('{downarrow}');
        cy.findByRole('combobox', {name: 'quick switch input'}).type(team2Channels[1].display_name).wait(TIMEOUTS.HALF_SEC);
        cy.get('#suggestionList').should('be.visible').children().within((el) => {
            cy.wrap(el).should('contain', team2Channels[1].display_name);
        });
    });
    it('MM-T3002 CTRL/CMD+K - Unread Channels and input field focus', () => {
        const team1 = teamAndChannels[0].team;
        cy.visit(`/${team1.name}/channels/off-topic`);
        cy.postMessageAs({
            sender: otherUser,
            message: `Message on the ${teamAndChannels[0].channels[0].display_name}`,
            channelId: teamAndChannels[0].channels[0].id,
        }).then(() => {
            cy.postMessageAs({
                sender: otherUser,
                message: `Message on the ${teamAndChannels[0].channels[1].display_name}`,
                channelId: teamAndChannels[0].channels[1].id,
            }).then(() => {
                cy.postMessageAs({
                    sender: otherUser,
                    message: `Message on the ${teamAndChannels[0].channels[2].display_name}`,
                    channelId: teamAndChannels[0].channels[2].id,
                }).then(() => {
                    cy.uiGetPostTextBox().cmdOrCtrlShortcut('k');
                    cy.get('.a11y__modal.channel-switcher').should('exist').and('be.visible').as('channelSwitcherDialog');
                    cy.focused().should('have.id', 'quickSwitchInput');
                    cy.get('@channelSwitcherDialog').within(() => {
                        teamAndChannels[0].channels.forEach((channel) => {
                            cy.findByText(channel.display_name).should('be.visible');
                        });
                    });
                });
            });
        });
    });
});