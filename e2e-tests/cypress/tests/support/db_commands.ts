import {ChainableT} from '../types';
const dbClient = Cypress.env('dbClient');
const dbConnection = Cypress.env('dbConnection');
const dbConfig = {
    client: dbClient,
    connection: dbConnection,
};
const message = `Compare "cypress.json" against "config.json" of mattermost-server. It should match database driver and connection string.
The value at "cypress.json" is based on default mattermost-server's local database:
{"dbClient": "${dbClient}", "dbConnection": "${dbConnection}"}
If your server is using database other than the default, you may export those as env variables, like:
"__CYPRESS_dbClient=[dbClient] CYPRESS_dbConnection=[dbConnection] npm run cypress:open__"
`;
function apiRequireServerDBToMatch(): ChainableT {
    return cy.apiGetConfig().then(({config}) => {
        if (config.SqlSettings && config.SqlSettings.DriverName !== dbClient) {
            expect(config.SqlSettings.DriverName, message).to.equal(dbClient);
        }
    });
}
Cypress.Commands.add('apiRequireServerDBToMatch', apiRequireServerDBToMatch);
interface GetActiveUserSessionsParam {
    username: string;
    userId?: string;
    limit?: number;
}
interface GetActiveUserSessionsResult {
    user: Cypress.UserProfile;
    sessions: Array<Record<string, any>>;
}
function dbGetActiveUserSessions(params: GetActiveUserSessionsParam): ChainableT<GetActiveUserSessionsResult> {
    return cy.task('dbGetActiveUserSessions', {dbConfig, params}).then(({user, sessions, errorMessage}) => {
        expect(errorMessage).to.be.undefined;
        return cy.wrap({user, sessions});
    });
}
Cypress.Commands.add('dbGetActiveUserSessions', dbGetActiveUserSessions);
interface GetUserParam {
    username: string;
}
interface GetUserResult {
    user: Cypress.UserProfile & {mfasecret: string};
}
function dbGetUser(params: GetUserParam): ChainableT<GetUserResult> {
    return cy.task('dbGetUser', {dbConfig, params}).then(({user, errorMessage, error}) => {
        verifyError(error, errorMessage);
        return cy.wrap({user});
    });
}
Cypress.Commands.add('dbGetUser', dbGetUser);
interface GetUserSessionParam {
    sessionId: string;
}
interface GetUserSessionResult {
    session: Record<string, any>;
}
function dbGetUserSession(params: GetUserSessionParam): ChainableT<GetUserSessionResult> {
    return cy.task('dbGetUserSession', {dbConfig, params}).then(({session, errorMessage}) => {
        expect(errorMessage).to.be.undefined;
        return cy.wrap({session});
    });
}
Cypress.Commands.add('dbGetUserSession', dbGetUserSession);
interface UpdateUserSessionParam {
    sessionId: string;
    userId: string;
    fieldsToUpdate: Record<string, any>;
}
interface UpdateUserSessionResult {
    session: Record<string, any>;
}
function dbUpdateUserSession(params: UpdateUserSessionParam): ChainableT<UpdateUserSessionResult> {
    return cy.task('dbUpdateUserSession', {dbConfig, params}).then(({session, errorMessage}) => {
        expect(errorMessage).to.be.undefined;
        return cy.wrap({session});
    });
}
Cypress.Commands.add('dbUpdateUserSession', dbUpdateUserSession);
function dbRefreshPostStats(): ChainableT<{success?: boolean; skipped?: boolean; message?: string}> {
    return cy.task('dbRefreshPostStats', {dbConfig}).then(({success, skipped, message, errorMessage, error}) => {
        verifyError(error, errorMessage);
        return cy.wrap({success, skipped, message});
    });
}
Cypress.Commands.add('dbRefreshPostStats', dbRefreshPostStats);
function verifyError(error, errorMessage) {
    if (errorMessage) {
        expect(errorMessage, `${errorMessage}\n\n${message}\n\n${JSON.stringify(error)}`).to.be.undefined;
    }
}
declare global {
    namespace Cypress {
        interface Chainable {
            apiRequireServerDBToMatch: typeof apiRequireServerDBToMatch;
            dbGetActiveUserSessions: typeof dbGetActiveUserSessions;
            dbGetUser: typeof dbGetUser;
            dbGetUserSession: typeof dbGetUserSession;
            dbUpdateUserSession: typeof dbUpdateUserSession;
            dbRefreshPostStats: typeof dbRefreshPostStats;
        }
    }
}