import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Leave channel', () => {
    let testTeam: Team;
    let testUser: UserProfile;
    let testChannel: Channel;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_off',
            },
        });
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.apiSaveUserPreference([{
                user_id: user.id,
                category: 'crt_thread_pane_step',
                name: user.id,
                value: '0',
            }], user.id);
            cy.apiLogin(testUser);
            cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
                testChannel = channel;
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-T4429_1 Leave a channel while RHS is open', () => {
        cy.postMessage('Test leave channel while RHS open');
        cy.getLastPostId().then((id) => {
            cy.clickPostCommentIcon(id);
            cy.postMessageAs({sender: testUser, message: 'another reply!', channelId: testChannel.id, rootId: id});
            cy.get('#rhsContainer').should('be.visible');
            cy.uiGetReplyTextBox();
            cy.uiLeaveChannel();
            cy.wait(TIMEOUTS.TWO_SEC);
            cy.get('#rhsContainer').should('not.exist');
            cy.url().should('include', '/channels/town-square');
            cy.get('#channelHeaderTitle').should('be.visible').and('contain', 'Town Square');
        });
    });
    it('MM-T4429_2 Leave a channel while RHS is open and CRT on', () => {
        cy.uiGetPostTextBox();
        cy.uiChangeCRTDisplaySetting('ON');
        cy.postMessage('Test leave channel while RHS open');
        cy.getLastPostId().then((id) => {
            cy.clickPostCommentIcon(id);
            cy.postMessageAs({sender: testUser, message: 'another reply!', channelId: testChannel.id, rootId: id});
            cy.get('#rhsContainer').should('be.visible');
            cy.uiGetReplyTextBox();
            cy.uiLeaveChannel();
            cy.wait(TIMEOUTS.TWO_SEC);
            cy.get('#rhsContainer').should('not.exist');
            cy.url().should('include', '/channels/town-square');
            cy.get('#channelHeaderTitle').should('be.visible').and('contain', 'Town Square');
        });
    });
});