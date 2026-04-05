import {Channel, ServerChannel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {getAdminAccount} from '../../../support/env';
import {getRandomId} from '../../../utils';
describe('Leave an archived channel', () => {
    let testTeam: Team;
    let testUser: UserProfile;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/off-topic`);
    });
    it('MM-T1687 App does not crash when another user archives a channel', () => {
        cy.makeClient({user: getAdminAccount()}).then(async (client) => {
            const channelName = `channel${getRandomId()}`;
            const channelTest = {
                display_name: channelName,
                name: channelName,
                team_id: testTeam.id,
                type: 'P',
            } as Channel;
            cy.wrap(client.createChannel(channelTest)).then(async (channel: ServerChannel) => {
                await client.addToChannel(testUser.id, channel.id);
                return channel;
            }).then((channel) => {
                cy.get(`#sidebarItem_${channel.name}`).should('be.visible');
                cy.wrap(channel);
            }).then(async (channel) => {
                await client.deleteChannel(channel.id);
                cy.get(`#sidebarItem_${channel.name}`).should('not.exist');
            });
        });
    });
    it('MM-T1688 archived channels only appear in search results as long as the user does not leave them', () => {
        cy.uiCreateChannel({isNewSidebar: true}).then(({name: channelName}) => {
            const archivedPostText = `archived${getRandomId()}`;
            cy.postMessage(archivedPostText);
            cy.getLastPostId().then((archivedPostId) => {
                cy.uiArchiveChannel();
                cy.get('#sidebarItem_off-topic').click();
                cy.get(`#sidebarItem_${channelName}`).should('not.exist');
                cy.uiSearchPosts(archivedPostText);
                cy.get(`#searchResult_${archivedPostId}`).should('be.visible');
                cy.uiJumpToSearchResult(archivedPostId);
                cy.url().should('include', `/${testTeam.name}/channels/${channelName}`);
                cy.uiLeaveChannel();
                cy.url().should('include', `/${testTeam.name}/channels/off-topic`);
                cy.postMessage('hello');
                cy.uiSearchPosts(archivedPostText);
                cy.get(`#searchResult_${archivedPostId}`).should('not.exist');
                cy.get('#search-items-container .no-results__wrapper').should('be.visible');
            });
        });
    });
});