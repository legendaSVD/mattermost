import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getRandomId} from '../../../utils';
describe('Channel routing', () => {
    let testTeam: any;
    let testUser: any;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T884_1 Renaming channel name validates against two user IDs being used in URL', () => {
        cy.uiCreateChannel({name: 'Test__Channel'});
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        cy.get('.ChannelSettingsModal').should('be.visible');
        cy.get('.url-input-button').should('be.visible').click({force: true});
        cy.get('.url-input-container input').clear().type('uzsfmtmniifsjgesce4u7yznyh__uzsfmtmniifsjgesce5u7yznyh', {force: true}).wait(TIMEOUTS.HALF_SEC);
        cy.get('.SaveChangesPanel').should('contain', 'There are errors in the form above');
        cy.get('.url-input-error').should('contain', 'User IDs are not allowed in channel URLs.');
        cy.get('[data-testid="SaveChangesPanel__cancel-btn"]').click();
        cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
    });
    it('MM-T884_2 Creating new channel validates against two user IDs being used as channel name', () => {
        cy.uiBrowseOrCreateChannel('Create new channel');
        cy.get('#new-channel-modal').should('be.visible').within(() => {
            cy.get('#input_new-channel-modal-name').type('uzsfmtmniifsjgesce4u7yznyh__uzsfmtmniifsjgesce5u7yznyh', {force: true}).wait(TIMEOUTS.HALF_SEC);
            cy.findByText('Create channel').should('be.visible').click();
            cy.get('.genericModalError').should('be.visible').within(() => {
                cy.findByText('Channel names can\'t be in a hexadecimal format. Please enter a different channel name.');
            });
            cy.uiCancelButton().click();
        });
    });
    it('MM-T884_3 Creating a new channel validates against gm-like names being used as channel name', () => {
        cy.uiBrowseOrCreateChannel('Create new channel');
        cy.findByRole('dialog', {name: 'Create a new channel'}).within(() => {
            cy.findByPlaceholderText('Enter a name for your new channel').type('71b03afcbb2d503d49f87f057549c43db4e19f92', {force: true}).wait(TIMEOUTS.HALF_SEC);
            cy.uiGetButton('Create channel').click();
            cy.get('.genericModalError').should('be.visible').within(() => {
                cy.findByText('Channel names can\'t be in a hexadecimal format. Please enter a different channel name.');
            });
            cy.uiCancelButton().click();
        });
    });
    it('MM-T883 Channel URL validation for spaces between characters', () => {
        const firstWord = getRandomId(26);
        const secondWord = getRandomId(26);
        const channelName = 'test-channel-' + getRandomId(8);
        cy.apiCreateChannel(testTeam.id, channelName, 'Test Channel for URL Validation').then(({channel}) => {
            cy.apiAddUserToChannel(channel.id, testUser.id);
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
        });
        cy.get('#channelHeaderDropdownButton').click();
        cy.findByText('Channel Settings').click();
        cy.get('#input_channel-settings-name').clear().type(`${firstWord}${Cypress._.repeat(' ', 2)}${secondWord}`);
        cy.get('.url-input-button').click();
        cy.get('.url-input-container input').clear().type(`${firstWord}${Cypress._.repeat(' ', 2)}${secondWord}`);
        cy.get('.url-input-container button.url-input-button').click();
        cy.get('[data-testid="SaveChangesPanel__save-btn"]').click();
        cy.get('.SaveChangesPanel').should('contain', 'Settings saved');
        cy.get('.GenericModal .modal-header button[aria-label="Close"]').click();
        cy.get('#channelHeaderTitle').contains(`${firstWord} ${secondWord}`);
        cy.url().should('equal', `${Cypress.config('baseUrl')}/${testTeam.name}/channels/${firstWord}${Cypress._.repeat('-', 2)}${secondWord}`);
    });
});