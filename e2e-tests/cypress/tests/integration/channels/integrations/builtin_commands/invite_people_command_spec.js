import {getJoinEmailTemplate, verifyEmailBody} from '../../../../utils';
import {loginAndVisitChannel} from './helper';
describe('Integrations', () => {
    let testUser;
    let testTeam;
    const usersToInvite = [];
    let siteName;
    let testChannelUrl;
    before(() => {
        cy.apiGetConfig().then(({config}) => {
            siteName = config.TeamSettings.SiteName;
        });
        cy.apiInitSetup().then(({team, user, channelUrl}) => {
            testUser = user;
            testTeam = team;
            testChannelUrl = channelUrl;
            Cypress._.times(2, () => {
                cy.apiCreateUser().then(({user: otherUser}) => {
                    usersToInvite.push(otherUser);
                });
            });
        });
    });
    it('MM-T575 /invite-people', () => {
        loginAndVisitChannel(testUser, testChannelUrl);
        cy.postMessage(`/invite_people ${usersToInvite.map((user) => user.email).join(' ')} `);
        cy.uiWaitUntilMessagePostedIncludes('Email invite(s) sent');
        usersToInvite.forEach((invitedUser) => {
            cy.getRecentEmail({username: invitedUser.username, email: invitedUser.email}).then((data) => {
                const {body: actualEmailBody, subject} = data;
                expect(subject).to.contain(`[${siteName}] ${testUser.username} invited you to join ${testTeam.display_name} Team`);
                const expectedEmailBody = getJoinEmailTemplate(testUser.username, invitedUser.email, testTeam);
                verifyEmailBody(expectedEmailBody, actualEmailBody);
            });
        });
    });
});