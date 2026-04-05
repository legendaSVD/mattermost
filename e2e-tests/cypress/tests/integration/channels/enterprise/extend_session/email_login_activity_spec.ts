import {getAdminAccount} from '../../../../support/env';
describe('MM-T2575 Extend Session - Email Login', () => {
    let offTopicUrl;
    const oneDay = 24 * 60 * 60 * 1000;
    const admin = getAdminAccount();
    let testUser;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicense();
        cy.apiRequireServerDBToMatch();
        cy.apiInitSetup().then(({user, offTopicUrl: url}) => {
            testUser = user;
            offTopicUrl = url;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiRevokeUserSessions(testUser.id);
    });
    it('should redirect to login page when session expired', () => {
        const setting = {
            ServiceSettings: {
                ExtendSessionLengthWithActivity: true,
                SessionLengthWebInHours: 1,
            },
        } as Cypress.AdminConfig;
        cy.apiUpdateConfig(setting);
        cy.apiLogin(testUser);
        cy.visit(offTopicUrl);
        cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: initialSessions}) => {
            cy.postMessage(`${Date.now()}`);
            const expiredSession = parseDateTime(initialSessions[0].createat) + 1;
            cy.dbUpdateUserSession({
                userId: initialSessions[0].userid,
                sessionId: initialSessions[0].id,
                fieldsToUpdate: {expiresat: expiredSession},
            }).then(({session: updatedSession}) => {
                expect(parseDateTime(updatedSession.expiresat)).to.equal(expiredSession);
                cy.externalRequest({user: admin, method: 'POST', path: 'caches/invalidate'});
                cy.reload();
                cy.visit(offTopicUrl);
                cy.url().should('include', `/login?redirect_to=${offTopicUrl.replace(/\
                cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: activeSessions}) => {
                    expect(activeSessions.length).to.equal(0);
                    cy.dbGetUserSession({sessionId: initialSessions[0].id}).then(({session: unExtendedSession}) => {
                        expect(parseDateTime(unExtendedSession.expiresat)).to.equal(expiredSession);
                    });
                });
            });
        });
    });
    const visitAChannel = () => {
        cy.visit(offTopicUrl);
        cy.url().should('not.include', '/login?redirect_to');
        cy.url().should('include', offTopicUrl);
    };
    const postAMessage = (now) => {
        cy.postMessage(now);
        cy.getLastPost().should('contain', now);
    };
    const testCases = [{
        name: 'on visit to a channel',
        fn: visitAChannel,
        sessionLengthInHours: 24,
    }, {
        name: 'on posting a message',
        fn: postAMessage,
        sessionLengthInHours: 48,
    }, {
        name: 'on visit to a channel',
        fn: visitAChannel,
        sessionLengthInHours: 74,
    }, {
        name: 'on posting a message',
        fn: postAMessage,
        sessionLengthInHours: 96,
    }];
    testCases.forEach((testCase) => {
        it(`with SessionLengthWebInHours ${testCase.sessionLengthInHours} and threshold not met, should not extend session ${testCase.name}`, () => {
            const setting = {
                ServiceSettings: {
                    ExtendSessionLengthWithActivity: true,
                    SessionLengthWebInHours: testCase.sessionLengthInHours,
                },
            } as Cypress.AdminConfig;
            cy.apiUpdateConfig(setting);
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
            cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: initialSessions}) => {
                const initialSession = initialSessions[0];
                cy.postMessage(`${Date.now()}`);
                const elapsedBelowThreshold = parseDateTime(initialSession.expiresat) - (testCase.sessionLengthInHours * oneDay * 0.0004);
                cy.dbUpdateUserSession({
                    userId: initialSession.userid,
                    sessionId: initialSession.id,
                    fieldsToUpdate: {expiresat: elapsedBelowThreshold},
                }).then(({session: updatedSession}) => {
                    expect(parseDateTime(updatedSession.expiresat)).to.equal(elapsedBelowThreshold);
                    cy.externalRequest({user: admin, method: 'POST', path: 'caches/invalidate'});
                    cy.reload();
                    const now = Date.now();
                    testCase.fn(now);
                    cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: unExtendedSessions}) => {
                        const unExtendedSession = unExtendedSessions[0];
                        expect(initialSession.id).to.equal(unExtendedSession.id);
                        expect(elapsedBelowThreshold).to.equal(parseDateTime(unExtendedSession.expiresat));
                    });
                });
            });
        });
    });
    testCases.forEach((testCase) => {
        it(`with SessionLengthWebInHours ${testCase.sessionLengthInHours} and threshold met, should extend session ${testCase.name}`, () => {
            const setting = {
                ServiceSettings: {
                    ExtendSessionLengthWithActivity: true,
                    SessionLengthWebInHours: testCase.sessionLengthInHours,
                },
            } as Cypress.AdminConfig;
            cy.apiUpdateConfig(setting);
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
            cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: initialSessions}) => {
                const initialSession = initialSessions[0];
                cy.postMessage(`${Date.now()}`);
                const elapsedAboveThreshold = parseDateTime(initialSession.expiresat) - (testCase.sessionLengthInHours * oneDay * 0.011);
                cy.dbUpdateUserSession({
                    userId: initialSession.userid,
                    sessionId: initialSession.id,
                    fieldsToUpdate: {expiresat: elapsedAboveThreshold},
                }).then(({session: updatedSession}) => {
                    expect(parseDateTime(updatedSession.expiresat)).to.equal(elapsedAboveThreshold);
                    cy.externalRequest({user: admin, method: 'POST', path: 'caches/invalidate'});
                    cy.reload();
                    const now = Date.now();
                    testCase.fn(now);
                    cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: extendedSessions}) => {
                        expect(extendedSessions[0].id).to.equal(updatedSession.id);
                        expect(parseDateTime(extendedSessions[0].expiresat)).to.be.greaterThan(parseDateTime(updatedSession.expiresat));
                        const twentySeconds = 20000;
                        expect(parseDateTime(extendedSessions[0].expiresat)).to.be.closeTo(new Date().setHours(new Date().getHours() + testCase.sessionLengthInHours), twentySeconds);
                    });
                });
            });
        });
    });
    function parseDateTime(value: string) {
        return parseInt(value, 10);
    }
});