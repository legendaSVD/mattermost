import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Profile popover', () => {
    before(() => {
        cy.viewport('iphone-6');
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.postMessage('Test message');
        });
    });
    it('MM-T145_1 Mobile view: View profile popover from profile pic (standard mode)', () => {
        cy.apiSaveMessageDisplayPreference();
        cy.getLastPostId().then((postId) => {
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get(`#post_${postId}`).find('.profile-icon > img').click({force: true});
            cy.get('div.user-profile-popover').should('be.visible');
            cy.get('body').type('{esc}');
        });
    });
    it('MM-T145_2 Mobile view: View profile popover from profile pic (compact mode)', () => {
        cy.apiSaveMessageDisplayPreference('compact');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.user-popover').click({force: true});
            cy.get('div.user-profile-popover').should('be.visible');
        });
    });
});