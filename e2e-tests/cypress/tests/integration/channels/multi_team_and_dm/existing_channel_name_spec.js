import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Channel', () => {
    let testTeamId;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team}) => {
            testTeamId = team.id;
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T422_1 Channel name already taken for public channel', () => {
        createNewChannel('unique-public', false, testTeamId).as('channel');
        cy.reload();
        cy.get('@channel').then((channel) => {
            verifyChannel(channel);
        });
    });
    it('MM-T422_2 Channel name already taken for private channel', () => {
        createNewChannel('unique-private', true, testTeamId).as('channel');
        cy.reload();
        cy.get('@channel').then((channel) => {
            verifyChannel(channel);
        });
    });
    it('MM-43881 Channel name already taken for public channel and changed allows to create', () => {
        createNewChannel('other-public', false, testTeamId).as('channel');
        cy.reload();
        cy.get('@channel').then((channel) => {
            verifyExistingChannelError(channel.name);
            cy.get('#input_new-channel-modal-name').should('be.visible').click().type(`${channel.name}1`);
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('.url-input-error').should('not.exist');
            cy.findByText('Create channel').should('not.have.class', 'disabled');
            cy.findByText('Cancel').click();
        });
    });
});
function verifyExistingChannelError(newChannelName, makePrivate = false) {
    cy.uiBrowseOrCreateChannel('Create new channel');
    if (makePrivate) {
        cy.get('#public-private-selector-button-P').click();
    } else {
        cy.get('#public-private-selector-button-O').click();
    }
    cy.get('#input_new-channel-modal-name').should('be.visible').click().type(`${newChannelName}{enter}`);
    cy.get('.url-input-error').contains('A channel with that URL already exists');
    cy.findByText('Create channel').should('have.class', 'disabled');
}
function verifyChannel(channel) {
    cy.uiGetLhsSection('CHANNELS').find('.SidebarChannel').its('length').as('origChannelLength');
    cy.uiGetLhsSection('CHANNELS').should('contain', channel.display_name);
    verifyExistingChannelError(channel.name);
    cy.findByText('Cancel').click();
    verifyExistingChannelError(channel.name, true);
    cy.findByText('Cancel').click();
    cy.get('@origChannelLength').then((origChannelLength) => {
        cy.uiGetLhsSection('CHANNELS').find('.SidebarChannel').its('length').should('equal', origChannelLength);
    });
}
function createNewChannel(name, isPrivate = false, testTeamId) {
    const makePrivate = isPrivate ? 'P' : 'O';
    return cy.apiCreateChannel(testTeamId, name, name, makePrivate, 'Let us chat here').its('channel');
}