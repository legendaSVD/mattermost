import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as MESSAGES from '../../../fixtures/messages';
import {matterpollPlugin} from '../../../utils/plugins';
import {interceptFileUpload} from '../files_and_attachments/helpers';
describe('Collapsed Reply Threads', () => {
    let testTeam: Team;
    let testChannel: Channel;
    let user1: UserProfile;
    before(() => {
        cy.apiUpdateConfig({
            PluginSettings: {
                Enable: true,
            },
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, channel, user}) => {
            testTeam = team;
            user1 = user;
            testChannel = channel;
            cy.apiSaveCRTPreference(user1.id, 'on');
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        interceptFileUpload();
    });
    it('MM-T4776 should display poll text without Markdown in the threads list', () => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiUploadAndEnablePlugin(matterpollPlugin);
        cy.postMessage('/poll "Do you like https:
        cy.getLastPostId().then((pollId) => {
            cy.postMessageAs({sender: user1, message: MESSAGES.SMALL, channelId: testChannel.id, rootId: pollId});
            cy.findByText('Yes').click();
            cy.uiClickSidebarItem('threads');
            cy.get('.attachment__truncated').first().should('have.text', user1.nickname + ': Do you like https://mattermost.com?');
            cy.get('.attachment__truncated').last().should('have.text', 'Total votes: 1');
            cy.get('.ThreadItem').last().click();
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            cy.findByText('End Poll').click();
            cy.findByText('End').click();
            cy.uiClickSidebarItem('threads');
            cy.get('.attachment__truncated').first().should('have.text', user1.nickname + ': Do you like https://mattermost.com?');
            cy.get('.attachment__truncated').last().should('have.text', 'This poll has ended. The results are:');
            cy.apiDeletePost(pollId);
        });
    });
});