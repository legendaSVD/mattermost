import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Bot accounts ownership and API', () => {
    let newTeam: Team;
    let newUser: UserProfile;
    let newChannel: Channel;
    let botId: string;
    let botName: string;
    beforeEach(() => {
        cy.apiAdminLogin();
        const newSettings = {
            ServiceSettings: {
                EnforceMultifactorAuthentication: false,
            },
        };
        cy.apiUpdateConfig(newSettings);
        cy.apiInitSetup().then(({team, user, channel, townSquareUrl}) => {
            newTeam = team;
            newUser = user;
            newChannel = channel;
            cy.visit(townSquareUrl);
            cy.postMessage('hello');
        });
        cy.apiCreateBot().then(({bot}) => {
            ({user_id: botId, display_name: botName} = bot);
            cy.apiPatchUserRoles(bot.user_id, ['system_admin', 'system_user']);
        });
    });
    it('MM-T1862 Only system admin are able to create bots', () => {
        cy.uiOpenProductMenu('Integrations');
        cy.url().should('include', `/${newTeam.name}/integrations`);
        cy.get('.backstage-header').findByText('Integrations').should('be.visible');
        cy.apiLogin(newUser);
        cy.visit(`/${newTeam.name}/channels/town-square`);
        cy.uiOpenProductMenu();
        cy.uiGetProductMenu().should('not.contain', 'Integrations');
    });
    it('MM-T1863 Only System Admin are able to create bots (API)', () => {
        cy.apiLogin(newUser);
        const botName3 = 'stay-enabled-bot-' + Date.now();
        cy.request({
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            url: '/api/v4/bots',
            method: 'POST',
            failOnStatusCode: false,
            body: {
                username: botName3,
                display_name: 'some text',
                description: 'some text',
            },
        }).then((response) => {
            expect(response.status).to.equal(403);
        });
    });
    it('MM-T1864 Create bot (API)', () => {
        cy.apiCreateBot();
    });
    it('MM-T1865 Create post as bot', () => {
        cy.apiCreateToken(botId).then(({token}) => {
            cy.apiLogout();
            const msg1 = 'this is a bot message ' + botName;
            cy.apiCreatePost(newChannel.id, msg1, '', {attachments: [{pretext: 'Look some text', text: 'This is text'}]}, token);
            cy.apiAdminLogin();
            cy.visit(`/${newTeam.name}/channels/` + newChannel.name);
            cy.findByText(msg1).should('be.visible');
        });
    });
    it.skip('MM-T1866 Create two posts in a row to the same channel', () => {
        cy.apiCreateToken(botId).then(({token}) => {
            cy.apiLogout();
            const msg1 = 'this is a bot message ' + botName;
            const msg2 = 'this is a bot message2 ' + botName;
            cy.apiCreatePost(newChannel.id, msg1, '', {attachments: [{pretext: 'Look some text', text: 'This is text'}]}, token).then(({body: post1}) => {
                cy.apiCreatePost(newChannel.id, msg2, '', {attachments: [{pretext: 'Look some text', text: 'This is text'}]}, token).then(({body: post2}) => {
                    cy.apiAdminLogin();
                    cy.visit(`/${newTeam.name}/channels/` + newChannel.name);
                    cy.get(`#postMessageText_${post1.id}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg1);
                    cy.get(`#postMessageText_${post2.id}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg2);
                    cy.get(`#post_${post1.id}`).find('.Avatar').should('be.visible');
                    cy.get(`#post_${post2.id}`).should('have.class', 'same--user');
                });
            });
        });
    });
    it('MM-T1867 Post as a bot and include an @ mention', () => {
        cy.apiCreateToken(botId).then(({token}) => {
            cy.apiLogout();
            const msg1 = 'this is a bot message ' + botName;
            cy.apiCreatePost(newChannel.id, msg1 + ' to @sysadmin', '', {}, token);
            cy.apiAdminLogin();
            cy.visit(`/${newTeam.name}/channels/` + newChannel.name);
            cy.getLastPostId().then((postId) => {
                cy.get(`#postMessageText_${postId}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg1);
                cy.get(`#postMessageText_${postId}`, {timeout: TIMEOUTS.ONE_MIN}).find('.mention--highlight').should('be.visible');
            });
        });
    });
    it('MM-T1868 BOT has a member role and is not in target channel and team', () => {
        cy.apiCreateBot().then(({bot}) => {
            cy.apiCreateToken(bot.user_id).then(({token}) => {
                cy.apiLogout();
                cy.apiCreatePost(newChannel.id, 'this is a bot message ' + bot.username, '', {}, token, false).then((response) => {
                    expect(response.status).to.equal(403);
                });
            });
        });
    });
    it('MM-T1869 BOT has a system admin role and is not in target channel and team', () => {
        const botName3 = 'stay-enabled-bot-' + Date.now();
        cy.apiCreateToken(botId).then(({token}) => {
            cy.apiLogout();
            cy.apiCreatePost(newChannel.id, 'this is a bot message ' + botName3, '', {}, token).then((response) => {
                expect(response.status).to.equal(201);
            });
        });
    });
});