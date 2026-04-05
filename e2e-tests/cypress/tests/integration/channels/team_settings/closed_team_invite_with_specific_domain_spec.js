import {getAdminAccount} from '../../../support/env';
import {generateRandomUser} from '../../../support/api/user';
import {allowOnlyUserFromSpecificDomain, inviteUserByEmail, verifyEmailInviteAndVisitLink, signupAndVerifyTutorial} from './helpers';
describe('Team Settings', () => {
    const sysadmin = getAdminAccount();
    const {username, email, password} = generateRandomUser();
    const emailDomain = 'sample.mattermost.com';
    let testTeam;
    let siteName;
    before(() => {
        cy.shouldRunOnTeamEdition();
        cy.apiUpdateConfig({
            LdapSettings: {Enable: false},
            ServiceSettings: {EnableOnboardingFlow: true},
        }).then(({config}) => {
            siteName = config.TeamSettings.SiteName;
        });
        cy.shouldHaveEmailEnabled();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T386 Invite new user to closed team with \'Allow only users with a specific email domain to join this team\' set to \'sample.mattermost.com\'', () => {
        allowOnlyUserFromSpecificDomain(emailDomain);
        inviteUserByEmail(email);
        cy.apiLogout();
        verifyEmailInviteAndVisitLink(sysadmin.username, username, email, testTeam, siteName);
        signupAndVerifyTutorial(username, password, testTeam.display_name);
    });
});