import authenticator from 'authenticator';
import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {
    getJoinEmailTemplate,
    getRandomId,
    reUrl,
    verifyEmailBody,
} from '../../../../utils';
describe('Guest Accounts', () => {
    let sysadmin: Cypress.UserProfile;
    let testTeam: Cypress.Team;
    let testChannel: Cypress.Channel;
    let adminMFASecret: string;
    const username = 'g' + getRandomId();
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
        });
        cy.apiAdminLogin().then(({user}: {user: UserProfile}) => {
            sysadmin = user;
        });
    });
    after(() => {
        const token = authenticator.generateToken(adminMFASecret);
        cy.apiAdminLoginWithMFA(token);
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableMultifactorAuthentication: false,
                EnforceMultifactorAuthentication: false,
            },
            GuestAccountsSettings: {
                Enable: true,
                EnforceMultifactorAuthentication: false,
            },
        });
    });
    it('MM-T1390 Enforce Guest MFA when MFA is enabled and enforced', () => {
        cy.visit('/admin_console/authentication/mfa');
        cy.findByTestId('ServiceSettings.EnableMultifactorAuthenticationtrue').check();
        cy.findByTestId('ServiceSettings.EnforceMultifactorAuthenticationtrue').check();
        cy.findByText('Save').click().wait(TIMEOUTS.ONE_SEC);
        cy.visit('/');
        cy.url().should('include', 'mfa/setup');
        cy.uiGetMFASecret(sysadmin.id).then((secret) => {
            adminMFASecret = secret;
        });
        cy.visit('/admin_console/authentication/guest_access');
        cy.url().should('include', '/admin_console/authentication/guest_access');
        cy.findByTestId('GuestAccountsSettings.Enabletrue').check();
        cy.findByTestId('GuestAccountsSettings.EnforceMultifactorAuthenticationtrue').check();
        cy.get('#saveSetting').scrollIntoView().click();
        const email = `${username}@sample.mattermost.com`;
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Invite people');
        cy.findByTestId('inviteGuestLink').click();
        cy.get('.users-emails-input__control').should('be.visible').within(() => {
            cy.get('input').typeWithForce(email + '{enter}');
        });
        cy.get('.users-emails-input__menu').
            children().should('have.length', 1).
            eq(0).should('contain', `Invite ${email} as a guest`).click();
        cy.get('.channels-input__control').should('be.visible').within(() => {
            cy.get('input').typeWithForce(testChannel.name);
        });
        cy.get('.channels-input__menu').
            children().should('have.length', 1).
            eq(0).should('contain', testChannel.name).click();
        cy.findByTestId('inviteButton').scrollIntoView().click();
        cy.findByTestId('confirm-done').should('be.visible').click();
        cy.getRecentEmail({username, email}).then((data) => {
            const {body: actualEmailBody, subject} = data;
            expect(subject).to.contain(`${sysadmin.username} invited you to join the team ${testTeam.display_name} as a guest`);
            const expectedEmailBody = getJoinEmailTemplate(sysadmin.username, email, testTeam, true);
            verifyEmailBody(expectedEmailBody, actualEmailBody);
            const invitationLink = actualEmailBody[3].match(reUrl)[0];
            cy.apiLogout();
            cy.visit(invitationLink);
        });
        cy.get('#input_name').type(username);
        cy.get('#input_password-input').type(username);
        cy.findByText('Create account').click();
        cy.url().should('include', 'mfa/setup');
        cy.get('#mfa').wait(TIMEOUTS.HALF_SEC).find('p.col-sm-12 span').then((p) => {
            const secretp = p.text();
            const secret = secretp.split(' ')[1];
            const token = authenticator.generateToken(secret);
            cy.findByPlaceholderText('MFA Code').type(token);
            cy.findByText('Save').click();
            cy.wait(TIMEOUTS.ONE_SEC);
            cy.findByText('Okay').click();
        });
        cy.apiLogout();
    });
});