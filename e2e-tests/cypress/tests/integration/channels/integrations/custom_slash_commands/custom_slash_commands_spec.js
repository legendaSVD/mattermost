import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {
    enablePermission,
    goToSystemScheme,
    saveConfigForScheme,
} from '../../enterprise/system_console/channel_moderation/helpers';
import {addNewCommand, runSlashCommand} from './helpers';
describe('Slash commands', () => {
    const trigger = 'my_trigger';
    let user1;
    let user2;
    let team1;
    let commandURL;
    const userIds = [];
    let groupChannel;
    let visitLink;
    before(() => {
        cy.requireWebhookServer();
        cy.apiInitSetup().then(({team, user}) => {
            user1 = user;
            team1 = team;
            cy.apiGetChannelByName(team.name, 'town-square').then(({channel}) => {
                commandURL = `${Cypress.env().webhookBaseUrl}/send_message_to_channel?channel_id=${channel.id}`;
            });
            ['charlie', 'diana', 'eddie'].forEach((name) => {
                cy.apiCreateUser({prefix: name, bypassTutorial: true}).then(({user: groupUser}) => {
                    cy.apiAddUserToTeam(team1.id, groupUser.id);
                    userIds.push(groupUser.id);
                });
            });
            userIds.push(user1.id);
            cy.apiCreateGroupChannel(userIds).then(({channel}) => {
                groupChannel = channel;
            });
            cy.apiCreateUser().then(({user: otherUser}) => {
                user2 = otherUser;
                cy.apiAddUserToTeam(team.id, user2.id);
            });
        });
    });
    it('MM-T669 Custom slash command in DM and GM', () => {
        const gmTrigger = 'gm_trigger';
        const dmTrigger = 'dm_trigger';
        cy.apiAdminLogin(user1);
        cy.apiGetChannelByName(team1.name, groupChannel.name).then(({channel}) => {
            const customGMUrl = `${Cypress.env().webhookBaseUrl}/send_message_to_channel?channel_id=${channel.id}`;
            addNewCommand(team1, gmTrigger, customGMUrl);
            visitLink = `/${team1.name}/channels/${groupChannel.name}`;
            runSlashCommand(visitLink, gmTrigger);
            deleteCommand(team1, gmTrigger);
        });
        cy.apiCreateDirectChannel([user1.id, user2.id]).then(() => {
            visitLink = `/${team1.name}/messages/@${user2.username}`;
            cy.visit(visitLink);
        });
        cy.getCurrentChannelId().then((channelId) => {
            const message = `hello from ${user2.username}: ${Date.now()}`;
            cy.postMessageAs({sender: user2, message, channelId});
            const customDMUrl = `${Cypress.env().webhookBaseUrl}/send_message_to_channel?channel_id=${channelId}`;
            addNewCommand(team1, dmTrigger, customDMUrl);
            runSlashCommand(visitLink, dmTrigger);
            deleteCommand(team1, dmTrigger);
        });
    });
    it('MM-T696 Can\'t delete other user\'s slash command', () => {
        cy.apiAdminLogin(user1);
        addNewCommand(team1, trigger, 'http://dot.com');
        goToSystemScheme();
        enablePermission('all_users-integrations-manage_slash_commands-checkbox');
        saveConfigForScheme();
        cy.apiLogin(user2);
        cy.visit(`/${team1.name}/integrations/commands/installed`);
        cy.contains(`/${trigger}`);
        cy.contains('Edit').should('not.exist');
        cy.contains('Delete').should('not.exist');
        cy.apiAdminLogin(user1);
        deleteCommand(team1, trigger);
    });
    it('MM-T697 Delete slash command', () => {
        addNewCommand(team1, trigger, 'http://dot.com');
        deleteCommand(team1, trigger);
        cy.visit(`/${team1.name}/channels/town-square`);
        cy.uiGetPostTextBox().clear().type(`/${trigger} {enter}`);
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.findByText(`Command with a trigger of '/${trigger}' not found.`).should('exist').and('be.visible');
    });
    it('MM-T700 Slash command - Override username', () => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnablePostUsernameOverride: true,
            },
        });
        addNewCommand(team1, trigger, commandURL);
        cy.visit(`/${team1.name}/integrations/commands/installed`);
        cy.get('.backstage-list').find('.backstage-list__item').first().findByText('Edit').click();
        cy.get('#username').type('newname');
        cy.get('#saveCommand').click();
        cy.visit(`/${team1.name}/channels/town-square`);
        cy.postMessage(`/${trigger} `);
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.getLastPost().within(() => {
            cy.get('.post__header').find('.user-popover').as('usernameForPopover').should('have.text', 'newname');
        });
        deleteCommand(team1, trigger);
    });
    it('MM-T701 Slash command - Override profile picture', () => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnablePostIconOverride: true,
            },
        });
        addNewCommand(team1, trigger, commandURL);
        cy.visit(`/${team1.name}/integrations/commands/installed`);
        cy.get('.backstage-list').find('.backstage-list__item').first().findByText('Edit').click();
        const iconURL = 'https://mattermost.com/wp-content/uploads/2022/02/icon_WS.png';
        cy.get('#iconUrl').type(iconURL);
        cy.get('#saveCommand').click();
        cy.visit(`/${team1.name}/channels/town-square`);
        cy.postMessage(`/${trigger} `);
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.getLastPost().within(() => {
            const baseUrl = Cypress.config('baseUrl');
            const encodedIconUrl = encodeURIComponent(iconURL);
            cy.get('.profile-icon > img').as('profileIconForPopover').should('have.attr', 'src', `${baseUrl}/api/v4/image?url=${encodedIconUrl}`);
        });
        deleteCommand(team1, trigger);
    });
    it('MM-T703 Show custom slash command in autocomplete', () => {
        addNewCommand(team1, trigger, commandURL);
        cy.visit(`/${team1.name}/integrations/commands/installed`);
        cy.get('.backstage-list').find('.backstage-list__item').first().findByText('Edit').click();
        cy.get('#autocomplete').click();
        const hint = '[test-hint]';
        cy.get('#autocompleteHint').type(hint);
        const desc = 'Auto description';
        cy.get(':nth-child(10) > .col-md-5 > #description').type(desc);
        cy.get('#saveCommand').click();
        cy.visit(`/${team1.name}/channels/town-square`);
        cy.uiGetPostTextBox().clear().type('/');
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.contains(trigger);
        cy.uiGetPostTextBox().type(trigger);
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.get('.slash-command__title').should('have.text', `${trigger} ${hint}`);
        cy.get('.slash-command__desc').should('have.text', `${desc}`);
        cy.visit(`/${team1.name}/integrations/commands/installed`);
        cy.get('.backstage-list').find('.backstage-list__item').first().findByText('Edit').click();
        cy.get('#autocomplete').click();
        cy.get('#saveCommand').click();
        cy.visit(`/${team1.name}/channels/town-square`);
        cy.uiGetPostTextBox().clear().type('/');
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.contains(trigger).should('not.exist');
        deleteCommand(team1, trigger);
    });
});
function deleteCommand(team, trigger) {
    cy.visit(`/${team.name}/integrations/commands/installed`);
    cy.get('.backstage-list').find('.backstage-list__item').first().findByText(`- /${trigger}`).should('be.visible');
    cy.get('.backstage-list').find('.backstage-list__item').first().findByText('Delete').click();
    cy.get('#confirmModalButton').click();
    cy.get('.backstage-list').find('.backstage-list__item').first().findByText(`- /${trigger}`).should('not.exist');
}