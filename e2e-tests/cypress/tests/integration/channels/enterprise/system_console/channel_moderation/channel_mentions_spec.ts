import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {checkboxesTitleToIdMap} from './constants';
import {
    disablePermission,
    enablePermission,
    postChannelMentionsAndVerifySystemMessageExist,
    postChannelMentionsAndVerifySystemMessageNotExist,
    saveConfigForChannel,
    saveConfigForScheme,
    visitChannel,
    visitChannelConfigPage,
} from './helpers';
describe('MM-23102 - Channel Moderation - Channel Mentions', () => {
    let regularUser: UserProfile;
    let guestUser: UserProfile;
    let testTeam: Team;
    let testChannel: Channel;
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
            });
        });
    });
    it('MM-T1551 Channel Mentions option for Guests', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_GUESTS);
        saveConfigForChannel();
        visitChannel(guestUser, testChannel, testTeam);
        postChannelMentionsAndVerifySystemMessageExist(testChannel.name);
        visitChannelConfigPage(testChannel);
        enablePermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_GUESTS);
        saveConfigForChannel();
        visitChannel(guestUser, testChannel, testTeam);
        postChannelMentionsAndVerifySystemMessageNotExist(testChannel);
    });
    it('MM-T1552 Channel Mentions option for Members', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        postChannelMentionsAndVerifySystemMessageExist(testChannel.name);
        visitChannelConfigPage(testChannel);
        enablePermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        postChannelMentionsAndVerifySystemMessageNotExist(testChannel);
    });
    it('MM-T1555 Channel Mentions option removed when Create Post is disabled', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.CREATE_POSTS_GUESTS);
        cy.findByTestId('admin-channel_settings-channel_moderation-channelMentions-disabledGuestsDueToCreatePosts').
            should('have.text', 'Guests can not use channel mentions without the ability to create posts.');
        cy.findByTestId(checkboxesTitleToIdMap.CHANNEL_MENTIONS_GUESTS).should('be.disabled');
        enablePermission(checkboxesTitleToIdMap.CREATE_POSTS_GUESTS);
        disablePermission(checkboxesTitleToIdMap.CREATE_POSTS_MEMBERS);
        cy.findByTestId('admin-channel_settings-channel_moderation-channelMentions-disabledMemberDueToCreatePosts').
            should('have.text', 'Members can not use channel mentions without the ability to create posts.');
        cy.findByTestId(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS).should('be.disabled');
        disablePermission(checkboxesTitleToIdMap.CREATE_POSTS_GUESTS);
        cy.findByTestId('admin-channel_settings-channel_moderation-channelMentions-disabledBothDueToCreatePosts').
            should('have.text', 'Guests and members can not use channel mentions without the ability to create posts.');
        cy.findByTestId(checkboxesTitleToIdMap.CHANNEL_MENTIONS_GUESTS).should('be.disabled');
        cy.findByTestId(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS).should('be.disabled');
    });
    it('MM-T1556 Message when user without channel mention permission uses special channel mentions', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        cy.findByTestId('post_textbox').clear().type('@');
        cy.findAllByTestId('mentionSuggestion_here').should('not.exist');
        cy.findAllByTestId('mentionSuggestion_all').should('not.exist');
        cy.findAllByTestId('mentionSuggestion_channel').should('not.exist');
        postChannelMentionsAndVerifySystemMessageExist(testChannel.name);
    });
    it('MM-T1557 Confirm sending notifications while using special channel mentions', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.CHANNEL_MENTIONS_MEMBERS);
        saveConfigForChannel();
        cy.visit('admin_console/environment/notifications');
        cy.findByTestId('TeamSettings.EnableConfirmNotificationsToChanneltrue').check();
        saveConfigForScheme();
        visitChannel(regularUser, testChannel, testTeam);
        cy.postMessage('@all ');
        cy.get('#genericModalLabel').should('not.exist');
        cy.postMessage('@channel ');
        cy.get('#genericModalLabel').should('not.exist');
        cy.postMessage('@here ');
        cy.get('#genericModalLabel').should('not.exist');
    });
});