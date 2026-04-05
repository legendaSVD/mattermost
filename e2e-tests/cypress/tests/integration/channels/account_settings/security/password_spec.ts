import moment from 'moment-timezone';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Profile', () => {
    let siteName: string;
    let testUser: Cypress.UserProfile;
    let offTopic: string;
    before(() => {
        cy.apiGetConfig().then(({config}) => {
            siteName = config.TeamSettings.SiteName;
        });
        cy.apiInitSetup({loginAfter: true}).then(({user, offTopicUrl}) => {
            testUser = user;
            offTopic = offTopicUrl;
            cy.visit(offTopicUrl);
        });
    });
    beforeEach(() => {
        cy.reload();
        cy.uiOpenProfileModal('Security');
        cy.get('#securityButton').should('be.visible');
        cy.get('#securityButton').click();
        cy.get('#passwordEdit').should('be.visible').click();
    });
    it('MM-T2085 Password: Valid values in password change fields allow the form to save successfully', () => {
        enterPasswords(testUser.password, 'passwd', 'passwd');
        cy.get('#error_currentPassword').should('not.exist');
        cy.get('#error_newPassword').should('not.exist');
        cy.get('#error_confirmPassword').should('not.exist');
        cy.uiSave();
        cy.get('#serverError').should('not.exist');
    });
    it('MM-T2082 Password: New password confirmation mismatch produces error', () => {
        enterPasswords(testUser.password, 'newPW', 'NewPW');
        cy.get('#error_confirmPassword').should('be.visible').should('have.text', 'The new passwords you entered do not match.');
    });
    it('MM-T2083 Password: Too few characters in new password produces error', () => {
        enterPasswords(testUser.password, 'pw', 'pw');
        cy.get('#error_newPassword').should('be.visible').should('have.text', 'Your password must be 5-72 characters long.');
    });
    it('MM-T2084 Password: Cancel out of password changes causes no changes to be made', () => {
        enterPasswords(testUser.password, 'newPasswd', 'newPasswd');
        cy.uiCancel();
        cy.get('#currentPassword').should('not.exist');
        cy.get('#passwordEdit').should('be.visible');
        cy.apiLogout();
        cy.get('#input_loginId').type(testUser.username);
        cy.get('#input_password-input').type('newPasswd');
        cy.get('#saveSetting').should('not.be.disabled').click();
        cy.findByText('The email/username or password is invalid.').should('be.visible');
        cy.apiLogin(testUser);
        cy.visit(offTopic);
        cy.get('#channelHeaderTitle').should('contain', 'Off-Topic');
    });
    it.skip('MM-T2086 Password: Timestamp and email', () => {
        enterPasswords(testUser.password, 'passwd', 'passwd');
        const now = moment(Date.now());
        cy.uiSave();
        const date = now.format('MMM DD, YYYY');
        const time = now.format('hh:mm A');
        const timestamp = `Last updated ${date} at ${time}`;
        cy.get('#passwordDesc').should('have.text', timestamp);
        cy.wait(TIMEOUTS.FIVE_SEC);
        cy.getRecentEmail(testUser).then(({subject}) => {
            expect(subject).to.equal(
                `[${siteName}] Your password has been updated`,
            );
        });
    });
});
function enterPasswords(currentPassword, newPassword, confirmPassword) {
    cy.get('#currentPassword').should('be.visible').type(currentPassword);
    cy.get('#newPassword').should('be.visible').type(newPassword);
    cy.get('#confirmPassword').should('be.visible').type(confirmPassword);
    cy.get('#currentPassword').should('be.visible').click().blur();
}