import {verifyDraftIcon} from './helpers';
describe('Message Draft and Switch Channels', () => {
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
            cy.visit(`/${testTeam.name}/channels/off-topic`);
        });
    });
    it('MM-T131 Message Draft Pencil Icon - CTRL/CMD+K & "Jump to"', () => {
        const {name, display_name: displayName, id} = testChannel;
        const message = 'message draft test';
        verifyDraftIcon(name, false);
        openChannelFromLhs(testTeam.name, displayName, name);
        cy.findByRole('textbox', `write to ${displayName.toLowerCase()}`).should('be.visible').type(message);
        openChannelFromLhs(testTeam.name, 'Off-Topic', 'off-topic');
        verifyDraftIcon(name, true);
        cy.typeCmdOrCtrl().type('K', {release: true});
        cy.findAllByRole('dialog').first().findByText('Find Channels').should('be.visible');
        cy.findByRole('textbox', {name: 'quick switch input'}).type(displayName.substring(0, 3));
        cy.get('#suggestionList').should('be.visible').within(() => {
            cy.get(`#switchChannel_${id}`).find('.icon-pencil-outline').should('be.visible');
            cy.get(`#switchChannel_${id}`).click({force: true});
        });
        cy.findByRole('textbox', `write to ${displayName.toLowerCase()}`).should('be.visible').and('have.text', message);
    });
});
function openChannelFromLhs(teamName, channelName, name) {
    cy.uiGetLhsSection('CHANNELS').findByText(channelName).click();
    cy.url().should('include', `/${teamName}/channels/${name}`);
}