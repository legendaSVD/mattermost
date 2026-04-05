import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Settings > Sidebar > Channel Switcher', () => {
    let testChannel;
    let testTeam;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup({loginAfter: true}).then(({team, channel}) => {
            testChannel = channel;
            testTeam = team;
            const numberOfChannels = 14;
            Cypress._.forEach(Array(numberOfChannels), (_, index) => {
                cy.apiCreateChannel(testTeam.id, 'channel-switcher', `Channel Switcher ${index.toString()}`);
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.get('#channelHeaderTitle').should('be.visible').should('contain', 'Off-Topic');
    });
    it('MM-T266 Using CTRL/CMD+K to show Channel Switcher', () => {
        cy.typeCmdOrCtrl().type('K', {release: true});
        verifyChannelSwitch(testTeam, testChannel);
    });
});
function verifyChannelSwitch(team, channel) {
    cy.get('#quickSwitchHint').should('be.visible').should('contain', 'Type to find a channel. Use UP/DOWN to browse, ENTER to select, ESC to dismiss.');
    cy.findByRole('combobox', {name: 'quick switch input'}).type(channel.display_name);
    cy.wait(TIMEOUTS.HALF_SEC);
    cy.get('#suggestionList').should('be.visible');
    cy.findByRole('combobox', {name: 'quick switch input'}).type('{enter}');
    cy.url().should('include', `/${team.name}/channels/${channel.name}`);
    cy.get('#channelHeaderTitle').should('be.visible').should('contain', channel.display_name);
    cy.get(`#sidebarItem_${channel.name}`).scrollIntoView().should('be.visible');
}