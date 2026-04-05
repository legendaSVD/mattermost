declare namespace Cypress {
    interface Chainable {
        uiCreateChannel(options: Record<string, unknown>): Chainable;
        uiAddUsersToCurrentChannel(usernameList: string[]);
        uiInviteUsersToCurrentChannel(usernameList: string[]);
        uiArchiveChannel();
        uiUnarchiveChannel();
        uiLeaveChannel(isPrivate?: boolean);
    }
}