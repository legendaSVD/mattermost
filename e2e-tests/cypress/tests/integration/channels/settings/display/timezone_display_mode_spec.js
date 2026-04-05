import moment from 'moment-timezone';
import * as DATE_TIME_FORMAT from '../../../../fixtures/date_time_format';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getTimezoneLabel} from '../../../../utils/timezone';
import {getAdminAccount} from '../../../../support/env';
describe('Profile > Display > Timezone', () => {
    const sysadmin = getAdminAccount();
    const date1 = Date.UTC(2020, 0, 5, 4, 30);
    const date2 = Date.UTC(2020, 0, 5, 12, 30);
    const date3 = Date.UTC(2020, 0, 5, 20, 30);
    const date4 = Date.UTC(2020, 0, 6, 0, 30);
    const localTz = moment.tz.guess();
    const localTzLabel = getTimezoneLabel(localTz);
    const timezoneLocal = {type: 'Canonical', value: localTzLabel};
    const canonicalTz = 'Asia/Hong_Kong';
    const canonicalTzLabel = getTimezoneLabel(canonicalTz);
    const timezoneCanonical = {type: 'Canonical', value: canonicalTzLabel, expectedTz: canonicalTz};
    const utcTz = 'Europe/Lisbon';
    const utcTzLabel = getTimezoneLabel(utcTz);
    const timezoneUTC = {type: 'Default', value: utcTzLabel, expectedTz: 'UTC'};
    let userId;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({user, offTopicUrl}) => {
            userId = user.id;
            cy.visit(offTopicUrl);
            [date1, date2, date3, date4].forEach((createAt, index) => {
                cy.getCurrentChannelId().then((channelId) => {
                    cy.postMessageAs({sender: sysadmin, message: `Hello from ${index}`, channelId, createAt});
                });
            });
            cy.postMessage('Hello from now');
        });
    });
    beforeEach(() => {
        cy.reload();
    });
    it('MM-T301_1 Change timezone automatically', () => {
        const automaticTestCases = [
            {
                timezone: timezoneLocal,
                localTimes: [
                    {postIndex: 0, dateInTimezone: moment(date1).tz(timezoneLocal.value)},
                    {postIndex: 1, dateInTimezone: moment(date2).tz(timezoneLocal.value)},
                    {postIndex: 2, dateInTimezone: moment(date3).tz(timezoneLocal.value)},
                    {postIndex: 3, dateInTimezone: moment(date4).tz(timezoneLocal.value)},
                ],
            },
        ];
        automaticTestCases.forEach((testCase) => {
            cy.apiPatchMe({timezone: {automaticTimezone: '', manualTimezone: 'UTC', useAutomaticTimezone: 'false'}});
            setTimezoneDisplayToAutomatic(testCase.timezone.value);
            cy.apiSaveClockDisplayModeTo24HourPreference(false);
            testCase.localTimes.forEach((localTime) => {
                verifyLocalTimeIsTimezoneFormatted12Hour(localTime);
            });
            cy.apiSaveClockDisplayModeTo24HourPreference(true);
            testCase.localTimes.forEach((localTime) => {
                verifyLocalTimeIsTimezoneFormatted24Hour(localTime);
            });
        });
    });
    it('MM-T301_2 Change timezone manually', () => {
        const manualTestCases = [
            {
                timezone: timezoneCanonical,
                localTimes: [
                    {postIndex: 0, dateInTimezone: moment(date1).tz(timezoneCanonical.expectedTz)},
                    {postIndex: 1, dateInTimezone: moment(date2).tz(timezoneCanonical.expectedTz)},
                    {postIndex: 2, dateInTimezone: moment(date3).tz(timezoneCanonical.expectedTz)},
                    {postIndex: 3, dateInTimezone: moment(date4).tz(timezoneCanonical.expectedTz)},
                ],
            },
            {
                timezone: timezoneUTC,
                localTimes: [
                    {postIndex: 0, dateInTimezone: moment(date1).tz(timezoneUTC.expectedTz)},
                    {postIndex: 1, dateInTimezone: moment(date2).tz(timezoneUTC.expectedTz)},
                    {postIndex: 2, dateInTimezone: moment(date3).tz(timezoneUTC.expectedTz)},
                    {postIndex: 3, dateInTimezone: moment(date4).tz(timezoneUTC.expectedTz)},
                ],
            },
        ];
        manualTestCases.forEach((testCase) => {
            cy.apiPatchMe({timezone: {automaticTimezone: '', manualTimezone: '', useAutomaticTimezone: 'true'}});
            setTimezoneDisplayToManual(testCase.timezone.value);
            cy.apiSaveClockDisplayModeTo24HourPreference(false);
            testCase.localTimes.forEach((localTime) => {
                verifyLocalTimeIsTimezoneFormatted12Hour(localTime);
            });
            cy.apiSaveClockDisplayModeTo24HourPreference(true);
            testCase.localTimes.forEach((localTime) => {
                verifyLocalTimeIsTimezoneFormatted24Hour(localTime);
            });
        });
        verifyUnchangedTimezoneOnInvalidInput(userId);
    });
});
function navigateToTimezoneDisplaySettings() {
    cy.uiOpenSettingsModal('Display');
    cy.get('#timezoneEdit').should('be.visible').click();
    cy.get('.section-max').should('be.visible').scrollIntoView();
}
function setTimezoneDisplayTo(isAutomatic, value) {
    navigateToTimezoneDisplaySettings();
    cy.get('.setting-list-item').as('settingItems');
    cy.get('@settingItems').find('#automaticTimezoneInput').should('be.visible').uncheck().should('be.not.checked');
    cy.get('@settingItems').find('#displayTimezone').should('be.visible').find('input').as('changeTimezone').should('be.enabled');
    if (isAutomatic) {
        cy.get('@settingItems').find('#automaticTimezoneInput').check().should('be.checked');
        cy.get('@changeTimezone').invoke('text').then((timezoneDesc) => {
            expect(value.replace('_', ' ')).to.contain(timezoneDesc);
        });
        cy.get('@changeTimezone').should('be.disabled');
    } else {
        cy.get('@changeTimezone').typeWithForce(`${value}{enter}`);
    }
    cy.uiSave();
    cy.get('#timezoneDesc').should('be.visible').invoke('text').then((timezoneDesc) => {
        expect(value.replace('_', ' ')).to.contain(timezoneDesc);
    });
    cy.uiClose();
}
function setTimezoneDisplayToAutomatic(value) {
    setTimezoneDisplayTo(true, value);
}
function setTimezoneDisplayToManual(value) {
    setTimezoneDisplayTo(false, value);
}
function verifyLocalTimeIsTimezoneFormatted(localTime, timeFormat) {
    const formattedTime = localTime.dateInTimezone.format(timeFormat);
    cy.findAllByTestId('postView', {timeout: TIMEOUTS.ONE_MIN}).
        eq(localTime.postIndex).find('time', {timeout: TIMEOUTS.HALF_SEC}).
        should('have.text', formattedTime);
}
function verifyLocalTimeIsTimezoneFormatted12Hour(localTime) {
    verifyLocalTimeIsTimezoneFormatted(localTime, DATE_TIME_FORMAT.TIME_12_HOUR);
}
function verifyLocalTimeIsTimezoneFormatted24Hour(localTime) {
    verifyLocalTimeIsTimezoneFormatted(localTime, DATE_TIME_FORMAT.TIME_24_HOUR);
}
function verifyUnchangedTimezoneOnInvalidInput(userId) {
    cy.apiGetMe(userId).then(({user: {timezone}}) => {
        navigateToTimezoneDisplaySettings();
        cy.get('.setting-list-item').as('settingItems');
        cy.get('@settingItems').find('#automaticTimezoneInput').should('be.visible').uncheck().should('be.not.checked');
        cy.get('@settingItems').find('#displayTimezone').find('input').
            should('be.enabled').
            typeWithForce('invalid');
        cy.uiSave();
        cy.get('#timezoneDesc').should('be.visible').invoke('text').then((timezoneDesc) => {
            expect(getTimezoneLabel(timezone.manualTimezone)).to.equal(timezoneDesc);
        });
    });
}