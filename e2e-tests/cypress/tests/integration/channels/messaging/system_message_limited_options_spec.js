import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let townsquareLink;
    let otherUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            otherUser = user;
            townsquareLink = `/${team.name}/channels/town-square`;
            cy.visit(townsquareLink);
        });
    });
    it('MM-T213 System message limited options', () => {
        cy.updateChannelHeader(Date.now());
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#post_${lastPostId}`).trigger('mouseover', {force: true});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get(`#CENTER_commentIcon_${lastPostId}`).should('not.exist');
            cy.get(`#CENTER_reaction_${lastPostId}`).should('not.exist');
            cy.get(`#CENTER_button_${lastPostId}`).click({force: true});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get(`#CENTER_dropdown_${lastPostId}`).find('li').then((items) => {
                expect(items.length).to.equal(1);
                expect(items[0].id).to.equal(`delete_post_${lastPostId}`);
            });
            cy.apiLogin(otherUser);
            cy.visit(townsquareLink);
            cy.get(`#post_${lastPostId}`).trigger('mouseover', {force: true});
            cy.wait(TIMEOUTS.THREE_SEC);
            cy.get(`#CENTER_commentIcon_${lastPostId}`).should('not.exist');
            cy.get(`#CENTER_reaction_${lastPostId}`).should('not.exist');
            cy.get(`#CENTER_button_${lastPostId}`).should('not.exist');
        });
    });
});