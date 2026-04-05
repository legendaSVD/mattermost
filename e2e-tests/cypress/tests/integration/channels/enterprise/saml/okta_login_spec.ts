import {UserCollection} from 'tests/support/okta_commands';
import users from '../../../../fixtures/saml_users.json';
context('Okta', () => {
    const loginButtonText = 'SAML';
    const regular1 = users.regulars['samluser-1'];
    const guest1 = users.guests['samlguest-1'];
    const guest2 = users.guests['samlguest-2'];
    const admin1 = users.admins['samladmin-1'];
    const admin2 = users.admins['samladmin-2'];
    const {
        oktaBaseUrl,
        oktaMMAppName,
        oktaMMEntityId,
    } = Cypress.env();
    const idpUrl = `${oktaBaseUrl}/app/${oktaMMAppName}/${oktaMMEntityId}/sso/saml`;
    const idpMetadataUrl = `${oktaBaseUrl}/app/${oktaMMEntityId}/sso/saml/metadata`;
    const newConfig = {
        SamlSettings: {
            Enable: true,
            EnableSyncWithLdap: false,
            EnableSyncWithLdapIncludeAuth: false,
            Verify: true,
            Encrypt: true,
            SignRequest: true,
            IdpURL: idpUrl,
            IdpDescriptorURL: `http:
            IdpMetadataURL: idpMetadataUrl,
            ServiceProviderIdentifier: `${Cypress.config('baseUrl')}/login/sso/saml`,
            AssertionConsumerServiceURL: `${Cypress.config('baseUrl')}/login/sso/saml`,
            SignatureAlgorithm: 'RSAwithSHA1',
            CanonicalAlgorithm: 'Canonical1.0',
            IdpCertificateFile: 'saml-idp.crt',
            PublicCertificateFile: 'saml-public.crt',
            PrivateKeyFile: 'saml-private.key',
            IdAttribute: '',
            GuestAttribute: '',
            EnableAdminAttribute: false,
            AdminAttribute: '',
            FirstNameAttribute: '',
            LastNameAttribute: '',
            EmailAttribute: 'Email',
            UsernameAttribute: 'Username',
            LoginButtonText: loginButtonText,
        },
        GuestAccountsSettings: {
            Enable: true,
        },
    };
    let testSettings;
    describe('SAML Login flow', () => {
        before(() => {
            cy.apiRequireLicenseForFeature('SAML');
            cy.apiGetSAMLCertificateStatus().then((resp) => {
                const data = resp.body;
                if (!data.idp_certificate_file) {
                    cy.apiUploadSAMLIDPCert('saml-idp.crt');
                }
                if (!data.public_certificate_file) {
                    cy.apiUploadSAMLPublicCert('saml-public.crt');
                }
                if (!data.private_key_file) {
                    cy.apiUploadSAMLPrivateKey('saml-private.key');
                }
            });
            cy.apiGetMetadataFromIdp(idpMetadataUrl);
            cy.oktaAddUsers(users as unknown as UserCollection);
            cy.apiUpdateConfig(newConfig).then(({config}) => {
                cy.setTestSettings(loginButtonText, config).then((_response) => {
                    testSettings = _response;
                });
            });
        });
        it('Saml login new and existing MM regular user', () => {
            cy.apiAdminLogin();
            testSettings.user = regular1;
            cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                cy.oktaDeleteSession(oktaUserId);
                cy.doSamlLogin(testSettings).then(() => {
                    cy.doOktaLogin(testSettings.user).then(() => {
                        cy.skipOrCreateTeam(testSettings, oktaUserId).then(() => {
                            cy.doSamlLogout(testSettings).then(() => {
                                cy.oktaDeleteSession(oktaUserId);
                            });
                        });
                    });
                });
            });
            cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                cy.oktaDeleteSession(oktaUserId);
                cy.doSamlLogin(testSettings).then(() => {
                    cy.doOktaLogin(testSettings.user).then(() => {
                        cy.doSamlLogout(testSettings).then(() => {
                            cy.oktaDeleteSession(oktaUserId);
                        });
                    });
                });
            });
        });
        it('Saml login new and existing MM guest user(userType=Guest)', () => {
            cy.apiAdminLogin();
            testSettings.user = guest1;
            newConfig.SamlSettings.GuestAttribute = 'UserType=Guest';
            cy.apiUpdateConfig(newConfig).then(() => {
                cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                    cy.oktaDeleteSession(oktaUserId);
                    cy.doSamlLogin(testSettings).then(() => {
                        cy.doOktaLogin(testSettings.user).then(() => {
                            cy.skipOrCreateTeam(testSettings, oktaUserId).then(() => {
                                cy.doLogoutFromSignUp().then(() => {
                                    cy.oktaDeleteSession(oktaUserId);
                                });
                            });
                        });
                    });
                });
                cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                    cy.oktaDeleteSession(oktaUserId);
                    cy.doSamlLogin(testSettings).then(() => {
                        cy.doOktaLogin(testSettings.user).then(() => {
                            cy.doLogoutFromSignUp().then(() => {
                                cy.oktaDeleteSession(oktaUserId);
                            });
                        });
                    });
                });
            });
        });
        it('Saml login new and existing MM guest(isGuest=true)', () => {
            cy.apiAdminLogin();
            testSettings.user = guest2;
            newConfig.SamlSettings.GuestAttribute = 'IsGuest=true';
            cy.apiUpdateConfig(newConfig).then(() => {
                cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                    cy.oktaDeleteSession(oktaUserId);
                    cy.doSamlLogin(testSettings).then(() => {
                        cy.doOktaLogin(testSettings.user).then(() => {
                            cy.skipOrCreateTeam(testSettings, oktaUserId).then(() => {
                                cy.doLogoutFromSignUp().then(() => {
                                    cy.oktaDeleteSession(oktaUserId);
                                });
                            });
                        });
                    });
                });
                cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                    cy.oktaDeleteSession(oktaUserId);
                    cy.doSamlLogin(testSettings).then(() => {
                        cy.doOktaLogin(testSettings.user).then(() => {
                            cy.doLogoutFromSignUp().then(() => {
                                cy.oktaDeleteSession(oktaUserId);
                            });
                        });
                    });
                });
            });
        });
        it('Saml login new and existing MM admin(userType=Admin)', () => {
            cy.apiAdminLogin();
            testSettings.user = admin1;
            newConfig.SamlSettings.EnableAdminAttribute = true;
            newConfig.SamlSettings.AdminAttribute = 'UserType=Admin';
            cy.apiUpdateConfig(newConfig).then(() => {
                cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                    cy.oktaDeleteSession(oktaUserId);
                    cy.doSamlLogin(testSettings).then(() => {
                        cy.doOktaLogin(testSettings.user).then(() => {
                            cy.skipOrCreateTeam(testSettings, oktaUserId).then(() => {
                                cy.doSamlLogout(testSettings).then(() => {
                                    cy.oktaDeleteSession(oktaUserId);
                                });
                            });
                        });
                    });
                });
                cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                    cy.oktaDeleteSession(oktaUserId);
                    cy.doSamlLogin(testSettings).then(() => {
                        cy.doOktaLogin(testSettings.user).then(() => {
                            cy.doSamlLogout(testSettings).then(() => {
                                cy.oktaDeleteSession(oktaUserId);
                            });
                        });
                    });
                });
            });
        });
        it('Saml login new and existing MM admin(isAdmin=true)', () => {
            cy.apiAdminLogin();
            testSettings.user = admin2;
            newConfig.SamlSettings.EnableAdminAttribute = true;
            newConfig.SamlSettings.AdminAttribute = 'IsAdmin=true';
            cy.apiUpdateConfig(newConfig).then(() => {
                cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                    cy.oktaDeleteSession(oktaUserId);
                    cy.doSamlLogin(testSettings).then(() => {
                        cy.doOktaLogin(testSettings.user).then(() => {
                            cy.skipOrCreateTeam(testSettings, oktaUserId).then(() => {
                                cy.doSamlLogout(testSettings).then(() => {
                                    cy.oktaDeleteSession(oktaUserId);
                                });
                            });
                        });
                    });
                });
                cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                    cy.oktaDeleteSession(oktaUserId);
                    cy.doSamlLogin(testSettings).then(() => {
                        cy.doOktaLogin(testSettings.user).then(() => {
                            cy.doSamlLogout(testSettings).then(() => {
                                cy.oktaDeleteSession(oktaUserId);
                            });
                        });
                    });
                });
            });
        });
        it('Saml login invited Guest user to a team', () => {
            cy.apiAdminLogin();
            testSettings.user = regular1;
            cy.oktaGetOrCreateUser(testSettings.user).then((oktaUserId) => {
                cy.oktaDeleteSession(oktaUserId);
                cy.doSamlLogin(testSettings).then(() => {
                    cy.doOktaLogin(testSettings.user).then(() => {
                        cy.skipOrCreateTeam(testSettings, oktaUserId).then((teamName) => {
                            testSettings.teamName = teamName;
                            cy.getInvitePeopleLink(testSettings).then((inviteUrl) => {
                                cy.oktaDeleteSession(oktaUserId);
                                cy.doSamlLogout(testSettings).then(() => {
                                    testSettings.user = guest1;
                                    cy.oktaGetOrCreateUser(testSettings.user).then((_oktaUserId) => {
                                        cy.visit(inviteUrl).then(() => {
                                            cy.oktaDeleteSession(_oktaUserId);
                                            cy.doSamlLogin(testSettings).then(() => {
                                                cy.doOktaLogin(testSettings.user).then(() => {
                                                    cy.doLogoutFromSignUp();
                                                    cy.oktaDeleteSession(_oktaUserId);
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});