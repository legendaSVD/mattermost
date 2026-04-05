import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Archived channels', () => {
    let testChannel;
    let testPrivateChannel;
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup({
            channelPrefix: {name: '000-archive', displayName: '000 Archive Test'},
        }).then(({channel, team}) => {
            testChannel = channel;
            cy.apiDeleteChannel(testChannel.id);
            cy.apiCreateChannel(team.id, '000-private-archive', '000 Private Archive Test', 'P').then(({channel: privateChannel}) => {
                testPrivateChannel = privateChannel;
                cy.apiDeleteChannel(privateChannel.id);
            });
        });
    });
    it('are present in the channels list view', () => {
        cy.visit('/admin_console/user_management/channels');
        cy.findByText(testChannel.display_name, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.findByTestId(`${testChannel.name}-archive-icon`).should('be.visible');
    });
    it('appear in the search results of the channels list view', () => {
        cy.visit('/admin_console/user_management/channels');
        cy.findByTestId('searchInput', {timeout: TIMEOUTS.ONE_MIN}).type(`${testChannel.display_name}{enter}`);
        cy.findByText(testChannel.display_name).should('be.visible');
    });
    it('display an unarchive button and a limited set of other UI elements', () => {
        cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
        cy.get('button.btn-secondary', {timeout: TIMEOUTS.TWO_SEC}).should('have.text', 'Unarchive Channel').should('be.visible').should('be.enabled');
        cy.get('div.AdminPanel').should('be.visible').and('have.length', 1);
    });
    it('can be unarchived', () => {
        cy.visit(`/admin_console/user_management/channels/${testChannel.id}`);
        cy.get('button.btn-secondary', {timeout: TIMEOUTS.TWO_SEC}).findAllByText('Unarchive Channel').click();
        cy.get('button.btn-secondary.btn-danger', {timeout: TIMEOUTS.TWO_SEC}).findAllByText('Archive Channel').should('be.visible');
        cy.get('div.AdminPanel').should('be.visible').should('have.length', 5);
        cy.get('#saveSetting').click();
        cy.get('.DataGrid', {timeout: TIMEOUTS.TWO_SEC}).scrollIntoView().should('be.visible');
        cy.apiGetChannel(testChannel.id).then(({channel}) => {
            expect(channel.delete_at).to.eq(0);
        });
    });
    it('display archive icon for public archived channels in channel list', () => {
        cy.visit('/admin_console/user_management/channels');
        cy.findByText(testChannel.display_name, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.findByTestId(`${testChannel.name}-archive-icon`).should('be.visible');
    });
    it('display archive-lock icon for private archived channels in channel list', () => {
        cy.visit('/admin_console/user_management/channels');
        cy.findByText(testPrivateChannel.display_name, {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.findByTestId(`${testPrivateChannel.name}-archive-icon`).should('be.visible');
    });
});