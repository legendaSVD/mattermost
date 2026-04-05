import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getRandomId} from '../../../../utils';
describe('SAML Guest', () => {
    const loginButtonText = 'SAML';
    const guestUser = {
        username: 'guest.test',
        password: 'Password1',
        email: 'guest.test@mmtest.com',
        firstname: 'Guest',
        lastname: 'OneSaml',
        keycloakId: '',
    };
    const userFilter = `username=${guestUser.username}`;
    const keycloakBaseUrl = Cypress.env('keycloakBaseUrl') || 'http://localhost:8484';
    const keycloakAppName = Cypress.env('keycloakAppName') || 'mattermost';
    const idpUrl = `${keycloakBaseUrl}/auth/realms/${keycloakAppName}/protocol/saml`;
    const idpDescriptorUrl = `${keycloakBaseUrl}/auth/realms/${keycloakAppName}`;
    const newConfig = {
        GuestAccountsSettings: {
            Enable: true,
        },
        SamlSettings: {
            Enable: true,
            EnableSyncWithLdap: false,
            EnableSyncWithLdapIncludeAuth: false,
            Verify: true,
            Encrypt: false,
            SignRequest: false,
            IdpURL: idpUrl,
            IdpDescriptorURL: idpDescriptorUrl,
            IdpMetadataURL: '',
            ServiceProviderIdentifier: `${Cypress.config('baseUrl')}/login/sso/saml`,
            AssertionConsumerServiceURL: `${Cypress.config('baseUrl')}/login/sso/saml`,
            SignatureAlgorithm: 'RSAwithSHA256',
            CanonicalAlgorithm: 'Canonical1.0',
            IdpCertificateFile: 'saml-idp.crt',
            PublicCertificateFile: '',
            PrivateKeyFile: '',
            IdAttribute: 'username',
            GuestAttribute: '',
            EnableAdminAttribute: false,
            AdminAttribute: '',
            FirstNameAttribute: 'firstName',
            LastNameAttribute: 'lastName',
            EmailAttribute: 'email',
            UsernameAttribute: 'username',
            LoginButtonText: loginButtonText,
        },
    };
    let testSettings;
    before(() => {
        cy.apiRequireLicenseForFeature('SAML');
        cy.apiUploadSAMLIDPCert('keycloak.crt');
        cy.apiUpdateConfig(newConfig).then(({config}) => {
            cy.setTestSettings(loginButtonText, config).then((_response) => {
                testSettings = _response;
                cy.keycloakResetUsers([guestUser]);
            });
        });
    });
    it('MM-T1423_1 - SAML Guest Setting disabled if Guest Access is turned off', () => {
        cy.visit('/admin_console/authentication/saml');
        cy.findByTestId('SamlSettings.GuestAttributeinput').clear().type('username=e2etest.one');
        cy.findByText('Save').click().wait(TIMEOUTS.ONE_SEC);
        cy.visit('/admin_console/authentication/guest_access');
        cy.findByTestId('GuestAccountsSettings.Enablefalse').check();
        cy.findByText('Save').click().wait(TIMEOUTS.ONE_SEC);
        cy.findByText('Save and Disable Guest Access').click().wait(TIMEOUTS.ONE_SEC);
        cy.visit('/admin_console/authentication/saml');
        cy.findByTestId('SamlSettings.GuestAttributeinput').should('be.disabled');
    });
    it('MM-T1423_2 - SAML User will login as member', () => {
        const testConfig = {
            ...newConfig,
            GuestAccountsSettings: {
                Enable: false,
            },
        };
        cy.apiAdminLogin().then(() => {
            cy.apiUpdateConfig(testConfig);
        });
        testSettings.user = guestUser;
        cy.doSamlLogin(testSettings).then(() => {
            cy.doKeycloakLogin(testSettings.user).then(() => {
                cy.skipOrCreateTeam(testSettings, getRandomId()).then(() => {
                    cy.get('#SidebarContainer .AddChannelDropdown_dropdownButton').click();
                    cy.get('#showNewChannel button').should('exist');
                });
            });
        });
    });
    it('MM-T1426_1 - User logged in as member, filter does not match', () => {
        const testConfig = {
            ...newConfig,
            GuestAccountsSettings: {
                ...newConfig.GuestAccountsSettings,
                Enable: true,
            },
            SamlSettings: {
                ...newConfig.SamlSettings,
                GuestAttribute: 'username=Wrong',
            },
        };
        cy.apiAdminLogin().then(() => {
            cy.apiUpdateConfig(testConfig);
        });
        testSettings.user = guestUser;
        cy.doSamlLogin(testSettings).then(() => {
            cy.doKeycloakLogin(testSettings.user).then(() => {
                cy.skipOrCreateTeam(testSettings, getRandomId()).then(() => {
                    cy.get('#SidebarContainer .AddChannelDropdown_dropdownButton').click();
                    cy.get('#showNewChannel button').should('exist');
                });
            });
        });
    });
    it('MM-T1426_2 - User logged in as guest, correct filter', () => {
        const testConfig = {
            ...newConfig,
            GuestAccountsSettings: {
                ...newConfig.GuestAccountsSettings,
                Enable: true,
            },
            SamlSettings: {
                ...newConfig.SamlSettings,
                GuestAttribute: userFilter,
            },
        };
        cy.apiAdminLogin().then(() => {
            cy.apiUpdateConfig(testConfig);
        });
        testSettings.user = guestUser;
        cy.doSamlLogin(testSettings).then(() => {
            cy.doKeycloakLogin(testSettings.user).then(() => {
                cy.skipOrCreateTeam(testSettings, getRandomId()).then(() => {
                    cy.get('#SidebarContainer .AddChannelDropdown_dropdownButton').should('not.exist');
                });
            });
        });
    });
});