import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getAdminAccount} from '../../../support/env';
import {getRandomId} from '../../../utils';
import {inviteUserByEmail, verifyEmailInviteAndVisitLink, signupAndVerifyTutorial} from '../team_settings/helpers';
describe('Onboarding', () => {
    const sysadmin = getAdminAccount();
    const usernameOne = `user${getRandomId()}`;
    const usernameTwo = `user${getRandomId()}`;
    const usernameThree = `user${getRandomId()}`;
    const emailOne = `${usernameOne}@sample.mattermost.com`;
    const emailTwo = `${usernameTwo}@sample.mattermost.com`;
    const emailThree = `${usernameThree}@sample.mattermost.com`;
    const password = 'passwd';
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
    it('MM-T399 Invalidate Pending Email Invitations', () => {
        inviteUserByEmail(emailOne);
        cy.apiLogout();
        verifyEmailInviteAndVisitLink(sysadmin.username, usernameOne, emailOne, testTeam, siteName);
        signupAndVerifyTutorial(usernameOne, password, testTeam.display_name);
        cy.apiLogout();
        cy.apiAdminLogin();
        cy.reload();
        cy.uiOpenTeamMenu('Invite people');
        cy.wait(TIMEOUTS.HALF_SEC);
        inviteNewUser(emailTwo);
        cy.findByTestId('invite-more').click();
        inviteNewUser(emailThree);
        cy.findByText('Done').should('be.visible').click();
        cy.uiOpenProductMenu('System Console');
        cy.findByText('Signup').scrollIntoView().should('be.visible').click();
        cy.get('#InvalidateEmailInvitesButton').should('be.visible').within(() => {
            cy.findByText('Invalidate pending email invites').should('be.visible').click();
        });
        cy.apiLogout();
        verifyEmailInviteAndVisitLink(sysadmin.username, usernameTwo, emailTwo, testTeam, siteName);
        cy.get('#name').should('be.visible').type(usernameTwo);
        cy.get('#password').should('be.visible').type(password);
        cy.get('#createAccountButton').click();
        cy.get('#existingEmailErrorContainer').should('exist').and('have.text', 'The signup link does not appear to be valid.');
    });
    function inviteNewUser(email) {
        cy.findByRole('textbox', {name: 'Invite People'}).
            typeWithForce(email).wait(TIMEOUTS.HALF_SEC).
            typeWithForce('{enter}');
        cy.findByTestId('inviteButton').click();
    }
});