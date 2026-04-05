import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Collapsed Reply Threads', () => {
    let testTeam: Team;
    let testUser: UserProfile;
    let otherUser: UserProfile;
    let testChannel: Channel;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, channel, user}) => {
            testTeam = team;
            testUser = user;
            testChannel = channel;
            cy.apiSaveCRTPreference(testUser.id, 'on');
            cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
                otherUser = user1;
                cy.apiAddUserToTeam(testTeam.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, otherUser.id);
                });
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-T4144_1 should show a new messages line for an unread thread', () => {
        cy.postMessageAs({
            sender: testUser,
            message: 'Another interesting post,',
            channelId: testChannel.id,
        }).then(({id: rootId}) => {
            Cypress._.times(20, (i) => {
                cy.postMessageAs({
                    sender: otherUser,
                    message: 'Reply ' + i,
                    channelId: testChannel.id,
                    rootId,
                });
            });
            cy.get(`#post_${rootId}`).click();
            cy.wait(TIMEOUTS.ONE_SEC);
            cy.get('#rhsContainer').findByTestId('NotificationSeparator').scrollIntoView().should('be.visible');
            cy.uiCloseRHS();
        });
    });
    it('MM-T4144_2 should not show a new messages line after viewing the thread', () => {
        cy.getLastPostId().then((rootId) => {
            cy.get(`#post_${rootId}`).click();
            cy.get('#rhsContainer').findByTestId('NotificationSeparator').should('not.exist');
            cy.uiCloseRHS();
        });
    });
    it('MM-T5671 should handle mention counts correctly when marking a thread as unread and unfollowing it', () => {
        cy.postMessageAs({
            sender: otherUser,
            message: `@${testUser.username} Root post for mention test`,
            channelId: testChannel.id,
        }).then(({id: rootId}) => {
            cy.postMessageAs({
                sender: otherUser,
                message: `Hey @${testUser.username}, check this out!`,
                channelId: testChannel.id,
                rootId,
            }).then(({id: replyId}) => {
                cy.postMessageAs({
                    sender: otherUser,
                    message: `Hey @${testUser.username}, check this out too!`,
                    channelId: testChannel.id,
                    rootId,
                });
                cy.get(`#post_${rootId}`).click();
                cy.wait(TIMEOUTS.ONE_SEC);
                cy.uiClickPostDropdownMenu(replyId, 'Mark as Unread', 'RHS_COMMENT');
                cy.wait(TIMEOUTS.ONE_SEC);
                cy.uiCloseRHS();
                cy.apiCreateTeam('team', 'Team').then(({team: otherTeam}) => {
                    cy.reload();
                    cy.get(`#${otherTeam.name}TeamButton`).click();
                    cy.get(`#${testTeam.name}TeamButton`).find('.badge').should('be.visible');
                    cy.get(`#${testTeam.name}TeamButton`).click();
                    cy.uiGetPostThreadFooter(rootId).findByText('Following').click();
                    cy.get(`#${otherTeam.name}TeamButton`).click();
                    cy.get(`#${testTeam.name}TeamButton`).click();
                    cy.get(`#${otherTeam.name}TeamButton`).click();
                    cy.get(`#${testTeam.name}TeamButton`).find('.badge').should('not.exist');
                });
            });
        });
    });
});