import {UserProfile} from '@mattermost/types/users';
import ldapUsers from '../../../../../fixtures/ldap_users.json';
import {verifyExtendedSession, verifyNotExtendedSession} from './helpers';
describe('Extended Session Length', () => {
    const sessionLengthInHours = 1;
    const setting = {
        ServiceSettings: {
            SessionLengthWebInHours: sessionLengthInHours,
            ExtendSessionLengthWithActivity: false,
        },
    };
    let testLdapUser: UserProfile;
    let offTopicUrl: string;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicense();
        cy.apiRequireServerDBToMatch();
        const ldapUser = ldapUsers['test-1'];
        cy.apiSyncLDAPUser({ldapUser}).then((user) => {
            testLdapUser = user;
        });
        cy.apiInitSetup().then(({team, offTopicUrl: url}) => {
            offTopicUrl = url;
            cy.apiAddUserToTeam(team.id, testLdapUser.id);
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiRevokeUserSessions(testLdapUser.id);
    });
    it('MM-T4046_1 LDAP user session should have extended due to user activity when enabled', () => {
        setting.ServiceSettings.ExtendSessionLengthWithActivity = true;
        cy.apiUpdateConfig(setting);
        cy.apiLogin(testLdapUser);
        verifyExtendedSession(testLdapUser, sessionLengthInHours, offTopicUrl);
    });
    it('MM-T4046_2 LDAP user session should not extend even with user activity when disabled', () => {
        setting.ServiceSettings.ExtendSessionLengthWithActivity = false;
        cy.apiUpdateConfig(setting);
        cy.apiLogin(testLdapUser);
        verifyNotExtendedSession(testLdapUser, offTopicUrl);
    });
});