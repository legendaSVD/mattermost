import {FixedCloudConfig} from '../../../utils/constants';
describe('Login page with open server', () => {
    let config;
    let testUser;
    before(() => {
        const newSettings = {
            Office365Settings: {Enable: false},
            LdapSettings: {Enable: false},
        };
        cy.apiUpdateConfig(newSettings).then((data) => {
            ({config} = data);
        });
        cy.apiInitSetup().then(({user}) => {
            testUser = user;
            cy.apiLogout();
            cy.visit('/login');
        });
    });
    it('MM-T3306_2 Should autofocus on email field on page load', () => {
        cy.get('#input_loginId').should('have.focus');
    });
    it('MM-T3306_1 Should render all elements of the page', () => {
        cy.url().should('include', '/login');
        cy.title().should('include', config.TeamSettings.SiteName);
        cy.get('.login-body-card-title').click();
        cy.findByPlaceholderText('Email or Username').should('exist').and('be.visible');
        cy.findByPlaceholderText('Password').should('exist').and('be.visible');
        cy.get('#saveSetting').should('exist').and('be.visible');
        cy.findByText('Forgot your password?').should('exist').and('be.visible').should('have.attr', 'href', '/reset_password');
        cy.findByText('Don\'t have an account?').should('exist').and('be.visible').should('have.attr', 'href').and('contain', '/signup_user_complete');
        cy.get('.hfroute-footer').should('exist').and('be.visible').within(() => {
            const {
                ABOUT_LINK,
                HELP_LINK,
                PRIVACY_POLICY_LINK,
                TERMS_OF_SERVICE_LINK,
            } = FixedCloudConfig.SupportSettings;
            cy.findByText('About').should('exist').
                and('have.attr', 'href').and('contain', config.SupportSettings.AboutLink || ABOUT_LINK);
            cy.findByText('Privacy Policy').should('exist').
                and('have.attr', 'href').and('contain', config.SupportSettings.PrivacyPolicyLink || PRIVACY_POLICY_LINK);
            cy.findByText('Terms').should('exist').
                and('have.attr', 'href').and('contain', config.SupportSettings.TermsOfServiceLink || TERMS_OF_SERVICE_LINK);
            cy.findByText('Help').should('exist').
                and('have.attr', 'href').and('contain', config.SupportSettings.HelpLink || HELP_LINK);
            const todaysDate = new Date();
            const currentYear = todaysDate.getFullYear();
            cy.findByText(`© ${currentYear} Mattermost Inc.`).should('exist');
        });
    });
    it('MM-T3306_3 Should keep enable Log in button when empty email/username and password field', () => {
        cy.findByPlaceholderText('Email or Username').clear();
        cy.findByPlaceholderText('Password').clear();
        cy.get('#saveSetting').should('not.be.disabled');
    });
    it('MM-T3306_4 Should keep enable Log in button when empty email/username field', () => {
        cy.findByPlaceholderText('Email or Username').clear();
        cy.findByPlaceholderText('Password').clear().type('samplepassword');
        cy.get('#saveSetting').should('not.be.disabled');
    });
    it('MM-T3306_5 Should keep enable Log in button when empty password field', () => {
        cy.findByPlaceholderText('Email or Username').clear().type('sampleusername');
        cy.findByPlaceholderText('Password').clear();
        cy.get('#saveSetting').should('not.be.disabled');
    });
    it('MM-T3306_6 Should show error with invalid email/username and password', () => {
        const invalidEmail = `${Date.now()}-user`;
        const invalidPassword = `${Date.now()}-password`;
        expect(invalidEmail).to.not.equal(testUser.username);
        expect(invalidPassword).to.not.equal(testUser.password);
        cy.findByPlaceholderText('Email or Username').clear().type(invalidEmail);
        cy.findByPlaceholderText('Password').clear().type(invalidPassword);
        cy.get('#saveSetting').should('not.be.disabled').click();
        cy.findByText('The email/username or password is invalid.').should('exist').and('be.visible');
    });
    it('MM-T3306_7 Should show error with invalid password', () => {
        const invalidPassword = `${Date.now()}-password`;
        cy.get('.login-body-card-title').click();
        expect(invalidPassword).to.not.equal(testUser.password);
        cy.findByPlaceholderText('Email or Username').clear().type(testUser.username);
        cy.findByPlaceholderText('Password').clear().type(invalidPassword);
        cy.get('#saveSetting').should('not.be.disabled').click();
        cy.findByText('The email/username or password is invalid.').should('exist').and('be.visible');
    });
    it('MM-T3306_8 Should login with a valid email and password and logout', () => {
        cy.get('.login-body-card-title').click();
        cy.findByPlaceholderText('Email or Username').clear().type(testUser.username);
        cy.findByPlaceholderText('Password').clear().type(testUser.password);
        cy.get('#saveSetting').should('not.be.disabled').click();
        cy.url().should('include', '/channels/town-square');
        cy.uiOpenUserMenu('Log out');
        cy.url().should('include', '/login');
    });
    it('MM-42489 Should login with a valid email and password using enter key and logout', () => {
        cy.visit('/login');
        cy.get('.login-body-card-title').click();
        cy.findByPlaceholderText('Email or Username').clear().type(testUser.username);
        cy.findByPlaceholderText('Password').clear().type(`${testUser.password}{enter}`);
        cy.url().should('include', '/channels/town-square');
        cy.uiOpenUserMenu('Log out');
        cy.url().should('include', '/login');
    });
});