import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Bot accounts ownership and API', () => {
    let newTeam: Team;
    let newUser: UserProfile;
    let newChannel: Channel;
    let botId: string;
    let botUsername: string;
    let botName: string;
    let adminUser: UserProfile;
    beforeEach(() => {
        cy.apiAdminLogin().then(({user}) => {
            adminUser = user;
        });
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
            ({user_id: botId, username: botUsername, display_name: botName} = bot);
            cy.apiPatchUserRoles(bot.user_id, ['system_admin', 'system_user']);
        });
    });
    it('MM-T1870 BOT has a system admin role and can also post to private channels they do not belong to', () => {
        const channelName = 'channel' + Date.now();
        cy.apiCreateChannel(newTeam.id, channelName, channelName, 'P').then(({channel}) => {
            cy.apiCreateToken(botId).then(({token}) => {
                cy.apiLogout();
                const msg1 = 'this is a bot message ' + botName;
                cy.apiCreatePost(channel.id, msg1 + ' to @sysadmin', '', {}, token);
                cy.apiAdminLogin();
                cy.visit(`/${newTeam.name}/channels/` + channel.name);
                cy.getLastPostId().then((postId) => {
                    cy.get(`#postMessageText_${postId}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg1);
                });
            });
        });
    });
    it('MM-T1872 Bot can post to DM channel', () => {
        cy.apiCreateDirectChannel([newUser.id, adminUser.id]).then(({channel}) => {
            cy.apiAccessToken(botId, 'some text').then(({token}) => {
                const msg1 = 'this is a bot message ' + botName;
                cy.postBotMessage({message: msg1, token, channelId: channel.id});
                cy.visit(`/${newTeam.name}/channels/` + channel.name);
                cy.getLastPostId().then((postId) => {
                    cy.get(`#postMessageText_${postId}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg1);
                });
            });
        });
    });
    it('MM-T1874 Bots can post when MFA is enforced', () => {
        cy.apiAccessToken(botId, 'some text').then(({token}) => {
            const msg1 = 'this is a bot message ' + botName;
            cy.postBotMessage({channelId: newChannel.id, message: msg1, props: {attachments: [{pretext: 'Look some text', text: 'This is text'}]}, token});
            cy.visit(`/${newTeam.name}/channels/` + newChannel.name);
            cy.findByText(msg1).should('be.visible');
            const newSettings = {
                ServiceSettings: {
                    EnforceMultifactorAuthentication: true,
                },
            };
            cy.apiUpdateConfig(newSettings);
            const msg2 = 'this is a bot message2 ' + botName;
            cy.postBotMessage({channelId: newChannel.id, message: msg2, props: {attachments: [{pretext: 'Look some text', text: 'This is text'}]}, token});
            cy.visit(`/${newTeam.name}/channels/` + newChannel.name);
            cy.findByText(msg2).should('be.visible');
        });
    });
    it('MM-T1875 A bot cannot create another bot', () => {
        cy.apiAccessToken(botId, 'some text').then(({token}) => {
            cy.apiLogout();
            cy.request({
                headers: {'X-Requested-With': 'XMLHttpRequest', Authorization: `Bearer ${token}`},
                url: '/api/v4/bots',
                method: 'POST',
                failOnStatusCode: false,
                body: {
                    username: botName + '333',
                    display_name: 'some text',
                    description: 'some text',
                },
            }).then((response) => {
                expect(response.status).to.equal(403);
            });
        });
    });
    it('MM-T1877 Reactivate a deactivated bot', () => {
        cy.apiCreateDirectChannel([newUser.id, adminUser.id]).then(({channel}) => {
            cy.apiAccessToken(botId, 'some text').then(({token}) => {
                const msg1 = 'this is a bot message ' + botName;
                cy.postBotMessage({channelId: channel.id, message: msg1, token});
                cy.visit(`/${newTeam.name}/channels/` + channel.name);
                cy.getLastPostId().then((postId) => {
                    cy.get(`#postMessageText_${postId}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg1);
                });
                cy.visit(`/${newTeam.name}/integrations/bots`);
                cy.findByText(`${botName} (@${botUsername})`).scrollIntoView().parent().findByText('Disable').click();
                const msg2 = 'this is a bot message2 ' + botName;
                cy.apiLogout();
                cy.postBotMessage({channelId: channel.id, message: msg2, token, failOnStatus: false}).then(({status}) => {
                    expect(status).to.equal(401);
                });
                cy.apiAdminLogin();
                cy.visit(`/${newTeam.name}/integrations/bots`);
                cy.findByText(`${botName} (@${botUsername})`).scrollIntoView().parent().findByText('Enable').click();
                cy.postBotMessage({channelId: channel.id, message: msg2, token});
                cy.visit(`/${newTeam.name}/channels/` + channel.name);
                cy.getLastPostId().then((postId) => {
                    cy.get(`#postMessageText_${postId}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg2);
                });
            });
        });
    });
    it('MM-T1878 Disable token can not be used to post', () => {
        cy.apiCreateDirectChannel([newUser.id, adminUser.id]).then(({channel}) => {
            cy.apiAccessToken(botId, 'some text').then(({token, id}) => {
                const msg1 = 'this is a bot message ' + botName;
                cy.postBotMessage({channelId: channel.id, message: msg1, token});
                cy.visit(`/${newTeam.name}/channels/` + channel.name);
                cy.getLastPostId().then((postId) => {
                    cy.get(`#postMessageText_${postId}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg1);
                });
                cy.visit(`/${newTeam.name}/integrations/bots`);
                cy.findByText(`${botName} (@${botUsername})`).then((el) => {
                    cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
                    cy.get(`#${id}_deactivate`).click();
                });
                const msg2 = 'this is a bot message2 ' + botName;
                cy.postBotMessage({channelId: channel.id, message: msg2, token, failOnStatus: false}).then(({status}) => {
                    expect(status).to.equal(401);
                });
                cy.visit(`/${newTeam.name}/integrations/bots`);
                cy.findAllByText('Bot Accounts');
                cy.findByText(`${botName} (@${botUsername})`).scrollIntoView().then((el) => {
                    cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
                    cy.get(`#${id}_activate`).click().wait(TIMEOUTS.ONE_SEC);
                    cy.postBotMessage({channelId: channel.id, message: msg2, token});
                    cy.visit(`/${newTeam.name}/channels/` + channel.name);
                    cy.getLastPostId().then((postId) => {
                        cy.get(`#postMessageText_${postId}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg2);
                    });
                });
            });
        });
    });
    it('MM-T1880 Deleted token can not be used to post', () => {
        cy.apiCreateDirectChannel([newUser.id, adminUser.id]).then(({channel}) => {
            cy.apiAccessToken(botId, 'some text').then(({token, id}) => {
                const msg1 = 'this is a bot message ' + botName;
                cy.postBotMessage({channelId: channel.id, message: msg1, token});
                cy.visit(`/${newTeam.name}/channels/` + channel.name);
                cy.getLastPostId().then((postId) => {
                    cy.get(`#postMessageText_${postId}`, {timeout: TIMEOUTS.ONE_MIN}).should('contain', msg1);
                });
                cy.visit(`/${newTeam.name}/integrations/bots`);
                cy.findByText(`${botName} (@${botUsername})`).scrollIntoView().then((el) => {
                    cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
                    cy.get(`#${id}_delete`).click();
                    cy.get('#confirmModalButton').click();
                    const msg2 = 'this is a bot message2 ' + botName;
                    cy.postBotMessage({channelId: channel.id, message: msg2, token, failOnStatus: false}).then(({status}) => {
                        expect(status).to.equal(401);
                    });
                });
            });
        });
    });
});