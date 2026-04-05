import {getAdminAccount} from '../../../support/env';
import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    getJoinEmailTemplate,
    getRandomId,
    reUrl,
    verifyEmailBody,
} from '../../../utils';
describe('Team Settings', () => {
    const sysadmin = getAdminAccount();
    const randomId = getRandomId();
    const username = `user${randomId}`;
    const email = `user${randomId}@sample.mattermost.com`;
    const password = 'passwd';
    let testTeam;
    let siteName;
    let isLicensed;
    before(() => {
        cy.apiGetClientLicense().then((data) => {
            ({isLicensed} = data);
        });
        cy.apiUpdateConfig({
            LdapSettings: {Enable: false},
            ServiceSettings: {EnableOnboardingFlow: true},
            TeamSettings: {
                EnableOpenServer: false,
            },
        }).then(({config}) => {
            siteName = config.TeamSettings.SiteName;
        });
        cy.shouldHaveEmailEnabled();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T385 Invite new user to closed team using email invite', () => {
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#teamSettingsModal').should('exist').within(() => {
            cy.get('#accessButton').click();
            cy.get('.access-allowed-domains-section').should('exist').within(() => {
                cy.get('.mm-modal-generic-section-item__input-checkbox').should('not.be.checked').click();
            });
            cy.get('#allowedDomains').should('have.text', 'corp.mattermost.com, mattermost.com');
            cy.get('button[aria-label="Close"]').should('be.visible').click();
        });
        cy.uiOpenTeamMenu('Invite people');
        cy.wait(TIMEOUTS.HALF_SEC);
        if (isLicensed) {
            cy.get('.InviteAs').findByTestId('inviteMembersLink').click();
        }
        cy.findByRole('combobox', {name: 'Invite People'}).type(email, {force: true}).wait(TIMEOUTS.HALF_SEC).type('{enter}', {force: true});
        cy.findByTestId('inviteButton').click();
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.apiLogout();
        cy.getRecentEmail({username, email}).then((data) => {
            const {body: actualEmailBody, subject} = data;
            expect(subject).to.contain(`[${siteName}] ${sysadmin.username} invited you to join ${testTeam.display_name} Team`);
            const expectedEmailBody = getJoinEmailTemplate(sysadmin.username, email, testTeam);
            verifyEmailBody(expectedEmailBody, actualEmailBody);
            const permalink = actualEmailBody[3].match(reUrl)[0];
            cy.visit(permalink);
        });
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#input_name').type(username);
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#input_password-input').type(password);
        cy.get('#signup-body-card-form-check-terms-and-privacy').check();
        cy.findByText('Create account').click();
        cy.uiCloseOnboardingTaskList();
        cy.uiGetLHSHeader().findByText(testTeam.display_name);
        cy.get('h2.channel-intro__title').should('be.visible').should('have.text', 'Town Square');
    });
});