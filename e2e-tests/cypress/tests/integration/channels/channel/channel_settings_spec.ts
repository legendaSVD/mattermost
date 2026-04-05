import {Team} from '@mattermost/types/teams';
import {
    beMuted,
    beUnmuted,
} from '../../../support/assertions';
describe('Channel Settings', () => {
    let testTeam: Team;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            cy.apiCreateChannel(testTeam.id, 'channel', 'Private Channel', 'P').then(({channel}) => {
                cy.apiAddUserToChannel(channel.id, user.id);
            });
            cy.apiLogin(user);
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('MM-T882 Channel URL validation works properly', () => {
        cy.apiCreateChannel(testTeam.id, 'channel-test', 'Channel').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.get('#channelHeaderDropdownButton').click();
            cy.findByText('Channel Settings').click();
            cy.get('#input_channel-settings-name').clear().type('town-square');
            cy.get('.url-input-button').click();
            cy.get('.url-input-container input').clear().type('town-square');
            cy.get('.url-input-container button.url-input-button').click();
            cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
            cy.get('.SaveChangesPanel').should('contain', 'There are errors in the form above');
            cy.get('.url-input-error').should('be.visible').and('contain.text', 'A channel with that name already exists on the same team.');
            cy.url().should('include', `/${testTeam.name}/channels/${channel.name}`);
            cy.get('.url-input-container input').clear().type('another-town-square');
            cy.get('.url-input-button').click();
            cy.get('.url-input-container button.url-input-button').click();
            cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
            cy.url().should('include', `/${testTeam.name}/channels/another-town-square`);
        });
    });
    it('MM-T887 Channel dropdown menu - Mute / Unmute', () => {
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelHeaderDropdownMenu').should('exist').
            findByText('Mute Channel').should('be.visible').click();
        cy.get('#sidebarItem_off-topic').should(beMuted);
        cy.get('#toggleMute').should('be.visible');
        cy.uiGetLhsSection('CHANNELS').find('.SidebarChannel').
            last().should('contain', 'Off-Topic').
            get('a').should('have.class', 'muted');
        cy.get('#channelHeaderTitle').click();
        cy.get('#channelHeaderDropdownMenu').should('exist').
            findByText('Unmute Channel').should('be.visible').click();
        cy.get('#sidebarItem_off-topic').should(beUnmuted);
        cy.get('#toggleMute').should('not.exist');
        cy.uiGetLhsSection('CHANNELS').find('.SidebarChannel').
            last().should('not.contain', 'Off-Topic');
    });
});