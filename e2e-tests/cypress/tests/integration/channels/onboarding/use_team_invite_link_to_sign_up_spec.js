import * as TIMEOUTS from '../../../fixtures/timeouts';
import {generateRandomUser} from '../../../support/api/user';
import {
    getWelcomeEmailTemplate,
    reUrl,
    verifyEmailBody,
    stubClipboard,
} from '../../../utils';
describe('Onboarding', () => {
    let testTeam;
    let siteName;
    before(() => {
        cy.shouldHaveEmailEnabled();
        cy.apiUpdateConfig({
            ServiceSettings: {EnableOnboardingFlow: true},
            EmailSettings: {
                RequireEmailVerification: true,
            },
        }).then(({config}) => {
            siteName = config.TeamSettings.SiteName;
        });
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.visit(`/${team.name}`);
        });
    });
    it('MM-T398 Use team invite link to sign up using email and password', () => {
        stubClipboard().as('clipboard');
        cy.uiOpenTeamMenu('Invite people');
        cy.findByTestId('InviteView__copyInviteLink').click();
        cy.get('@clipboard').its('contents').then((val) => {
            const inviteLink = val;
            cy.apiLogout();
            cy.visit(inviteLink);
        });
        cy.findByText('Email address').should('be.visible');
        cy.findByPlaceholderText('Choose a Password').should('be.visible');
        const user = generateRandomUser();
        const {username, email, password} = user;
        cy.get('#input_email', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').type(email);
        cy.get('#input_name').should('be.visible').type(username);
        cy.get('#input_password-input').should('be.visible').type(password);
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.findByText('You’re almost done!').should('be.visible');
        cy.getRecentEmail(user).then((data) => {
            const {body: expectedBody} = data;
            const expectedEmailBody = getWelcomeEmailTemplate(user.email, siteName, testTeam.name);
            verifyEmailBody(expectedEmailBody, expectedBody);
            const permalink = expectedBody[4].match(reUrl)[0];
            cy.url().should('not.include', 'undefined');
            cy.visit(permalink);
            cy.get('#input_loginId').should('have.value', email);
            cy.get('#input_password-input').should('be.visible').type(password);
            cy.get('#saveSetting').click();
            cy.findByText('The email/username or password is invalid.').should('not.exist');
        });
        cy.uiCloseOnboardingTaskList();
        cy.uiGetLHSHeader().findByText(testTeam.display_name);
        cy.get('.active').within(() => {
            cy.findByText('Town Square').should('exist');
        });
        cy.url().should('include', `/${testTeam.name}/channels/town-square`);
    });
});