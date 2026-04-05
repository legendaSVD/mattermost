import {getAdminAccount} from '../../../support/env';
describe('Messaging', () => {
    const sysadmin = getAdminAccount();
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
            [
                Date.UTC(2020, 0, 5, 4, 30),
                Date.UTC(2020, 0, 5, 12, 30),
                Date.UTC(2020, 0, 5, 20, 30),
                Date.UTC(2020, 0, 6, 0, 30),
            ].forEach((createAt, index) => {
                cy.postMessageAs({sender: sysadmin, message: `Hello from ${index}`, channelId: channel.id, createAt});
            });
            cy.postMessage('Hello from now');
            cy.reload();
        });
    });
    it('MM-T713 Post time should render correct format and locale', () => {
        const testCases = [
            {
                name: 'in English',
                publicChannel: 'CHANNELS',
                locale: 'en',
                manualTimezone: 'UTC',
                localTimes: [
                    {postIndex: 0, standard: '4:30 AM', military: '04:30'},
                    {postIndex: 1, standard: '12:30 PM', military: '12:30'},
                    {postIndex: 2, standard: '8:30 PM', military: '20:30'},
                    {postIndex: 3, standard: '12:30 AM', military: '00:30'},
                ],
            },
            {
                name: 'in Spanish',
                publicChannel: 'CANALES',
                locale: 'es',
                manualTimezone: 'UTC',
                localTimes: [
                    {postIndex: 0, standard: '4:30 a. m.', military: '4:30'},
                    {postIndex: 1, standard: '12:30 p. m.', military: '12:30'},
                    {postIndex: 2, standard: '8:30 p. m.', military: '20:30'},
                    {postIndex: 3, standard: '12:30 a. m.', military: '0:30'},
                ],
            },
            {
                name: 'in react-intl unsupported timezone',
                publicChannel: 'CHANNELS',
                locale: 'en',
                manualTimezone: 'NZ-CHAT',
                localTimes: [
                    {postIndex: 0, standard: '6:15 PM', military: '18:15'},
                    {postIndex: 1, standard: '2:15 AM', military: '02:15'},
                    {postIndex: 2, standard: '10:15 AM', military: '10:15'},
                    {postIndex: 3, standard: '2:15 PM', military: '14:15'},
                ],
            },
        ];
        testCases.forEach((testCase) => {
            testCase.localTimes.forEach((localTime, index) => {
                cy.apiSaveClockDisplayModeTo24HourPreference(false);
                setLocaleAndTimezone(testCase.locale, testCase.manualTimezone);
                cy.findByText(testCase.publicChannel).should('be.visible');
                cy.findAllByTestId('postView').eq(index).find('.post__time', {timeout: 500}).should('have.text', localTime.standard);
            });
            testCase.localTimes.forEach((localTime, index) => {
                cy.apiSaveClockDisplayModeTo24HourPreference(true);
                setLocaleAndTimezone(testCase.locale, testCase.manualTimezone);
                cy.findByText(testCase.publicChannel).should('be.visible');
                cy.findAllByTestId('postView').eq(index).find('.post__time', {timeout: 500}).should('have.text', localTime.military);
            });
        });
    });
});
function setLocaleAndTimezone(locale, manualTimezone) {
    cy.apiPatchMe({
        locale,
        timezone: {
            manualTimezone,
            automaticTimezone: '',
            useAutomaticTimezone: 'false',
        },
    });
}