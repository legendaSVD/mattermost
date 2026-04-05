import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Collapsed Reply Threads', () => {
    let userA: UserProfile;
    let teamA: Team;
    let teamB: Team;
    let offTopicUrlA: string;
    let testChannel: Channel;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_on',
            },
        });
        cy.apiInitSetup().then(({team, user, offTopicUrl: url}) => {
            userA = user;
            teamA = team;
            offTopicUrlA = url;
            cy.apiCreateUser().then(() => {
                return cy.apiCreateTeam('team', 'Team');
            }).then(({team: otherTeam}) => {
                teamB = otherTeam;
                return cy.apiAddUserToTeam(teamB.id, userA.id);
            }).then(() => {
                return cy.apiCreateChannel(teamA.id, 'test', 'Test');
            }).then(({channel}) => {
                testChannel = channel;
                return cy.apiAddUserToChannel(testChannel.id, userA.id);
            });
        });
    });
    beforeEach(() => {
        cy.apiLogin(userA);
        cy.visit(offTopicUrlA);
    });
    it('MM-T4887 should stay on threads view when switching teams', () => {
        cy.visit(`/${teamA.name}/channels/town-square`);
        cy.get(`#${teamB.name}TeamButton`, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
        cy.uiGetLHSHeader().findByText(teamB.display_name);
        cy.uiGetSidebarThreadsButton().click();
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.url().should('include', `${teamB.name}/threads`);
        cy.get(`#${teamA.name}TeamButton`, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
        cy.url().should('include', `${teamA.name}/channels/town-square`);
    });
    it('MM-T4843_1 should go to threads view when switching a team if that was the last view on that team', () => {
        cy.uiGetSidebarThreadsButton().click();
        cy.get(`#${teamB.name}TeamButton`, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
        cy.uiGetLHSHeader().findByText(teamB.display_name);
        cy.get(`#${teamA.name}TeamButton`, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
        cy.url().should('include', `${teamA.name}/threads`);
    });
    it('MM-T4843_2 should go to threads view when threads view is the penultimate view and leave the current channel', () => {
        cy.uiGetSidebarThreadsButton().click();
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.uiClickSidebarItem(testChannel.name);
        cy.uiLeaveChannel();
        cy.url().should('include', `${teamA.name}/threads`);
    });
});