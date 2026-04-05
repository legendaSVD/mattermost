import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {demoPlugin} from '../../../../utils/plugins';
describe('Demo plugin - Webhook events', () => {
    let team1;
    let team2;
    let testUser;
    let admin;
    let testChannel;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        const newSettings = {
            PluginSettings: {
                Enable: true,
            },
            ServiceSettings: {
                EnableGifPicker: true,
            },
            FileSettings: {
                EnablePublicLink: true,
            },
        };
        cy.apiUpdateConfig(newSettings);
        cy.apiInitSetup().then(({team, user}) => {
            admin = user;
            team1 = team;
            cy.apiCreateTeam('team', 'Team').then(({team: anotherTeam}) => {
                team2 = anotherTeam;
            });
            cy.apiUploadAndEnablePlugin(demoPlugin);
            cy.visit(`/${team1.name}/channels/off-topic`);
            cy.postMessage('/demo_plugin true ').wait(TIMEOUTS.TWO_SEC);
            cy.getLastPost().contains('enabled', {matchCase: false});
            cy.apiCreateChannel(team.id, 'my_test_channel', 'my_test_channel').then(({channel}) => {
                testChannel = channel.name;
            });
            cy.visit(`/${team1.name}/channels/demo_plugin`);
            cy.apiCreateUser().then(({user: otherUser}) => {
                testUser = otherUser;
                cy.apiAddUserToTeam(team.id, testUser.id);
                cy.apiLogin(testUser);
                cy.visit(`/${team1.name}/channels/demo_plugin`);
            });
        });
    });
    it('MM-T2408_1 - User posts a message Webhook event', () => {
        cy.visit(`/${team1.name}/channels/off-topic`);
        cy.postMessage('MM-T2408_1');
        cy.visit(`/${team1.name}/channels/demo_plugin`);
        cy.findAllByTestId('postView').should('contain', `MessageHasBeenPosted: @${testUser.username}, ~Town Square`);
    });
    it('MM-T2408_2 - User joined a channel Webhook event', () => {
        cy.visit(`/${team1.name}/channels/${testChannel}`).wait(TIMEOUTS.ONE_SEC);
        cy.postMessage('MM-T2408_2');
        cy.visit(`/${team1.name}/channels/demo_plugin`);
        cy.findAllByTestId('postView').should('contain', `UserHasJoinedChannel: @${testUser.username}, ~my_test_channel`);
    });
    it('MM-T2408_3 - ​User left a channel Webhook event', () => {
        cy.visit(`/${team1.name}/channels/${testChannel}`);
        cy.uiLeaveChannel(false);
        cy.visit(`/${team1.name}/channels/demo_plugin`);
        cy.findAllByTestId('postView').should('contain', `UserHasLeftChannel: @${testUser.username}, ~my_test_channel`);
    });
    it('MM-T2408_4 - User edited a message Webhook event', () => {
        cy.visit(`/${team1.name}/channels/off-topic`);
        cy.postMessage('MM-T2408_4');
        cy.getLastPostId().then((postID) => {
            cy.clickPostDotMenu();
            cy.get(`#edit_post_${postID}`).click();
            cy.get('#edit_textbox').
                should('be.visible').
                and('be.focused').
                wait(TIMEOUTS.HALF_SEC).
                type('MM-T2408_4 edited').
                type('{enter}');
            cy.visit(`/${team1.name}/channels/demo_plugin`);
            cy.findAllByTestId('postView').should('contain', `MessageHasBeenUpdated: @${testUser.username}, ~Off-Topic`);
        });
    });
    it('MM-T2408_5 - User adds a reaction to a message Webhook event', () => {
        cy.visit(`/${team1.name}/channels/off-topic`);
        cy.postMessage('MM-T2408_5');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker('slightly_frowning_face');
            cy.visit(`/${team1.name}/channels/demo_plugin`);
            cy.findAllByTestId('postView').should('contain', `ReactionHasBeenAdded: @${testUser.username}, `).and('contain', ':slightly_frowning_face:');
        });
    });
    it('MM-T2408_6 - ​User joined the team Webhook event', () => {
        cy.apiAdminLogin(admin);
        cy.apiAddUserToTeam(team2.id, testUser.id);
        cy.visit(`/${team2.name}/channels/demo_plugin`);
        cy.findAllByTestId('postView').should('contain', `UserHasJoinedTeam: @${testUser.username}`);
    });
    it('MM-T2408_7 - ​User left a team Webhook event', () => {
        cy.apiDeleteUserFromTeam(team2.id, testUser.id);
        cy.visit(`/${team2.name}/channels/demo_plugin`);
        cy.findAllByTestId('postView').should('contain', `UserHasLeftTeam: @${testUser.username}`);
    });
    it('MM-T2408_8 - ​User user login Webhook event', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${team1.name}/channels/demo_plugin`);
        cy.findAllByTestId('postView').should('contain', `User @${testUser.username} has logged in`);
    });
    it('MM-T2408_9 - ​User user created Webhook event', () => {
        cy.apiAdminLogin(admin);
        cy.apiCreateUser().then(({user: otherUser}) => {
            cy.visit(`/${team1.name}/channels/demo_plugin`);
            cy.findAllByTestId('postView').should('contain', `User_ID @${otherUser.id} has been created in`);
        });
    });
});