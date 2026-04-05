import {addNewCommand, runSlashCommand} from './helpers';
describe('Slash commands page', () => {
    const trigger = 'test-message';
    let channelUrl;
    let testTeam;
    before(() => {
        cy.requireWebhookServer();
    });
    beforeEach(() => {
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.visit(`/${team.name}/integrations`);
            cy.get('#slashCommands').should('be.visible');
            cy.get('#slashCommands').click();
            channelUrl = `${testTeam.name}/channels/town-square`;
        });
    });
    it('MM-T690 Add custom slash command: / error', () => {
        cy.get('#addSlashCommand').click();
        cy.get('#trigger').type('//input');
        cy.get('#saveCommand').click();
        cy.findByText('A trigger word cannot begin with a /').should('exist').and('be.visible').scrollIntoView();
    });
    it('MM-T691 Error: trigger word required', () => {
        cy.get('#addSlashCommand').click();
        cy.get('#url').type('http://example.com');
        cy.get('#saveCommand').click();
        cy.findByText('A trigger word is required').should('exist').and('be.visible').scrollIntoView();
    });
    it('MM-T692 Error: no spaces in trigger word', () => {
        cy.get('#addSlashCommand').click();
        cy.get('#trigger').type('trigger with space');
        cy.get('#saveCommand').click();
        cy.findByText('A trigger word must not contain spaces').should('exist').and('be.visible').scrollIntoView();
    });
    it('MM-T693 Error: URL required', () => {
        cy.get('#addSlashCommand').click();
        cy.get('#trigger').type('test');
        cy.get('#saveCommand').click();
        cy.findByText('A request URL is required').should('exist').and('be.visible').scrollIntoView();
    });
    it('MM-T694 Error: trigger word in use', () => {
        const triggerWord = 'my_trigger_word';
        const url = 'http://test.com';
        cy.get('#addSlashCommand').click();
        cy.get('#trigger').type(triggerWord);
        cy.get('#url').type(url);
        cy.get('#saveCommand').click();
        cy.visit(`/${testTeam.name}/integrations`);
        cy.get('#slashCommands').should('be.visible');
        cy.get('#slashCommands').click();
        cy.get('#addSlashCommand').click();
        cy.get('#trigger').type(triggerWord);
        cy.get('#url').type(url);
        cy.get('#saveCommand').click();
        cy.findByText('This trigger word is already in use. Please choose another word.').should('exist').and('be.visible').scrollIntoView();
    });
    it('MM-T695 Run custom slash command', () => {
        addNewCommand(testTeam, trigger, '');
        runSlashCommand(channelUrl, trigger);
    });
    it('MM-T698 Cancel out of edit', () => {
        addNewCommand(testTeam, trigger, 'http://example.com');
        cy.visit(`/${testTeam.name}/integrations`);
        cy.get('#slashCommands').click();
        cy.get('a[href*="/edit"]').click();
        cy.get('#url').clear().type('http://mattermost.com');
        cy.get('a').contains('Cancel').click();
        cy.get('a[href*="/edit"]').click();
        cy.get('#url').should('have.value', 'http://example.com');
    });
    it('MM-T699 Edit custom slash command', () => {
        addNewCommand(testTeam, trigger, '');
        cy.visit(`/${testTeam.name}/integrations`);
        cy.get('#slashCommands').click();
        cy.get('a[href*="/edit"]').click();
        cy.get('#displayName').clear().type('Test Message - Edit');
        cy.get('#saveCommand').click();
        cy.findByText('Test Message - Edit').should('exist').and('be.visible');
        runSlashCommand(channelUrl, trigger);
    });
});