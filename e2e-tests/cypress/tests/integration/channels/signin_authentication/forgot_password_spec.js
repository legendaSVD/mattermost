import {
    getPasswordResetEmailTemplate,
    reUrl,
    verifyEmailBody,
} from '../../../utils';
describe('Signin/Authentication', () => {
    let testUser;
    let teamName;
    before(() => {
        cy.shouldHaveEmailEnabled();
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            teamName = team.name;
            cy.apiLogout();
        });
    });
    it('MM-T407 - Sign In Forgot password - Email address has account on server', () => {
        const newPassword = 'newpasswd';
        cy.visit(`/${teamName.name}/channels/town-square`);
        cy.url().should('contain', '/login');
        cy.findByText('Forgot your password?').should('be.visible').click();
        cy.url().should('contain', '/reset_password');
        cy.focused().should('have.attr', 'id', 'passwordResetEmailInput');
        cy.get('#passwordResetEmailInput').type(testUser.email);
        cy.get('#passwordResetButton').click();
        cy.get('#passwordResetEmailSent').should('be.visible').within(() => {
            cy.get('span').first().should('have.text', 'If the account exists, a password reset email will be sent to:');
            cy.get('div b').first().should('have.text', testUser.email);
            cy.get('span').last().should('have.text', 'Please check your inbox.');
        });
        cy.getRecentEmail(testUser).then((data) => {
            const {body: actualEmailBody} = data;
            const expectedEmailBody = getPasswordResetEmailTemplate();
            verifyEmailBody(expectedEmailBody, actualEmailBody);
            const passwordResetLink = actualEmailBody[3].match(reUrl)[0];
            const token = passwordResetLink.split('token=')[1];
            expect(token.length).to.equal(64);
            cy.visit(passwordResetLink);
            cy.url().should('contain', '/reset_password_complete?token=');
            cy.focused().should('have.attr', 'id', 'resetPasswordInput');
            cy.get('#resetPasswordInput').type(newPassword);
            cy.get('#resetPasswordButton').click();
            cy.url().should('contain', '/login?extra=password_change');
            cy.get('.AlertBanner.success').should('be.visible').and('have.text', 'Password updated successfully');
            cy.get('#input_loginId').should('be.visible').type(testUser.username);
            cy.get('#input_password-input').should('be.visible').type(newPassword);
            cy.get('#saveSetting').click();
            cy.url().should('contain', `/${teamName}/channels/town-square`);
        });
    });
});