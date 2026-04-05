declare namespace Cypress {
    interface Chainable {
        checkForLDAPError(): Chainable;
        skipOrCreateTeam: typeof skipOrCreateTeam;
        checkLoginFailed: typeof checkLoginFailed;
        doMemberLogoutFromSignUp: typeof doMemberLogoutFromSignUp;
        doLogoutFromSignUp: typeof doLogoutFromSignUp;
        checkLoginPage: typeof checkLoginPage;
        checkLeftSideBar: typeof checkLeftSideBar;
        checkInvitePeoplePage: typeof checkInvitePeoplePage;
    }
}