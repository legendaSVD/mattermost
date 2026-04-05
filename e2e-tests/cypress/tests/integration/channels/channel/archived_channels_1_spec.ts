import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {getRandomId} from '../../../utils';
describe('Leave an archived channel', () => {
    let testTeam: Team;
    let offTopicUrl: string;
    const channelType = {
        all: 'Channel Type: All',
        public: 'Channel Type: Public',
        archived: 'Channel Type: Archived',
    };
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, offTopicUrl: url}) => {
            testTeam = team;
            offTopicUrl = url;
            cy.visit(offTopicUrl);
            cy.postMessage('hello');
        });
    });
    it('MM-T1680 Open archived channel from search results with permalink view in another channel is open', () => {
        cy.visit(`/${testTeam.name}`);
        cy.uiCreateChannel({isNewSidebar: true});
        const archivedPostText = `archived${getRandomId()}`;
        cy.postMessage(archivedPostText);
        cy.getLastPostId().as('archivedPostId');
        cy.uiArchiveChannel();
        cy.visit(offTopicUrl);
        const otherPostText = `post${getRandomId()}`;
        cy.postMessage(otherPostText);
        cy.getLastPostId().as('otherPostId');
        cy.uiSearchPosts(otherPostText);
        cy.get<string>('@otherPostId').then((otherPostId) => cy.uiJumpToSearchResult(otherPostId));
        cy.uiSearchPosts(archivedPostText);
        cy.get<string>('@archivedPostId').then((archivedPostId) => {
            cy.clickPostCommentIcon(archivedPostId, 'SEARCH');
            cy.get('#searchContainer').should('not.exist');
            cy.get('#rhsContainer').should('be.visible');
            cy.get(`#rhsPost_${archivedPostId}`).should('be.visible');
            cy.get('#rhsContainer .channel-archived-warning__container').should('be.visible');
            cy.get('#rhsContainer .channel-archived-warning__content').should('be.visible');
        });
    });
    it('MM-T1697 - Browse Public channels shows archived channels option', () => {
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiArchiveChannel();
            cy.uiBrowseOrCreateChannel('Browse channels');
            cy.get('#browseChannelsModal').should('be.visible');
            cy.findByText(channelType.all).should('be.visible').click();
            cy.findByText('Archived channels').click();
            cy.get('#moreChannelsList').should('contain', channel.display_name);
        });
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-T1699 - Browse Channels for all channel types shows archived channels option', () => {
        let archivedPrivateChannel: Channel;
        let archivedPublicChannel: Channel;
        cy.uiCreateChannel({isPrivate: true, isNewSidebar: true}).as('channel').then((channel) => {
            archivedPrivateChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${archivedPrivateChannel.name}`);
            cy.uiArchiveChannel();
        });
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
            archivedPublicChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${archivedPublicChannel.name}`);
            cy.uiArchiveChannel();
        });
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible').then(() => {
            cy.findByText(channelType.all).should('be.visible').click();
            cy.findByText('Archived channels').click();
            cy.get('#moreChannelsList').should('contain', archivedPrivateChannel.name);
            cy.get('#moreChannelsList').should('contain', archivedPublicChannel.display_name);
        });
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-T1700 - All archived public channels are shown Important', () => {
        let archivedPublicChannel1: Channel;
        let archivedPublicChannel2: Channel;
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
            archivedPublicChannel1 = channel;
            cy.visit(`/${testTeam.name}/channels/${archivedPublicChannel1.name}`);
            cy.uiArchiveChannel();
        });
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
            archivedPublicChannel2 = channel;
            cy.visit(`/${testTeam.name}/channels/${archivedPublicChannel2.name}`);
            cy.uiArchiveChannel();
            cy.uiLeaveChannel();
            cy.url().should('include', `/${testTeam.name}/channels/${archivedPublicChannel1.name}`);
        });
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible').then(() => {
            cy.findByText(channelType.all).should('be.visible').click();
            cy.findByText('Archived channels').click();
            cy.get('#moreChannelsList').should('contain', archivedPublicChannel1.display_name);
            cy.get('#moreChannelsList').should('contain', archivedPublicChannel2.display_name);
        });
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-T1701 - Only Private channels you are a member of are displayed', () => {
        let archivedPrivateChannel1: Channel;
        let archivedPrivateChannel2: Channel;
        cy.uiCreateChannel({isPrivate: true, isNewSidebar: true}).as('channel').then((channel) => {
            archivedPrivateChannel1 = channel;
            cy.visit(`/${testTeam.name}/channels/${archivedPrivateChannel1.name}`);
            cy.uiArchiveChannel();
        });
        cy.uiCreateChannel({isPrivate: true, isNewSidebar: true}).as('channel').then((channel) => {
            archivedPrivateChannel2 = channel;
            cy.visit(`/${testTeam.name}/channels/${archivedPrivateChannel2.name}`);
            cy.uiArchiveChannel();
            cy.uiLeaveChannel();
        });
        cy.get('#confirmModal').should('be.visible');
        cy.get('#confirmModalButton').click();
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible').then(() => {
            cy.findByText(channelType.all).should('be.visible').click();
            cy.findByText('Archived channels').click();
            cy.get('#moreChannelsList').should('contain', archivedPrivateChannel1.name);
            cy.get('#moreChannelsList').should('not.contain', archivedPrivateChannel2.name);
        });
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-T1703 - User can open archived channels', () => {
        let archivedChannel: Channel;
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
            archivedChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${archivedChannel.name}`);
            cy.uiArchiveChannel();
        });
        cy.uiBrowseOrCreateChannel('Browse channels');
        cy.get('#browseChannelsModal').should('be.visible').then(() => {
            cy.findByText(channelType.all).should('be.visible').click();
            cy.findByText('Archived channels').click();
            cy.get('#moreChannelsList').should('contain', archivedChannel.display_name);
        });
        cy.get('body').typeWithForce('{esc}');
    });
});