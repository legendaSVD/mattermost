import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Integrations', () => {
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
            cy.visit(`/${team.name}/integrations/commands/add`);
        });
    });
    it('MM-T581 Regen token', () => {
        cy.get('#displayName', {timeout: TIMEOUTS.ONE_MIN}).type('Token Regen Test');
        cy.get('#description').type('test of token regeneration');
        cy.get('#trigger').type('regen');
        cy.get('#url').type('http://hidden-peak-21733.herokuapp.com/test_inchannel');
        cy.get('#autocomplete').check();
        cy.get('#saveCommand').click();
        let generatedToken;
        cy.get('p.word-break--all').then((number1) => {
            generatedToken = number1.text().split(' ').pop();
        });
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessage('/regen testing');
        cy.uiWaitUntilMessagePostedIncludes(testChannel.id);
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).contains(generatedToken);
        });
        cy.visit(`/${testTeam.name}/integrations/commands/installed`);
        cy.findByText('Regenerate Token').click();
        cy.wait(TIMEOUTS.HALF_SEC);
        let regeneratedToken;
        cy.get('.item-details__token > span').then((number2) => {
            regeneratedToken = number2.text().split(' ').pop();
        });
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.postMessage('/regen testing 2nd message');
        cy.uiWaitUntilMessagePostedIncludes(testChannel.id);
        cy.getLastPostId().then((lastPostId) => {
            cy.get(`#${lastPostId}_message`).contains(regeneratedToken).should('not.contain', generatedToken);
        });
    });
});