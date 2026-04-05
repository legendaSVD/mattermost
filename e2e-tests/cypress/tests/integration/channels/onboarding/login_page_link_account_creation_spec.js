import * as TIMEOUTS from '../../../fixtures/timeouts';
import {generateRandomUser} from '../../../support/api/user';
import {
    getWelcomeEmailTemplate,
    reUrl,
    verifyEmailBody,
} from '../../../utils';
describe('Onboarding', () => {
    let siteName;
    let siteUrl;
    let testTeam;
    const {username, email, password} = generateRandomUser();
    before(() => {
        cy.apiUpdateConfig({
            LdapSettings: {Enable: false},
            EmailSettings: {RequireEmailVerification: true},
            ServiceSettings: {EnableOnboardingFlow: true},
        }).then(({config}) => {
            siteName = config.TeamSettings.SiteName;
            siteUrl = config.ServiceSettings.SiteURL;
        });
        cy.shouldHaveEmailEnabled();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('MM-T400 Create account from login page link using email-password', () => {
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#teamSettingsModal').should('exist').within(() => {
            cy.get('#accessButton').should('be.visible').click();
            cy.get('input.mm-modal-generic-section-item__input-checkbox').last().should('be.visible').click();
            cy.get('[data-testid="SaveChangesPanel__save-btn"]').should('be.visible').click();
            cy.findByLabelText('Close').should('be.visible').click();
        });
        cy.apiLogout();
        cy.visit(`/${testTeam.name}`);
        cy.get('.login-body-card', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.findByText('Don\'t have an account?').should('be.visible').click();
        cy.get('#input_email').should('be.focused').and('be.visible').type(email);
        cy.get('#input_name').should('be.visible').type(username);
        cy.get('#input_password-input').should('be.visible').type(password);
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.findByText('You’re almost done!').should('be.visible');
        getEmail(username, email);
        cy.get('#input_loginId').should('be.visible').and('have.value', email);
        cy.get('#input_password-input').should('be.visible').and('be.focused').type(password);
        cy.get('#saveSetting').click();
        cy.uiCloseOnboardingTaskList();
        cy.uiGetLHSHeader().findByText(testTeam.display_name);
        cy.get('.SidebarChannel.active').within(() => {
            cy.get('#sidebarItem_town-square').should('exist');
        });
        cy.url().should('include', `/${testTeam.name}/channels/town-square`);
    });
    function getEmail(username, email) {
        cy.getRecentEmail({username, email}).then((data) => {
            expect(data.subject).to.equal(`[${siteName}] You joined ${siteUrl.split('/')[2]}`);
            const expectedEmailBody = getWelcomeEmailTemplate(email, siteName, testTeam.name);
            verifyEmailBody(expectedEmailBody, data.body);
            const permalink = data.body[4].match(reUrl)[0];
            cy.visit(permalink);
        });
    }
});