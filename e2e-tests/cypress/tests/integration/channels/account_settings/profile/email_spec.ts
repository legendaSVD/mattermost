import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {reUrl, getRandomId} from '../../../../utils';
describe('Profile > Profile Settings > Email', () => {
    let siteName;
    let testUser: Cypress.UserProfile;
    let otherUser;
    let offTopicUrl;
    let origConfig: Cypress.AdminConfig;
    before(() => {
        cy.apiGetConfig().then(({config}) => {
            origConfig = config;
            const newConfig = {
                ...origConfig,
                EmailSettings: {
                    ...origConfig.EmailSettings,
                    RequireEmailVerification: true,
                },
            };
            cy.apiUpdateConfig(newConfig).then(({config}) => {
                siteName = config.TeamSettings.SiteName;
            });
            cy.apiInitSetup().then(({user, offTopicUrl: url}) => {
                testUser = user;
                offTopicUrl = url;
                cy.apiVerifyUserEmailById(testUser.id);
                return cy.apiCreateUser({});
            }).then(({user: user1}) => {
                otherUser = user1;
                cy.apiLogin(testUser);
                cy.visit(offTopicUrl);
            });
        });
    });
    beforeEach(() => {
        cy.uiOpenProfileModal('Profile Settings');
    });
    afterEach(() => {
        cy.get('body').type('{esc}');
    });
    it('MM-T2065 Email: Can "change" to existing email address and save', () => {
        cy.get('#emailEdit').should('be.visible').click();
        cy.get('#primaryEmail').should('be.visible').type(testUser.email);
        cy.get('#confirmEmail').should('be.visible').type(testUser.email);
        cy.get('#currentPassword').should('be.visible').type('SampleUs@r-1');
        cy.uiSave().wait(TIMEOUTS.HALF_SEC);
        cy.get('.announcement-bar').should('not.exist');
    });
    it('MM-T2066 email address required', () => {
        cy.get('#emailEdit').should('be.visible').click();
        cy.get('#primaryEmail').should('be.visible').click().blur();
        cy.get('#error_primaryEmail').should('be.visible').should('have.text', 'Please enter a valid email address.');
    });
    it('MM-T2067 email address already taken error', () => {
        cy.get('#emailEdit').should('be.visible').click();
        cy.get('#primaryEmail').should('be.visible').type(otherUser.email);
        cy.get('#confirmEmail').should('be.visible').type(otherUser.email);
        cy.get('#currentPassword').should('be.visible').type(otherUser.password);
        cy.uiSave().wait(TIMEOUTS.HALF_SEC);
        cy.get('#serverError').should('be.visible').should('have.text', 'An account with that email already exists.');
    });
    it('MM-T2068 email address and confirmation don\'t match', () => {
        cy.get('#emailEdit').should('be.visible').click();
        cy.get('#primaryEmail').should('be.visible').type('random@example.com');
        cy.get('#confirmEmail').should('be.visible').clear();
        cy.get('#currentPassword').should('be.visible').type('randompass');
        cy.get('#error_confirmEmail').should('be.visible').should('have.text', 'The new emails you entered do not match.');
    });
    it('MM-T2069 Email: Can update email address and verify through email notification', () => {
        cy.get('#emailEdit').should('be.visible').click();
        const randomId = getRandomId();
        const username = `user-${randomId}`;
        const email = `${username}@example.com`;
        cy.get('#primaryEmail').should('be.visible').type(email);
        cy.get('#confirmEmail').should('be.visible').type(email);
        cy.get('#currentPassword').should('be.visible').type(testUser.password);
        cy.uiSave().wait(TIMEOUTS.HALF_SEC);
        cy.uiClose();
        cy.get('.announcement-bar').should('be.visible').should('contain.text', 'Check your email inbox to verify the address.');
        cy.reload();
        cy.get('.announcement-bar').should('not.exist');
        cy.getRecentEmail({username, email}).then((data) => {
            expect(data.subject).to.equal(`[${siteName}] Verify new email address`);
            expect(data.body).to.contain('You successfully updated your email');
            const matched = data.body[6].match(reUrl);
            assert(matched.length > 0);
            const permalink = matched[0];
            cy.visit(permalink);
            cy.wait(TIMEOUTS.FIVE_SEC);
            cy.getRecentEmail(testUser).then(({subject}) => {
                expect(subject).to.equal(`[${siteName}] Your email address has changed`);
            });
            cy.uiOpenProfileModal('Profile Settings');
            cy.get('#emailDesc').should('be.visible').should('have.text', email);
        });
    });
    it('MM-T2073 - Verify email verification message after logout', () => {
        cy.get('#emailEdit').should('be.visible').click();
        const randomId = getRandomId();
        const username = `user-${randomId}`;
        const email = `${username}@example.com`;
        cy.get('#primaryEmail').should('be.visible').type(email);
        cy.get('#confirmEmail').should('be.visible').type(email);
        cy.get('#currentPassword').should('be.visible').type(testUser.password);
        cy.uiSave().wait(TIMEOUTS.HALF_SEC);
        cy.get('body').type('{esc}');
        cy.uiLogout();
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.getRecentEmail({username, email}).then((data) => {
            expect(data.subject).to.equal(`[${siteName}] Verify new email address`);
            expect(data.body[1]).to.contain('You successfully updated your email');
            const matched = data.body[6].match(reUrl);
            assert(matched.length > 0);
            const permalink = matched[0];
            cy.visit(permalink);
            cy.get('.AlertBanner.success').should('be.visible').within(() => {
                cy.get('.AlertBanner__title').should('contain.text', 'Email Verified');
            });
            cy.get('#input_loginId').should('be.visible').clear().type(email);
            cy.get('#input_password-input').should('be.visible').type(testUser.password);
            cy.get('#saveSetting').should('not.be.disabled').click();
            cy.get('.announcement-bar').should('not.exist');
        });
    });
});