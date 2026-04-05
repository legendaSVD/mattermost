import moment from 'moment-timezone';
import * as DATE_TIME_FORMAT from '../../../../fixtures/date_time_format';
describe('Settings > Display > Clock Display Mode', () => {
    const mainMessage = 'Test for clock display mode';
    const replyMessage1 = 'Reply 1 for clock display mode';
    const replyMessage2 = 'Reply 2 for clock display mode';
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel, offTopicUrl}) => {
            testTeam = team;
            testChannel = channel;
            cy.visit(offTopicUrl);
            cy.postMessage(mainMessage);
            cy.clickPostCommentIcon();
            [replyMessage1, replyMessage2].forEach((message) => {
                cy.postMessageReplyInRHS(message);
            });
        });
    });
    it('MM-T2098 Clock display mode setting to "12-hour clock"', () => {
        setClockDisplayTo12Hour();
        cy.getNthPostId(1).then((postId) => {
            verifyClockFormatIs12HourForPostWithMessage(postId, mainMessage, true);
        });
        cy.getNthPostId(-2).then((postId) => {
            verifyClockFormatIs12HourForPostWithMessage(postId, replyMessage1, false);
        });
        cy.getNthPostId(-1).then((postId) => {
            verifyClockFormatIs12HourForPostWithMessage(postId, replyMessage2, false);
        });
    });
    it('MM-T2096_1 Clock Display - Can switch from 12-hr to 24-hr', () => {
        setClockDisplayTo24Hour();
        cy.getNthPostId(1).then((postId) => {
            verifyClockFormatIs24HourForPostWithMessage(postId, mainMessage);
        });
        cy.getNthPostId(-2).then((postId) => {
            verifyClockFormatIs24HourForPostWithMessage(postId, replyMessage1);
        });
        cy.getNthPostId(-1).then((postId) => {
            verifyClockFormatIs24HourForPostWithMessage(postId, replyMessage2);
        });
    });
    it('MM-T2096_2 Clock Display - 24-hr - post message after 1pm', () => {
        cy.apiAdminLogin().then(({user}) => {
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            setClockDisplayTo24Hour();
            const now = new Date();
            const nextYear = now.getFullYear() + 1;
            const futureDate = Date.UTC(nextYear, 0, 5, 14, 37);
            cy.postMessageAs({sender: user, message: 'Hello from Jan 5, 2:37pm', channelId: testChannel.id, createAt: futureDate});
            cy.getLastPost().
                find('time').
                should('contain', '14:37').
                and('have.attr', 'datetime', `${nextYear}-01-05T14:37:00.000`);
        });
    });
});
function navigateToClockDisplaySettings() {
    cy.uiOpenSettingsModal('Display');
    cy.get('#displayButton').should('be.visible').click();
    cy.get('#clockEdit').
        scrollIntoView().
        should('be.visible').
        click();
    cy.get('.section-max').
        should('be.visible').
        scrollIntoView();
}
function setClockDisplayTo(clockFormat) {
    navigateToClockDisplaySettings();
    cy.get(`#${clockFormat}`).
        should('be.visible').
        click({force: true}).
        should('be.checked');
    cy.uiSave();
    if (clockFormat === 'clockFormatA') {
        cy.get('#clockDesc').should('have.text', '12-hour clock (example: 4:00 PM)');
    } else {
        cy.get('#clockDesc').should('have.text', '24-hour clock (example: 16:00)');
    }
    cy.uiClose();
}
function setClockDisplayTo12Hour() {
    setClockDisplayTo('clockFormatA');
}
function setClockDisplayTo24Hour() {
    setClockDisplayTo('clockFormatB');
}
function verifyClockFormat(timeFormat, isVisible) {
    cy.get('time').first().then(($timeEl) => {
        cy.wrap($timeEl).invoke('attr', 'datetime').then((dateTimeString) => {
            const formattedTime = moment(dateTimeString).format(timeFormat);
            cy.wrap($timeEl).should(isVisible ? 'be.visible' : 'exist').and('have.text', formattedTime);
        });
    });
}
function verifyClockFormatIs12Hour(isVisible) {
    verifyClockFormat(DATE_TIME_FORMAT.TIME_12_HOUR, isVisible);
}
function verifyClockFormatIs24Hour(isVisible) {
    verifyClockFormat(DATE_TIME_FORMAT.TIME_24_HOUR, isVisible);
}
function verifyClockFormatIs12HourForPostWithMessage(postId, message, isVisible) {
    cy.get(`#post_${postId}`).within(() => {
        cy.get('.post-message__text').should('have.text', message);
        verifyClockFormatIs12Hour(isVisible);
    });
    cy.get(`#rhsPost_${postId}`).within(() => {
        cy.get('.post-message__text').should('have.text', message);
        verifyClockFormatIs12Hour(isVisible);
    });
}
function verifyClockFormatIs24HourForPostWithMessage(postId, message, isVisible) {
    cy.get(`#post_${postId}`).within(() => {
        cy.get('.post-message__text').should('have.text', message);
        verifyClockFormatIs24Hour(isVisible);
    });
    cy.get(`#rhsPost_${postId}`).within(() => {
        cy.get('.post-message__text').should('have.text', message);
        verifyClockFormatIs24Hour(isVisible);
    });
}