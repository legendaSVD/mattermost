import {getAdminAccount} from '../../../../../support/env';
import * as TIMEOUTS from '../../../../../fixtures/timeouts';
const admin = getAdminAccount();
const oneDay = 24 * 60 * 60 * 1000;
const thirtySeconds = 30 * 1000;
export function verifyExtendedSession(testUser, sessionLengthInDays, channelUrl) {
    cy.visit(channelUrl);
    cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: initialSessions}) => {
        expect(initialSessions.length).to.equal(1);
        const initialSession = initialSessions[0];
        const now = Date.now();
        cy.postMessage(`${now}`);
        const soonToExpire = getExpirationFromNow(thirtySeconds);
        cy.dbUpdateUserSession({
            userId: initialSession.userid,
            sessionId: initialSession.id,
            fieldsToUpdate: {expiresat: soonToExpire},
        }).then(({session: updatedSession}) => {
            expect(parseInt(updatedSession.expiresat, 10)).to.equal(soonToExpire);
            cy.externalRequest({user: admin, method: 'POST', path: 'caches/invalidate'});
            cy.reload();
            cy.visit(channelUrl);
            cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: extendedSessions}) => {
                expect(extendedSessions.length).to.equal(1);
                const extendedSession = extendedSessions[0];
                expect(extendedSession.id).to.equal(updatedSession.id);
                expect(parseInt(extendedSession.expiresat, 10)).to.be.greaterThan(parseInt(updatedSession.expiresat, 10));
                expect(parseInt(extendedSession.expiresat, 10)).to.be.greaterThan(parseInt(initialSession.expiresat, 10));
                expect(parseInt(extendedSession.expiresat, 10)).to.be.closeTo(now + (sessionLengthInDays * oneDay * 0.042), thirtySeconds);
            });
            Cypress._.times(20, (i) => {
                cy.postMessage(`${i}`);
            });
        });
    });
}
export function verifyNotExtendedSession(testUser, channelUrl) {
    cy.visit(channelUrl);
    cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: initialSessions}) => {
        expect(initialSessions.length).to.equal(1);
        const initialSession = initialSessions[0];
        expect(parseInt(initialSession.expiresat, 10)).to.be.greaterThan(0);
        const now = Date.now();
        cy.postMessage(`now: ${now}`);
        const soonToExpire = getExpirationFromNow(thirtySeconds);
        cy.dbUpdateUserSession({
            userId: initialSession.userid,
            sessionId: initialSession.id,
            fieldsToUpdate: {expiresat: soonToExpire},
        }).then(({session: updatedSession}) => {
            expect(parseInt(updatedSession.expiresat, 10)).to.equal(soonToExpire);
            cy.externalRequest({user: admin, method: 'POST', path: 'caches/invalidate'});
            cy.reload();
            cy.visit(channelUrl);
            cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: soonToExpireSessions}) => {
                expect(soonToExpireSessions.length).to.equal(1);
                expect(soonToExpireSessions[0].id).to.equal(updatedSession.id);
                expect(parseInt(soonToExpireSessions[0].expiresat, 10)).to.equal(parseInt(updatedSession.expiresat, 10));
                cy.waitUntil(() => {
                    return cy.url().then((url) => {
                        return url.includes('/login');
                    });
                }, {
                    timeout: TIMEOUTS.TWO_MIN,
                    interval: TIMEOUTS.TWO_SEC,
                });
                cy.dbGetActiveUserSessions({username: testUser.username}).then(({sessions: activeSessions}) => {
                    expect(activeSessions.length).to.equal(0);
                });
                cy.dbGetUserSession({sessionId: initialSession.id}).then(({session: unExtendedSession}) => {
                    expect(parseInt(unExtendedSession.expiresat, 10)).to.equal(soonToExpire);
                    expect(parseInt(unExtendedSession.expiresat, 10)).to.be.lessThan(Date.now());
                });
            });
        });
    });
}
function getExpirationFromNow(duration = 0) {
    return Date.now() + duration;
}