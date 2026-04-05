import {getAdminAccount} from '../../../support/env';
describe('Messaging', () => {
    const admin = getAdminAccount();
    let newChannel;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            newChannel = channel;
            cy.apiPatchMe({
                locale: 'en',
                timezone: {automaticTimezone: '', manualTimezone: 'UTC', useAutomaticTimezone: 'false'},
            });
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-21482 Date separators should translate correctly', () => {
        function verifyDateSeparator(index, match) {
            cy.findAllByTestId('basicSeparator').eq(index).within(() => {
                cy.findByText(match);
            });
        }
        const oldDate = Date.UTC(2019, 0, 5, 12, 30);
        cy.postMessageAs({sender: admin, message: 'Hello from Jan 5, 2019 12:30pm', channelId: newChannel.id, createAt: oldDate});
        const ago4 = Cypress.dayjs().subtract(4, 'days').valueOf();
        cy.postMessageAs({sender: admin, message: 'Hello from 4 days ago', channelId: newChannel.id, createAt: ago4});
        const yesterdaysDate = Cypress.dayjs().subtract(1, 'days').valueOf();
        cy.postMessageAs({sender: admin, message: 'Hello from yesterday', channelId: newChannel.id, createAt: yesterdaysDate});
        cy.postMessage('Hello from today');
        cy.reload();
        verifyDateSeparator(0, /^January (05|06), 2019/);
        verifyDateSeparator(1, /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/);
        verifyDateSeparator(2, 'Yesterday');
        verifyDateSeparator(3, 'Today');
        cy.apiPatchMe({locale: 'es'});
        cy.reload();
        verifyDateSeparator(0, /^(04|05) de enero de 2019/);
        verifyDateSeparator(1, /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)$/);
        verifyDateSeparator(2, 'Ayer');
        verifyDateSeparator(3, 'Hoy');
        cy.apiPatchMe({timezone: {automaticTimezone: '', manualTimezone: 'NZ-CHAT', useAutomaticTimezone: 'false'}});
        cy.reload();
        verifyDateSeparator(0, /^(05|06) de enero de 2019/);
    });
});