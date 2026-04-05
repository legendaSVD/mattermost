declare namespace Cypress {
    interface Chainable {
        apiLDAPSync(): Chainable;
        apiLDAPTest(): Chainable;
        apiSyncLDAPUser({ldapUser = {}, bypassTutorial = true}): Chainable<UserProfile>;
    }
}