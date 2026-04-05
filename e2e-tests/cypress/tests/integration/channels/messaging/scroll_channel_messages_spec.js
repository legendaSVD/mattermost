import {getAdminAccount} from '../../../support/env';
describe('Scroll channel`s messages in mobile view', () => {
    const sysadmin = getAdminAccount();
    let newChannel;
    before(() => {
        cy.viewport('iphone-6');
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            newChannel = channel;
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T127 Floating timestamp in mobile view', () => {
        let date;
        const oldDate = Cypress.dayjs().subtract(1, 'year').valueOf();
        for (let i = 0; i < 5; i++) {
            cy.postMessageAs({sender: sysadmin, message: 'Hello \n from \n other \n day \n - last year', channelId: newChannel.id, createAt: oldDate});
        }
        for (let j = 2; j >= 0; j--) {
            date = Cypress.dayjs().subtract(j, 'days').valueOf();
            for (let i = 0; i < 5; i++) {
                cy.postMessageAs({sender: sysadmin, message: `Hello \n from \n other \n day \n - ${j}`, channelId: newChannel.id, createAt: date});
            }
        }
        cy.reload();
        cy.findAllByTestId('postView').eq(19).scrollIntoView();
        cy.findByTestId('floatingTimestamp').should('be.visible').and('have.text', 'Today');
        cy.findAllByTestId('postView').eq(14).scrollIntoView();
        cy.findByTestId('floatingTimestamp').should('be.visible').and('have.text', 'Yesterday');
        cy.findAllByTestId('postView').eq(9).scrollIntoView();
        cy.findByTestId('floatingTimestamp').should('be.visible').and('have.text', Cypress.dayjs().subtract(2, 'days').format('dddd'));
        cy.findAllByTestId('postView').eq(0).scrollIntoView();
        cy.findByTestId('floatingTimestamp').should('be.visible').and('have.text', Cypress.dayjs().subtract(1, 'year').format('MMMM DD, YYYY'));
    });
});