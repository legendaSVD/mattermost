import {UserProfile} from '@mattermost/types/users';
import {LdapUser} from 'tests/support/ldap_server_commands';
import {getKeycloakServerSettings} from '../../../../../utils/config';
import {verifyExtendedSession, verifyNotExtendedSession} from './helpers';
describe('Extended Session Length', () => {
    const sessionLengthInDays = 1;
    const samlConfig = getKeycloakServerSettings();
    const sessionConfig = {
        ServiceSettings: {
            SessionLengthSSOInDays: sessionLengthInDays,
            ExtendSessionLengthWithActivity: false,
        },
    };
    let testTeamId: string;
    let testSamlUser: UserProfile;
    let offTopicUrl: string;
    let samlLdapUser: LdapUser;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicenseForFeature('LDAP', 'SAML');
        cy.apiRequireServerDBToMatch();
        cy.createLDAPUser().then((user) => {
            samlLdapUser = user;
        });
        cy.apiCreateTeam('saml-team', 'SAML Team').then(({team}) => {
            testTeamId = team.id;
            offTopicUrl = `/${team.name}/channels/off-topic`;
        });
        cy.apiUpdateConfig(samlConfig).then(() => {
            cy.apiRequireKeycloak();
            cy.apiUploadSAMLIDPCert('keycloak.crt');
            cy.keycloakCreateUsers([samlLdapUser]);
            cy.doKeycloakLogin(samlLdapUser);
            cy.findByText('Logout').click();
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiGetUserByEmail(samlLdapUser.email).then(({user}) => {
            testSamlUser = user;
            cy.apiAddUserToTeam(testTeamId, user.id);
            cy.apiRevokeUserSessions(user.id);
        });
    });
    it('MM-T4047_1 SAML/SSO user session should have extended due to user activity when enabled', () => {
        sessionConfig.ServiceSettings.ExtendSessionLengthWithActivity = true;
        cy.apiUpdateConfig({...samlConfig, ...sessionConfig});
        cy.doKeycloakLogin(samlLdapUser);
        cy.postMessage('hello');
        verifyExtendedSession(testSamlUser, sessionLengthInDays, offTopicUrl);
    });
    it('MM-T4047_2 SAML/SSO user session should not extend even with user activity when disabled', () => {
        sessionConfig.ServiceSettings.ExtendSessionLengthWithActivity = false;
        cy.apiUpdateConfig({...samlConfig, ...sessionConfig});
        cy.doKeycloakLogin(samlLdapUser);
        cy.postMessage('hello');
        verifyNotExtendedSession(testSamlUser, offTopicUrl);
    });
});