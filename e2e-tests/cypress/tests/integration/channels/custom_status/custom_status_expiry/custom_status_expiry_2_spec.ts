import dayjs from 'dayjs';
describe('MM-T4064 Status expiry visibility', () => {
    const waitingTime = 60;
    let expiresAt = dayjs();
    const expiryTimeFormat = 'h:mm A';
    beforeEach(() => {
        cy.apiAdminLogin().apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
        cy.apiInitSetup({loginAfter: true}).then(({channelUrl}) => {
            cy.visit(channelUrl);
            cy.postMessage('Hello World!');
        });
    });
    it('MM-T4064_6 should show expiry time in the tooltip of custom status emoji in the post header', () => {
        cy.uiOpenUserMenu('Set custom status');
        cy.findByRole('dialog', {name: 'Set a status'}).should('exist').within(() => {
            cy.get('.statusSuggestion__row').first().click();
            cy.findByText('Set Status').click();
        });
        cy.get('#custom_status_modal').should('not.exist');
        expiresAt = dayjs().add(waitingTime, 'minute');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.emoticon').should('exist').trigger('mouseenter');
            cy.findByRole('tooltip').should('exist').and('contain.text', expiresAt.format(expiryTimeFormat));
            cy.get(`#post_${postId}`).find('.emoticon').trigger('mouseleave');
        });
    });
    it('MM-T4064_7 should show custom status expiry time in the user popover', () => {
        cy.uiOpenUserMenu('Set custom status');
        cy.findByRole('dialog', {name: 'Set a status'}).should('exist').within(() => {
            cy.get('.statusSuggestion__row').first().click();
            cy.findByText('Set Status').click();
        });
        cy.get('#custom_status_modal').should('not.exist');
        expiresAt = dayjs().add(waitingTime, 'minute');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.emoticon').should('exist').trigger('mouseenter');
            cy.findByRole('tooltip').should('exist').and('contain.text', expiresAt.format(expiryTimeFormat));
            cy.get(`#post_${postId}`).find('.emoticon').trigger('mouseleave');
        });
        cy.get('.post.current--user .post__header .user-popover').first().click();
        cy.get('div.user-profile-popover').should('exist');
        cy.get('div.user-profile-popover #user-popover-status .user-popover__subtitle time').should('have.text', expiresAt.format(expiryTimeFormat));
    });
});