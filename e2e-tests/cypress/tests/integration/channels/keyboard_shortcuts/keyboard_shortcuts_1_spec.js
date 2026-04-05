import * as messages from '../../../fixtures/messages';
import timeouts, * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Keyboard Shortcuts', () => {
    let testTeam;
    let testChannel;
    let testUser;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, channel, user}) => {
            testTeam = team;
            testChannel = channel;
            testUser = user;
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.visit(`/${testTeam.name}/channels/town-square`);
    });
    it('MM-T1227 - CTRL/CMD+K - Join public channel', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K');
        cy.apiCreateUser({prefix: 'temp-'}).then(({user: tempUser}) => {
            cy.apiAddUserToTeam(testTeam.id, tempUser.id);
            cy.findByRole('combobox', {name: 'quick switch input'}).should('be.focused').type(testChannel.name.substring(0, 3)).wait(TIMEOUTS.HALF_SEC);
            cy.get('#suggestionList').should('be.visible').within(() => {
                cy.findByTestId(testChannel.name).scrollIntoView().should('exist').click().wait(TIMEOUTS.HALF_SEC);
            });
            cy.get('#channelIntro').contains('.channel-intro__title', `${testChannel.display_name}`).should('be.visible');
            cy.uiGetLhsSection('CHANNELS').findByText(testChannel.display_name).should('be.visible');
            cy.get('#channelIntro').contains('.channel-intro__created', 'Public channel created by sysadmin').should('be.visible');
        });
    });
    it.skip('MM-T1231 - ALT+SHIFT+UP', () => {
        cy.apiLogout();
        cy.apiLogin(testUser);
        cy.apiCreateTeam('team1', 'Team1').then(({team}) => {
            const privateChannels = [];
            const publicChannels = [];
            const dmChannels = [];
            for (let index = 0; index < 2; index++) {
                const otherUserId = otherUser.id;
                cy.apiCreateChannel(team.id, `a-public-${index}`, `A Public ${index}`).then(({channel}) => {
                    publicChannels.push(channel);
                    cy.apiAddUserToTeam(team.id, otherUserId).then(() => {
                        cy.apiAddUserToChannel(channel.id, otherUserId);
                    });
                });
            }
            for (let index = 0; index < 2; index++) {
                const otherUserId = otherUser.id;
                cy.apiCreateChannel(team.id, `b-private-${index}`, `B Private ${index}`, 'P').then(({channel}) => {
                    privateChannels.push(channel);
                    cy.apiAddUserToChannel(channel.id, otherUserId);
                });
            }
            cy.apiCreateDirectChannel([testUser.id, otherUser.id]).wait(TIMEOUTS.ONE_SEC).then(({channel}) => {
                dmChannels.push(channel);
                cy.visit(`/${team.name}/channels/${testUser.id}__${otherUser.id}`);
                cy.uiGetPostTextBox().clear().type(`message from ${testUser.username}`).type('{enter}');
            });
            cy.apiLogout();
            cy.apiLogin(otherUser).then(() => {
                cy.visit(`/${team.name}/channels/off-topic`);
                cy.get('#sidebarItem_' + publicChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type('message to public channel').type('{enter}');
                cy.get('#sidebarItem_' + privateChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type('message to private channel').type('{enter}');
                cy.get('#sidebarItem_' + dmChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type(`direct message from ${otherUser.username}`).type('{enter}');
            });
            cy.apiLogout();
            cy.apiLogin(testUser).then(() => {
                cy.visit(`/${team.name}/channels/off-topic`);
                cy.get(`#sidebarItem_${publicChannels[0].name}`).should('have.class', 'unread-title');
                cy.get(`#sidebarItem_${privateChannels[0].name}`).should('have.class', 'unread-title');
                cy.get(`#sidebarItem_${dmChannels[0].name}`).should('have.class', 'unread-title');
                cy.get('#sidebarItem_' + dmChannels[0].name).scrollIntoView().click();
                cy.get('.active').find('#sidebarItem_' + dmChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{uparrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + privateChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{uparrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + publicChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{uparrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + publicChannels[0].name).should('exist');
            });
            const favPrivateChannels = [];
            const favPublicChannels = [];
            const favDMChannels = [];
            cy.apiCreateChannel(team.id, 'public', 'public').then(({channel}) => {
                favPublicChannels.push(channel);
                cy.apiAddUserToChannel(channel.id, otherUser.id);
                markAsFavorite(channel.name);
            });
            cy.apiCreateChannel(team.id, 'private', 'private', 'P').then(({channel}) => {
                favPrivateChannels.push(channel);
                cy.apiAddUserToChannel(channel.id, otherUser.id);
                markAsFavorite(channel.name);
            });
            cy.apiCreateDirectChannel([testUser.id, otherUser.id]).wait(TIMEOUTS.ONE_SEC).then(({channel}) => {
                favDMChannels.push(channel);
                cy.visit(`/${team.name}/channels/${testUser.id}__${otherUser.id}`);
                cy.uiGetPostTextBox().clear().type(`message from ${testUser.username}`).type('{enter}');
                markAsFavorite(channel.name);
            });
            cy.apiLogout();
            cy.apiLogin(otherUser).then(() => {
                cy.visit(`/${team.name}/channels/off-topic`);
                cy.get('#sidebarItem_' + favPublicChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type('message to public channel').type('{enter}');
                cy.get('#sidebarItem_' + favPrivateChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type('message to private channel').type('{enter}');
                cy.get('#sidebarItem_' + favDMChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type(`direct message from ${otherUser.username}`).type('{enter}');
            });
            cy.apiLogout();
            cy.apiLogin(testUser).then(() => {
                cy.visit(`/${team.name}/channels/off-topic`);
                cy.get(`#sidebarItem_${favDMChannels[0].name}`).should('have.class', 'unread-title');
                cy.get(`#sidebarItem_${favPrivateChannels[0].name}`).should('have.class', 'unread-title');
                cy.get(`#sidebarItem_${favPublicChannels[0].name}`).should('have.class', 'unread-title');
                cy.get('#sidebarItem_' + favPrivateChannels[0].name).scrollIntoView().click();
                cy.get('.active').find('#sidebarItem_' + favPrivateChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{uparrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + favDMChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{uparrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + favPublicChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{uparrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + favPublicChannels[0].name).should('exist');
            });
        });
    });
    it.skip('MM-T1232 - ALT+SHIFT+DOWN', () => {
        cy.apiLogout();
        cy.apiLogin(testUser);
        cy.apiCreateTeam('team2', 'Team2').then(({team}) => {
            const privateChannels = [];
            const publicChannels = [];
            const dmChannels = [];
            for (let index = 0; index < 2; index++) {
                const otherUserId = otherUser.id;
                cy.apiCreateChannel(team.id, `a-public-${index}`, `A Public ${index}`).then(({channel}) => {
                    publicChannels.push(channel);
                    cy.apiAddUserToTeam(team.id, otherUserId).then(() => {
                        cy.apiAddUserToChannel(channel.id, otherUserId);
                    });
                });
            }
            for (let index = 0; index < 2; index++) {
                const otherUserId = otherUser.id;
                cy.apiCreateChannel(team.id, `b-private-${index}`, `B Private ${index}`).then(({channel}) => {
                    privateChannels.push(channel);
                    cy.apiAddUserToChannel(channel.id, otherUserId);
                });
            }
            cy.apiCreateDirectChannel([testUser.id, otherUser.id]).wait(TIMEOUTS.ONE_SEC).then(({channel}) => {
                dmChannels.push(channel);
                cy.visit(`/${team.name}/channels/${testUser.id}__${otherUser.id}`);
                cy.uiGetPostTextBox().clear().type(`message from ${testUser.username}`).type('{enter}');
            });
            cy.apiLogout();
            cy.apiLogin(otherUser).then(() => {
                cy.visit(`/${team.name}/channels/off-topic`);
                cy.get('#sidebarItem_' + publicChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type('message to public channel').type('{enter}');
                cy.get('#sidebarItem_' + privateChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type('message to private channel').type('{enter}');
                cy.get('#sidebarItem_' + dmChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type(`direct message from ${otherUser.username}`).type('{enter}');
            });
            cy.apiLogout();
            cy.apiLogin(testUser).then(() => {
                cy.visit(`/${team.name}/channels/off-topic`);
                cy.get(`#sidebarItem_${publicChannels[0].name}`).should('have.class', 'unread-title');
                cy.get(`#sidebarItem_${privateChannels[0].name}`).should('have.class', 'unread-title');
                cy.get(`#sidebarItem_${dmChannels[0].name}`).should('have.class', 'unread-title');
                cy.get('#sidebarItem_' + publicChannels[0].name).scrollIntoView().click();
                cy.get('.active').find('#sidebarItem_' + publicChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{downarrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + privateChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{downarrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + dmChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{downarrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + dmChannels[0].name).should('exist');
            });
            const favPrivateChannels = [];
            const favPublicChannels = [];
            const favDMChannels = [];
            cy.apiCreateChannel(team.id, 'public', 'public').then(({channel}) => {
                favPublicChannels.push(channel);
                cy.apiAddUserToChannel(channel.id, otherUser.id);
                markAsFavorite(channel.name);
            });
            cy.apiCreateChannel(team.id, 'private', 'private', 'P').then(({channel}) => {
                favPrivateChannels.push(channel);
                cy.apiAddUserToChannel(channel.id, otherUser.id);
                markAsFavorite(channel.name);
            });
            cy.apiCreateDirectChannel([testUser.id, otherUser.id]).wait(TIMEOUTS.ONE_SEC).then(({channel}) => {
                favDMChannels.push(channel);
                cy.visit(`/${team.name}/channels/${testUser.id}__${otherUser.id}`);
                cy.uiGetPostTextBox().clear().type(`message from ${testUser.username}`).type('{enter}');
                markAsFavorite(channel.name);
            });
            cy.apiLogout();
            cy.apiLogin(otherUser).then(() => {
                cy.visit(`/${team.name}/channels/off-topic`);
                cy.get('#sidebarItem_' + favPublicChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type('message to public channel').type('{enter}');
                cy.get('#sidebarItem_' + favPrivateChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type('message to private channel').type('{enter}');
                cy.get('#sidebarItem_' + favDMChannels[0].name).scrollIntoView().click();
                cy.uiGetPostTextBox().clear().type(`direct message from ${otherUser.username}`).type('{enter}');
            });
            cy.apiLogout();
            cy.apiLogin(testUser).then(() => {
                cy.visit(`/${team.name}/channels/off-topic`);
                cy.get(`#sidebarItem_${favDMChannels[0].name}`).should('have.class', 'unread-title');
                cy.get(`#sidebarItem_${favPrivateChannels[0].name}`).should('have.class', 'unread-title');
                cy.get(`#sidebarItem_${favPublicChannels[0].name}`).should('have.class', 'unread-title');
                cy.get('#sidebarItem_' + favPrivateChannels[0].name).scrollIntoView().click();
                cy.get('.active').find('#sidebarItem_' + favPrivateChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{downarrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + favPublicChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{downarrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + favDMChannels[0].name).should('exist');
                cy.get('body').type('{alt}{shift}', {release: false}).type('{downarrow}').type('{alt}{shift}', {release: true});
                cy.get('.active').find('#sidebarItem_' + favDMChannels[0].name).should('exist');
            });
        });
    });
    it('MM-T1240 - CTRL/CMD+K: Open and close', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('K').then(() => {
            cy.get('#quickSwitchHint').should('be.visible');
            cy.findByRole('combobox', {name: 'quick switch input'}).should('be.focused');
        });
        cy.get('body').cmdOrCtrlShortcut('K');
        cy.get('#quickSwitchHint').should('not.exist');
    });
    it('MM-T1248 - CTRL/CMD+SHIFT+L - Set focus to center channel message box', () => {
        cy.uiGetSearchContainer().click();
        cy.uiGetSearchBox().should('be.focused');
        cy.get('body').cmdOrCtrlShortcut('{shift}L');
        cy.uiGetPostTextBox().should('be.focused');
        cy.get('[data-testid="searchBoxClose"] > .icon').click();
        const message = `hello${Date.now()}`;
        cy.postMessage(message);
        cy.getLastPostId().then((postId) => {
            cy.clickPostCommentIcon(postId);
            cy.uiGetReplyTextBox().focus().should('be.focused');
        }).then(() => {
            cy.wait(timeouts.ONE_SEC);
            cy.get('body').cmdOrCtrlShortcut('{shift}L');
            cy.uiGetPostTextBox().should('be.focused');
        });
    });
    it('MM-T1252 - CTRL/CMD+SHIFT+A', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{shift}A');
        cy.uiGetSettingsModal().should('be.visible');
        cy.get('body').cmdOrCtrlShortcut('{shift}A');
        cy.uiGetSettingsModal().should('not.exist');
    });
    it('MM-T1278 - CTRL/CMD+SHIFT+K', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{shift}K');
        cy.get('#moreDmModal').should('be.visible').contains('Direct Messages');
        cy.get('body').cmdOrCtrlShortcut('{shift}K');
        cy.get('#moreDmModal').should('not.exist');
    });
    it('MM-T4452 - CTRL/CMD+SHIFT+. Expand or collapse RHS when RHS is already open', () => {
        cy.postMessage(messages.TINY);
        cy.clickPostCommentIcon();
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{shift}.');
        cy.uiGetRHS().isExpanded();
        cy.get('body').cmdOrCtrlShortcut('{shift}.');
        cy.get('#sidebar-right').should('be.visible').and('not.have.class', 'sidebar--right--expanded');
    });
    it('MM-T4452 - CTRL/CMD+SHIFT+. Expand or collapse RHS when RHS is in closed state', () => {
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{shift}.');
        cy.get('#sidebar-right').should('be.visible').and('not.have.class', 'sidebar--right--expanded');
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{shift}.');
        cy.uiGetRHS().isExpanded();
        cy.uiGetPostTextBox().cmdOrCtrlShortcut('{shift}.');
        cy.get('#sidebar-right').should('be.visible').and('not.have.class', 'sidebar--right--expanded');
    });
    function markAsFavorite(channelName) {
        cy.get(`#sidebarItem_${channelName}`).scrollIntoView().click();
        cy.get('#postListContent').should('be.visible');
        cy.get('#channelHeaderInfo').then((el) => {
            if (el.find('#toggleFavorite.active').length) {
                cy.get('#toggleFavorite').click();
            }
        });
        cy.get('#toggleFavorite').click();
    }
});