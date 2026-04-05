import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    FixedCloudConfig,
    getMentionEmailTemplate,
    verifyEmailBody,
} from '../../../utils';
describe('Email notification', () => {
    let config;
    let sender;
    let receiver;
    let testTeam;
    before(() => {
        cy.shouldHaveEmailEnabled();
        cy.apiGetConfig().then((data) => {
            ({config} = data);
        });
        cy.apiCreateUser().then(({user}) => {
            receiver = user;
        });
        cy.apiInitSetup().then(({team, user, offTopicUrl}) => {
            sender = user;
            testTeam = team;
            cy.apiAddUserToTeam(team.id, receiver.id);
            cy.apiLogin(sender);
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T4062 Post a message that mentions a user', () => {
        const message = `Hello @${receiver.username} `;
        cy.postMessage(message);
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.getLastPostId().then((postId) => {
            cy.getRecentEmail(receiver).then((data) => {
                const {body, from, subject} = data;
                const siteName = config.TeamSettings.SiteName;
                const feedbackEmail = config.EmailSettings.FeedbackEmail || FixedCloudConfig.EmailSettings.FEEDBACK_EMAIL;
                expect(from).to.contain(feedbackEmail);
                expect(subject).to.contain(`[${siteName}] Notification in ${testTeam.display_name}`);
                const expectedEmailBody = getMentionEmailTemplate(
                    sender.username,
                    message.trim(),
                    postId,
                    siteName,
                    testTeam.name,
                    'Off-Topic',
                );
                verifyEmailBody(expectedEmailBody, body);
                const permalink = body[3].split(' ')[4];
                const permalinkPostId = permalink.split('/')[6];
                cy.visit(permalink);
                cy.findByText('View in Browser').click();
                const postText = `#postMessageText_${permalinkPostId}`;
                cy.get(postText).should('have.text', message);
                expect(permalinkPostId).to.equal(postId);
            });
        });
    });
});