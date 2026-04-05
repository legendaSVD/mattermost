import * as TIMEOUTS from '../../../fixtures/timeouts';
import {
    getJoinEmailTemplate,
    reUrl,
    verifyEmailBody,
} from '../../../utils';
export const allowOnlyUserFromSpecificDomain = (domain) => {
    cy.uiOpenTeamMenu('Team settings');
    cy.get('#teamSettingsModal').should('exist').within(() => {
        cy.get('#open_inviteDesc').should('have.text', 'No');
        cy.get('#allowed_domainsEdit').should('be.visible').click();
        cy.focused().type(domain);
        cy.findByText('Save').should('be.visible').click();
        cy.get('button[aria-label="Close"]').should('be.visible').click();
    });
};
export const inviteUserByEmail = (email) => {
    cy.uiOpenTeamMenu('Invite people');
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.findByRole('textbox', {name: 'Invite People'}).
        typeWithForce(email).
        wait(TIMEOUTS.HALF_SEC).
        typeWithForce('{enter}');
    cy.findByTestId('inviteButton').click();
    cy.wait(TIMEOUTS.TWO_SEC);
};
export const verifyEmailInviteAndVisitLink = (sender, username, email, team, siteName) => {
    cy.getRecentEmail({username, email}).then((data) => {
        const {body: actualEmailBody, subject} = data;
        expect(subject).to.contain(`[${siteName}] ${sender} invited you to join ${team.display_name} Team`);
        const expectedEmailBody = getJoinEmailTemplate(sender, email, team);
        verifyEmailBody(expectedEmailBody, actualEmailBody);
        const permalink = actualEmailBody[3].match(reUrl)[0];
        cy.visit(permalink);
        cy.get('.signup-body', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible');
    });
};
export const signupAndVerifyTutorial = (username, password, teamDisplayName) => {
    cy.get('#name', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').type(username);
    cy.get('#password').should('be.visible').type(password);
    cy.get('#createAccountButton').click();
    cy.uiCloseOnboardingTaskList();
    cy.uiGetLHSHeader().findByText(teamDisplayName);
    cy.findByText('Beginning of Town Square').should('be.visible');
    cy.get('.active').within(() => {
        cy.get('#sidebarItem_town-square').should('exist');
    });
};