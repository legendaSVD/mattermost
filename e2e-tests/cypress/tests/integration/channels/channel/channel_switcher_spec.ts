import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
describe('Channel Switcher', () => {
    let testTeam: Team;
    let offTopicUrl: string;
    const channelNamePrefix = 'aswitchchannel';
    const channelDisplayNamePrefix = 'ASwitchChannel';
    let channelB: Channel;
    let channelC: Channel;
    before(() => {
        cy.apiInitSetup({channelPrefix: {name: `${channelNamePrefix}-a`, displayName: `${channelDisplayNamePrefix} A`}}).then(({team, user, offTopicUrl: url}) => {
            testTeam = team;
            offTopicUrl = url;
            cy.apiCreateChannel(testTeam.id, `${channelNamePrefix}-b`, `${channelDisplayNamePrefix} B`, 'O').then(({channel}) => {
                channelB = channel;
            });
            cy.apiCreateChannel(testTeam.id, `${channelNamePrefix}-c`, `${channelDisplayNamePrefix} C`, 'O').then(({channel}) => {
                channelC = channel;
            });
            cy.apiLogin(user);
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T2031_1 - should switch channels by keyboard', () => {
        cy.typeCmdOrCtrl().type('K', {release: true});
        cy.findByRole('combobox', {name: 'quick switch input'}).type(`${channelDisplayNamePrefix}`);
        cy.findByRole('option', {name: channelB.display_name}).should('be.visible');
        cy.findByRole('combobox', {name: 'quick switch input'}).type('{downarrow}{downarrow}{enter}');
        cy.get('#channelHeaderTitle').
            should('be.visible').
            and('contain.text', channelB.display_name);
        cy.url().should('contain', `${channelB.name}`);
    });
    it('MM-T2031_2 - should switch channels by mouse', () => {
        cy.typeCmdOrCtrl().type('K', {release: true});
        cy.findByRole('combobox', {name: 'quick switch input'}).type(`${channelDisplayNamePrefix} `);
        cy.get(`[data-testid^=${channelC.name}] > span`).click();
        cy.get('#channelHeaderTitle').
            should('be.visible').
            and('contain.text', channelC.display_name);
        cy.url().should('contain', `${channelC.name}`);
    });
    it('MM-T2031_3 - should show empty result', () => {
        cy.typeCmdOrCtrl().type('K', {release: true});
        cy.findByRole('combobox', {name: 'quick switch input'}).type('there-is-no-spoon');
        cy.get('.no-results__title > span').should('be.visible');
    });
    it('MM-T2031_4 - should close on esc and outside click', () => {
        cy.visit(offTopicUrl);
        cy.typeCmdOrCtrl().type('K', {release: true});
        cy.findByRole('combobox', {name: 'quick switch input'}).type('{esc}');
        cy.findByRole('combobox', {name: 'quick switch input'}).should('not.exist');
        cy.url().should('contain', 'off-topic');
        cy.typeCmdOrCtrl().type('K', {release: true});
        cy.get('.modal').click({force: true});
        cy.findByRole('combobox', {name: 'quick switch input'}).should('not.exist');
        cy.url().should('contain', 'off-topic');
    });
});