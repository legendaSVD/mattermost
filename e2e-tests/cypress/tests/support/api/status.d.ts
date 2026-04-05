declare namespace Cypress {
    interface Chainable {
        apiUpdateUserStatus(status: string): Chainable<UserStatus>;
        apiGetStatus(userId: string): Chainable<UserStatus>;
        apiUpdateUserCustomStatus(customStatus: UserCustomStatus);
        apiClearUserCustomStatus();
    }
}