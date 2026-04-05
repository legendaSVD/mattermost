import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {createPrivateChannel} from '../enterprise/elasticsearch_autocomplete/helpers';
const channelType = {
    all: 'Channel Type: All',
    public: 'Channel Type: Public',
    archived: 'Channel Type: Archived',
};
describe('Channels', () => {
    let testUser: UserProfile;
    let otherUser: UserProfile;
    let testTeam: Team;
    let testChannel: Channel;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiCreateUser().then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id);
            });
            cy.apiLogin(testUser).then(() => {
                cy.apiCreateChannel(testTeam.id, 'channel-test', 'Channel').then(({channel}) => {
                    testChannel = channel;
                });
                cy.visit(`/${team.name}/channels/town-square`);
            });
        });
    });
    it('MM-19337 Verify UI of Browse channels modal with archived selection as admin', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible').within(() => {
            cy.get('#menuWrapper').should('be.visible').and('have.text', channelType.all);
        });
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-19337 Verify UI of Browse channels modal with archived selection as regular user', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible').within(() => {
            cy.get('#menuWrapper').should('be.visible').and('have.text', channelType.all);
        });
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-19337 Enable users to view archived channels', () => {
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible').within(() => {
            cy.get('#menuWrapper').should('be.visible').and('contain', channelType.all).wait(TIMEOUTS.HALF_SEC);
            cy.get('#searchChannelsTextbox').should('be.visible').type(testChannel.display_name).wait(TIMEOUTS.HALF_SEC);
            cy.get('#moreChannelsList').should('be.visible').children().should('have.length', 1).within(() => {
                cy.findByText(testChannel.display_name).should('be.visible');
            });
            cy.get('#searchChannelsTextbox').clear();
            cy.get('#moreChannelsList').should('be.visible').within(() => {
                cy.findByText(testChannel.display_name).scrollIntoView().should('be.visible').click();
            });
        });
        cy.get('#browseChannelsModal').should('exist');
        cy.url().should('include', `/${testTeam.name}/channels/${testChannel.name}`);
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channelHeaderTitle').should('contain', testChannel.display_name).click();
        cy.get('#channelHeaderDropdownMenu').should('be.visible').within(() => {
            cy.findByText('Archive Channel').should('be.visible').click();
        });
        cy.get('#deleteChannelModal').should('be.visible').within(() => {
            cy.findByText('Archive').should('be.visible').click();
        });
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible');
        cy.get('#menuWrapper').should('be.visible').click();
        cy.findByText('Archived channels').should('be.visible').click();
        cy.get('#menuWrapper').should('contain', channelType.archived);
        cy.get('#searchChannelsTextbox').should('be.visible').type(testChannel.display_name).wait(TIMEOUTS.HALF_SEC);
        cy.get('#moreChannelsList').children().should('have.length', 1).within(() => {
            cy.findByText(testChannel.display_name).should('be.visible');
        });
        cy.get('#searchChannelsTextbox').clear();
        cy.get('#moreChannelsList').should('be.visible').within(() => {
            cy.findByText(testChannel.display_name).scrollIntoView().should('be.visible').click();
        });
        cy.get('#channelArchivedMessage').should('contain', 'You are viewing an archived channel. New messages cannot be posted.');
        cy.uiGetPostTextBox({exist: false});
        cy.get('#sidebarItem_town-square').click();
        cy.get('#sidebar-left').should('not.contain', testChannel.display_name);
    });
    it('MM-19337 Increase channel member count when user joins a channel', () => {
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        let newChannel: Channel;
        cy.apiCreateChannel(testTeam.id, 'channel-to-leave', 'Channel to leave').then(({channel}) => {
            newChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${newChannel.name}`);
            cy.uiLeaveChannel();
            cy.url().should('include', '/channels/town-square');
        });
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible').within(() => {
            cy.findByTestId(`channelMemberCount-${newChannel.name}`).should('be.visible').and('contain', 0);
            cy.findByTestId(`ChannelRow-${newChannel.name}`).scrollIntoView().should('be.visible').click();
            cy.findByTestId(`channelMemberCount-${newChannel.name}`).should('be.visible').and('contain', 1);
        });
    });
    it('MM-T1702 Search works when changing public/all options in the dropdown', () => {
        cy.apiAdminLogin();
        let newChannel: Channel;
        let testArchivedChannel: Channel;
        let testPrivateArchivedChannel: Channel;
        cy.apiCreateTeam('team', 'Test NoMember').then(({team}) => {
            cy.apiCreateChannel(team.id, 'not-archived-channel', 'Not Archived Channel').then(({channel}) => {
                newChannel = channel;
                cy.visit(`/${team.name}/channels/${newChannel.name}`);
                cy.uiLeaveChannel();
                cy.url().should('include', '/channels/town-square');
            });
            cy.apiCreateChannel(team.id, 'archived-channel', 'Archived Channel').then(({channel}) => {
                testArchivedChannel = channel;
                cy.visit(`/${team.name}/channels/${testArchivedChannel.name}`);
                cy.uiArchiveChannel();
                cy.uiLeaveChannel();
                cy.url().should('include', '/channels/town-square');
            });
            createPrivateChannel(team.id).then((channel) => {
                testPrivateArchivedChannel = channel;
                cy.visit(`/${team.name}/channels/${testPrivateArchivedChannel.name}`);
                cy.uiArchiveChannel();
                cy.visit(`/${team.name}/channels/town-square`);
            });
        });
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#menuWrapper').should('be.visible').within((el) => {
            cy.wrap(el).should('contain', channelType.all);
        });
        cy.get('#searchChannelsTextbox').should('be.visible').type('iv').wait(TIMEOUTS.HALF_SEC);
        cy.get('#moreChannelsList').should('be.visible').children().should('have.length', 2);
        cy.get('#moreChannelsList').should('be.visible').within(() => {
            cy.findByText(newChannel.display_name).should('be.visible');
        });
        cy.get('#browseChannelsModal').should('be.visible');
        cy.get('#menuWrapper').should('be.visible').and('contain', channelType.all).click().wait(TIMEOUTS.HALF_SEC);
        cy.findByText('Archived channels').should('be.visible').click();
        cy.get('#menuWrapper').should('contain', channelType.archived);
        cy.get('#searchChannelsTextbox').clear();
        cy.get('#moreChannelsList').should('be.visible').children().should('have.length', 2);
        cy.get('#moreChannelsList').within(() => {
            cy.findByText(testArchivedChannel.display_name).should('be.visible');
            cy.findByText(testPrivateArchivedChannel.display_name).should('be.visible');
        });
    });
});