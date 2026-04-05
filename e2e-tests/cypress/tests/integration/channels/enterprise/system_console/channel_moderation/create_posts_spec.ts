import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {checkboxesTitleToIdMap} from './constants';
import {
    disablePermission,
    enablePermission,
    saveConfigForChannel,
    visitChannel,
    visitChannelConfigPage,
} from './helpers';
describe('MM-23102 - Channel Moderation - Create Posts', () => {
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
    it('MM-T1541 Create Post option for Guests', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.CREATE_POSTS_GUESTS);
        saveConfigForChannel();
        visitChannel(guestUser, testChannel, testTeam);
        cy.findByTestId('post_textbox').should('have.attr', 'placeholder', 'This channel is read-only. Only members with permission can post here.');
        cy.findByTestId('post_textbox').should('be.disabled');
        visitChannelConfigPage(testChannel);
        enablePermission(checkboxesTitleToIdMap.CREATE_POSTS_GUESTS);
        saveConfigForChannel();
        visitChannel(guestUser, testChannel, testTeam);
        cy.findByTestId('post_textbox').clear();
        cy.findByTestId('post_textbox').should('have.attr', 'placeholder', `Write to ${testChannel.display_name}`);
        cy.findByTestId('post_textbox').should('not.be.disabled');
    });
    it('MM-T1542 Create Post option for Members', () => {
        visitChannelConfigPage(testChannel);
        disablePermission(checkboxesTitleToIdMap.CREATE_POSTS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        cy.findByTestId('post_textbox').should('have.attr', 'placeholder', 'This channel is read-only. Only members with permission can post here.');
        cy.findByTestId('post_textbox').should('be.disabled');
        visitChannelConfigPage(testChannel);
        enablePermission(checkboxesTitleToIdMap.CREATE_POSTS_MEMBERS);
        saveConfigForChannel();
        visitChannel(regularUser, testChannel, testTeam);
        cy.findByTestId('post_textbox').clear();
        cy.findByTestId('post_textbox').should('have.attr', 'placeholder', `Write to ${testChannel.display_name}`);
        cy.findByTestId('post_textbox').should('not.be.disabled');
    });
});