import moment from 'moment-timezone';
describe('Custom Status - CTAs for New Users', () => {
    before(() => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
        const userCreateAt = moment().subtract(8, 'day').unix();
        cy.apiInitSetup({loginAfter: true, userCreateAt}).then(({team, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T3851_1 should show Update your status in the post header', () => {
        cy.postMessage('Hello World!');
        cy.get('.post.current--user .post__header').findByText('Update your status').should('exist').and('be.visible');
    });
    it('MM-T3851_2 should open status dropdown with pulsating dot when clicked on Update your status post header', () => {
        cy.get('.post.current--user .post__header').findByText('Update your status').click();
        cy.get('#statusDropdownMenu').should('exist');
        cy.get('#statusDropdownMenu .custom_status__row .pulsating_dot').should('exist');
    });
    it('MM-T3851_3 should remove pulsating dot and Update your status post header after opening modal', () => {
        cy.get('#statusDropdownMenu .custom_status__row .pulsating_dot').click();
        cy.get('#custom_status_modal').should('exist').get('button.close').click();
        cy.get('.post.current--user .post__header').findByText('Update your status').should('not.exist');
        cy.get('.MenuWrapper .status-wrapper').click();
        cy.get('#statusDropdownMenu .custom_status__row .pulsating_dot').should('not.exist');
    });
});