import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../../../fixtures/timeouts';
import {getRandomId} from '../../../../../utils';
import {getAdminAccount} from '../../../../../support/env';
import {checkboxesTitleToIdMap} from './constants';
import {
    deleteOrEditTeamScheme,
    disablePermission,
    enablePermission,
    goToPermissionsAndCreateTeamOverrideScheme,
    goToSystemScheme,
    saveConfigForChannel,
    saveConfigForScheme,
    visitChannel,
    visitChannelConfigPage,
} from './helpers';
describe('MM-23102 - Channel Moderation - Post Reactions', () => {
    let regularUser: UserProfile;
    let guestUser: UserProfile;
    let testTeam: Team;
    let testChannel: Channel;
    const admin = getAdminAccount();
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup().then(({team, channel, user}) => {
            regularUser = user;
            testTeam = team;
            testChannel = channel;
            cy.apiCreateGuestUser({}).then(({guest}) => {
                guestUser = guest;
                cy.apiAddUserToTeam(testTeam.id, guestUser.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, guestUser.id);
                });
                visitChannel(admin, testChannel, testTeam);
                for (let i = 0; i < 3; i++) {
                    cy.postMessage(`test message ${Date.now()}`);
                }
            });
        });
    });
    it('MM-T1543 Post Reactions option for Guests', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.POST_REACTIONS_GUESTS);
        saveConfigForChannel();
        visitChannel(guestUser, testChannel, testTeam);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('not.exist');
        });
        visitChannelConfigPage(testChannel);
        enablePermission(checkboxesTitleToIdMap.POST_REACTIONS_GUESTS);
        saveConfigForChannel();
        visitChannel(guestUser, testChannel, testTeam);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('exist');
        });
    });
    it('MM-T1544 Post Reactions option for Members', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.POST_REACTIONS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('not.exist');
        });
        visitChannelConfigPage(testChannel);
        enablePermission(checkboxesTitleToIdMap.POST_REACTIONS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('exist');
        });
    });
    it('MM-T1545 Post Reactions option removed for Guests and Members in System Scheme', () => {
        goToSystemScheme();
        cy.get('.guest').should('be.visible').within(() => {
            cy.findByText('Post Reactions').click();
        });
        saveConfigForScheme();
        visitChannelConfigPage(testChannel);
        cy.findByTestId('admin-channel_settings-channel_moderation-postReactions-disabledGuest').
            should('exist').
            and('have.text', 'Post reactions for guests are disabled in System Scheme.');
        cy.findByTestId(checkboxesTitleToIdMap.POST_REACTIONS_MEMBERS).should('not.be.disabled');
        cy.findByTestId(checkboxesTitleToIdMap.POST_REACTIONS_GUESTS).should('be.disabled');
        goToSystemScheme();
        cy.get('#all_users-posts-reactions').click();
        saveConfigForScheme();
        visitChannelConfigPage(testChannel);
        cy.findByTestId('admin-channel_settings-channel_moderation-postReactions-disabledBoth').
            should('exist').
            and('have.text', 'Post reactions for members and guests are disabled in System Scheme.');
        cy.findByTestId(checkboxesTitleToIdMap.POST_REACTIONS_MEMBERS).should('be.disabled');
        cy.findByTestId(checkboxesTitleToIdMap.POST_REACTIONS_GUESTS).should('be.disabled');
        visitChannel(guestUser, testChannel, testTeam);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('not.exist');
        });
        visitChannel(regularUser, testChannel, testTeam);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('not.exist');
        });
    });
    it('MM-T1546_4 Post Reactions option removed for Guests & Members in Team Override Scheme', () => {
        const teamOverrideSchemeName = `post_reactions_${getRandomId()}`;
        goToPermissionsAndCreateTeamOverrideScheme(teamOverrideSchemeName, testTeam);
        visitChannelConfigPage(testChannel);
        cy.findByTestId(checkboxesTitleToIdMap.POST_REACTIONS_MEMBERS).should('have.class', 'checkbox checked');
        visitChannel(regularUser, testChannel, testTeam);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('exist');
        });
        deleteOrEditTeamScheme(teamOverrideSchemeName, 'edit');
        cy.get('#all_users-posts-reactions').click();
        saveConfigForScheme(false);
        cy.wait(TIMEOUTS.ONE_SEC);
        visitChannelConfigPage(testChannel);
        cy.findByTestId(checkboxesTitleToIdMap.POST_REACTIONS_MEMBERS).should('have.class', 'checkbox disabled');
        visitChannel(regularUser, testChannel, testTeam);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover');
            cy.findByTestId('post-reaction-emoji-icon').should('not.exist');
        });
    });
});