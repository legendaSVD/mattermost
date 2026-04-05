declare namespace Cypress {
    interface Chainable {
        runLdapSync(admin: UserProfile): boolean;
        getLdapSyncJobStatus(start: number): string;
        doLDAPLogin(settings: object = {}, useEmail = false): Chainable<void>;
        doLDAPLogout(settings: object = {}): Chainable<void>;
        visitLDAPSettings(): Chainable<void>;
        waitForLdapSyncCompletion(start: number, timeout: number): void;
    }
}