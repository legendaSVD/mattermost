import {UserProfile} from '@mattermost/types/users';
import {verifyExtendedSession, verifyNotExtendedSession} from './helpers';
describe('Extended Session Length', () => {
    const sessionLengthInHours = 1;
    const setting = {
        ServiceSettings: {
            SessionLengthWebInHours: sessionLengthInHours,
            ExtendSessionLengthWithActivity: false,
        },
    };
    let emailUser: UserProfile;
    let offTopicUrl: string;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicense();
        cy.apiRequireServerDBToMatch();
        cy.apiInitSetup().then(({user, offTopicUrl: url}) => {
            emailUser = user;
            offTopicUrl = url;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiRevokeUserSessions(emailUser.id);
    });
    it('MM-T4045_1 Email user session should have extended due to user activity when enabled', () => {
        setting.ServiceSettings.ExtendSessionLengthWithActivity = true;
        cy.apiUpdateConfig(setting);
        cy.apiLogin(emailUser);
        verifyExtendedSession(emailUser, sessionLengthInHours, offTopicUrl);
    });
    it('MM-T4045_2 Email user session should not extend even with user activity when disabled', () => {
        setting.ServiceSettings.ExtendSessionLengthWithActivity = false;
        cy.apiUpdateConfig(setting);
        cy.apiLogin(emailUser);
        verifyNotExtendedSession(emailUser, offTopicUrl);
    });
});