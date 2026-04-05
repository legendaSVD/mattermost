import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    FixedCloudConfig,
    getMentionEmailTemplate,
    verifyEmailBody,
} from '../../../utils';
describe('Notifications', () => {
    let config;
    let sender;
    let testTeam;
    let testChannel;
    let testChannelUrl;
    let receiver;
    before(() => {
        cy.shouldHaveEmailEnabled();
        cy.apiGetConfig().then((data) => {
            ({config} = data);
        });
        cy.apiInitSetup().then(({team, channel, user, channelUrl}) => {
            testTeam = team;
            testChannel = channel;
            testChannelUrl = channelUrl;
            sender = user;
            cy.apiCreateUser().then(({user: user1}) => {
                receiver = user1;
                cy.apiAddUserToTeam(testTeam.id, receiver.id).then(() => {
                    cy.apiAddUserToChannel(testChannel.id, receiver.id);
                    cy.apiLogin(receiver);
                    cy.visit(testChannelUrl);
                    cy.uiOpenSettingsModal().within(() => {
                        cy.findByRole('heading', {name: 'Email notifications'}).should('be.visible').click();
                        cy.findByRole('radio', {name: 'Immediately'}).click().should('be.checked');
                        cy.uiSaveAndClose();
                    });
                    cy.uiGetSetStatusButton().click();
                    cy.findByText('Offline').should('be.visible').click();
                    cy.apiLogout();
                    cy.apiLogin(sender);
                    cy.visit(testChannelUrl);
                });
            });
        });
    });
    it('MM-T506 Channel links show as links in notification emails', () => {
        const baseUrl = Cypress.config('baseUrl');
        const message = {
            orig: `This is a message in ~${testChannel.name} channel for @${receiver.username} `,
            emailLinked: `This is a message in ~${testChannel.name} ( ${baseUrl}/landing#/${testTeam.name}/channels/${testChannel.name} ) channel for @${receiver.username}`,
            posted: `This is a message in ~${testChannel.display_name} channel for @${receiver.username} `,
        };
        cy.postMessage(message.orig);
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.getLastPostId().then((postId) => {
            cy.apiLogin(receiver);
            cy.visit(testChannelUrl);
            cy.get('#confirmModalButton').
                should('be.visible').
                and('have.text', 'Yes, set my status to "Online"').
                click();
            cy.getRecentEmail(receiver).then((data) => {
                const {body, from, subject} = data;
                const siteName = config.TeamSettings.SiteName;
                const feedbackEmail = config.EmailSettings.FeedbackEmail || FixedCloudConfig.EmailSettings.FEEDBACK_EMAIL;
                expect(from).to.contain(feedbackEmail);
                expect(subject).to.contain(`[${siteName}] Notification in ${testTeam.display_name}`);
                const expectedEmailBody = getMentionEmailTemplate(
                    sender.username,
                    message.emailLinked,
                    postId,
                    siteName,
                    testTeam.name,
                    testChannel.display_name,
                );
                verifyEmailBody(expectedEmailBody, body);
                const permalink = body[3].split(' ')[4];
                const permalinkPostId = permalink.split('/')[6];
                cy.visit(permalink);
                cy.findByText('View in Browser').click();
                const postText = `#postMessageText_${permalinkPostId}`;
                cy.get(postText).should('have.text', message.posted);
                expect(permalinkPostId).to.equal(postId);
            });
        });
    });
});