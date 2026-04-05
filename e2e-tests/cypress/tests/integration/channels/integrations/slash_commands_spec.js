import {getRandomId} from '../../../utils';
describe('Integrations', () => {
    let user1;
    let user2;
    let team1;
    let team2;
    let offTopicUrl1;
    let offTopicUrl2;
    let commandURL;
    const commandTrigger = 'test-ephemeral';
    const timestamp = Date.now();
    before(() => {
        cy.requireWebhookServer();
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableLinkPreviews: true,
            },
        });
        cy.apiInitSetup().then(({team, user, offTopicUrl}) => {
            user1 = user;
            team1 = team;
            offTopicUrl1 = offTopicUrl;
            cy.apiGetChannelByName(team1.name, 'off-topic').then(({channel}) => {
                commandURL = `${Cypress.env().webhookBaseUrl}/send_message_to_channel?channel_id=${channel.id}`;
            });
            cy.apiCreateUser().then(({user: otherUser}) => {
                user2 = otherUser;
                cy.apiAddUserToTeam(team.id, user2.id);
            });
            cy.apiCreateTeam(`test-team-${timestamp}`, `test-team-${timestamp}`).then(({team: anotherTeam}) => {
                team2 = anotherTeam;
                offTopicUrl2 = `/${team2.name}/channels/off-topic`;
                cy.apiAddUserToTeam(team2.id, user1.id);
                cy.apiAddUserToTeam(team2.id, user2.id);
            });
        });
    });
    it('MM-T662 /join command for private channels', () => {
        const privateChannelName = `private-channel-${getRandomId()}`;
        cy.apiLogin(user1);
        cy.visit(offTopicUrl1);
        cy.uiCreateChannel({name: privateChannelName, isPrivate: true});
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.uiPostMessageQuickly(`/join ${privateChannelName} `);
        cy.uiGetLhsSection('CHANNELS').get('.active').should('contain', privateChannelName);
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.uiPostMessageQuickly(`/join ~${privateChannelName} `);
        cy.uiGetLhsSection('CHANNELS').find('.active').should('contain', privateChannelName);
        cy.apiLogin(user2);
        cy.visit(offTopicUrl1);
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.uiPostMessageQuickly(`/join ${privateChannelName} `);
        cy.getLastPost().should('contain', 'An error occurred while joining the channel.').and('contain', 'System');
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.uiPostMessageQuickly(`/join ~${privateChannelName} `);
        cy.getLastPost().should('contain', 'An error occurred while joining the channel.').and('contain', 'System');
    });
    it('MM-T663 /open command for private channels', () => {
        const privateChannelName = `private-channel-${getRandomId()}`;
        cy.apiLogin(user1);
        cy.visit(offTopicUrl1);
        cy.uiCreateChannel({name: privateChannelName, isPrivate: true});
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.uiPostMessageQuickly(`/open ${privateChannelName} `);
        cy.uiGetLhsSection('CHANNELS').find('.active').should('contain', privateChannelName);
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.uiPostMessageQuickly(`/open ~${privateChannelName} `);
        cy.uiGetLhsSection('CHANNELS').find('.active').should('contain', privateChannelName);
        cy.apiLogin(user2);
        cy.visit(offTopicUrl1);
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.uiPostMessageQuickly(`/open ${privateChannelName} `);
        cy.getLastPost().should('contain', 'An error occurred while joining the channel.').and('contain', 'System');
        cy.uiGetLhsSection('CHANNELS').findByText('Off-Topic').click();
        cy.uiPostMessageQuickly(`/open ~${privateChannelName} `);
        cy.getLastPost().should('contain', 'An error occurred while joining the channel.').and('contain', 'System');
    });
    it('MM-T687 /msg', () => {
        cy.apiLogin(user1);
        cy.visit(offTopicUrl1);
        const firstMessage = 'First message';
        cy.uiPostMessageQuickly(`/msg @${user2.username} ${firstMessage} `);
        cy.uiWaitUntilMessagePostedIncludes(firstMessage);
        cy.get(`#${team1.name}TeamButton`).children().should('have.class', 'active');
        cy.get(`#sidebarItem_${Cypress._.sortBy([user1.id, user2.id]).join('__')}`).parent().should('be.visible').and('have.class', 'active');
        cy.getLastPost().should('contain', firstMessage).and('contain', user1.username);
        cy.visit(offTopicUrl2);
        const secondMessage = 'Second message';
        cy.uiPostMessageQuickly(`/msg @${user2.username} ${secondMessage} `);
        cy.uiWaitUntilMessagePostedIncludes(secondMessage);
        cy.get(`#${team2.name}TeamButton`).children().should('have.class', 'active');
        cy.get(`#sidebarItem_${Cypress._.sortBy([user1.id, user2.id]).join('__')}`).parent().should('be.visible').and('have.class', 'active');
        cy.getLastPost().should('contain', secondMessage).and('contain', user1.username);
    });
    it('MM-T688 /expand', () => {
        cy.apiLogin(user1);
        cy.visit(offTopicUrl1);
        cy.uiPostMessageQuickly('/expand ');
        cy.getLastPost().should('contain', 'Image links now expand by default').and('contain', 'System');
        cy.postMessage('https://raw.githubusercontent.com/mattermost/mattermost/master/e2e-tests/cypress/tests/fixtures/png-image-file.png');
        cy.getLastPostId().as('postID');
        cy.get('@postID').then((postID) => {
            cy.get(`#post_${postID}`).should('be.visible').within(() => {
                cy.findByLabelText('Toggle Embed Visibility').
                    should('be.visible').and('have.attr', 'data-expanded', 'true');
                cy.findByLabelText('file thumbnail').should('be.visible');
            });
        });
    });
    it('MM-T689 capital letter autocomplete, /collapse', () => {
        cy.apiLogin(user1);
        cy.visit(offTopicUrl1);
        cy.postMessage('https://raw.githubusercontent.com/mattermost/mattermost/master/e2e-tests/cypress/tests/fixtures/png-image-file.png');
        cy.getLastPostId().as('postID');
        cy.clickPostCommentIcon();
        cy.uiGetReplyTextBox().type('/C');
        cy.get('#suggestionList').should('exist').and('be.visible').within(() => {
            cy.findAllByText('collapse').first().should('exist').click();
        });
        cy.uiGetReplyTextBox().type('{enter}');
        cy.get('@postID').then((postID) => {
            cy.get(`#rhsPost_${postID}`).should('be.visible').within(() => {
                cy.findByLabelText('Toggle Embed Visibility').
                    should('be.visible').and('have.attr', 'data-expanded', 'false');
                cy.findByLabelText('file thumbnail').should('not.exist');
            });
        });
        cy.getLastPost().should('contain', 'Image links now collapse by default').and('contain', 'System');
    });
    it('MM-T705 Ephemeral message', () => {
        cy.apiAdminLogin();
        cy.visit(offTopicUrl1);
        cy.postMessage('hello');
        cy.uiOpenProductMenu('Integrations');
        cy.get('#slashCommands').click();
        cy.get('#addSlashCommand').click();
        cy.get('#displayName').type(`Test${timestamp}`);
        cy.get('#trigger').type(commandTrigger);
        cy.get('#url').type(commandURL);
        cy.get('#saveCommand').click();
        cy.get('#doneButton').click();
        cy.findByText('Back to Mattermost').click();
        cy.uiPostMessageQuickly(`/${commandTrigger} `);
        cy.getLastPost().within(() => {
            cy.get('.BotTag').should('exist');
            cy.findByText('Hello World').should('exist');
        });
    });
});