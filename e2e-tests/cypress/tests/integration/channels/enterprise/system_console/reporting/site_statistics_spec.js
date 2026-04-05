import * as TIMEOUTS from '../../../../../fixtures/timeouts';
describe('System Console > Site Statistics', () => {
    let testTeam;
    const statDataTestIds = [
        'totalActiveUsers',
        'totalTeams',
        'totalChannels',
        'totalPosts',
        'totalSessions',
        'totalCommands',
        'incomingWebhooks',
        'outgoingWebhooks',
        'dailyActiveUsers',
        'monthlyActiveUsers',
        'websocketConns',
        'masterDbConns',
        'replicaDbConns'];
    const titleTestIds = [
        'totalActiveUsersTitle',
        'totalTeamsTitle',
        'totalChannelsTitle',
        'totalPostsTitle',
        'totalSessionsTitle',
        'totalCommandsTitle',
        'incomingWebhooksTitle',
        'outgoingWebhooksTitle',
        'dailyActiveUsersTitle',
        'monthlyActiveUsersTitle',
        'websocketConnsTitle',
        'masterDbConnsTitle',
        'replicaDbConnsTitle'];
    before(() => {
        cy.apiRequireLicense();
    });
    afterEach(() => {
        cy.apiPatchMe({locale: 'en'});
    });
    it('MM-T904 Site Statistics displays expected content categories', () => {
        cy.intercept('**/api/v4
api/v4/**').as('resources');
        let newChannel;
        cy.apiInitSetup().then(({channel}) => {
            newChannel = channel;
        });
        cy.apiCreateBot().then(({bot}) => {
            const botUserId = bot.user_id;
            cy.externalUpdateUserRoles(botUserId, 'system_user system_post_all system_admin');
            cy.apiAccessToken(botUserId, 'Create token').then(({token}) => {
                cy.apiAddUserToTeam(newChannel.team_id, botUserId);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                cy.postBotMessage({token, channelId: newChannel.id, message: 'this is bot message', createAt: yesterday.getTime()}).then(() => {
                    cy.visit('/admin_console');
                    cy.wait('@resources');
                    cy.dbRefreshPostStats().then(() => {
                        cy.findByTestId('reporting.system_analytics', {timeout: TIMEOUTS.ONE_MIN}).click();
                        cy.findByTestId('details-expander', {timeout: TIMEOUTS.ONE_MIN}).click();
                        let totalPostsDataSet;
                        let totalPostsFromBots;
                        let activeUsersWithPosts;
                        cy.findByTestId('totalPostsLineChart').then((el) => {
                            totalPostsDataSet = el[0].dataset.labels;
                            cy.findByTestId('totalPostsFromBotsLineChart').then((el2) => {
                                totalPostsFromBots = el2[0].dataset.labels;
                                cy.findByTestId('activeUsersWithPostsLineChart').then((el3) => {
                                    activeUsersWithPosts = el3[0].dataset.labels;
                                    expect(totalPostsDataSet).equal(totalPostsFromBots);
                                    expect(totalPostsDataSet).equal(activeUsersWithPosts);
                                    expect(totalPostsFromBots).equal(activeUsersWithPosts);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    it('MM-T905 - Site Statistics card labels in different languages', () => {
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.apiAdminLogin();
            cy.visit(`/${testTeam.name}/channels/off-topic`);
            cy.uiOpenSettingsModal('Display').then(() => {
                cy.findByText('Language').click();
                cy.get('#displayLanguage').click();
                cy.findByText('Français (Beta)').click();
                cy.uiSave();
            });
            cy.visit('/admin_console/reporting/system_analytics');
            titleTestIds.forEach((id) => {
                let expectedResult = false;
                if (id === 'totalCommandsTitle' || id === 'masterDbConnsTitle' || id === 'replicaDbConnsTitle') {
                    expectedResult = true;
                }
                cy.findByTestId(id, {timeout: TIMEOUTS.ONE_MIN}).then((el) => {
                    const titleSpan = el[0].childNodes[0];
                    expect(titleSpan.scrollWidth > titleSpan.clientWidth).equal(expectedResult);
                });
            });
        });
    });
});