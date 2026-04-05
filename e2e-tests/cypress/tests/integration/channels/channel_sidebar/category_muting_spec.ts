import {getAdminAccount} from '../../../support/env';
import {getRandomId} from '../../../utils';
import {clickCategoryMenuItem} from './helpers';
describe('Category muting', () => {
    let testTeam;
    let testUser;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then((({team, user}) => {
            testTeam = team;
            testUser = user;
            cy.visit(`/${team.name}/channels/off-topic`);
            cy.postMessage('hello');
        }));
    });
    it('MM-T3488 category headers should be muted and unmuted correctly', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible').should('not.have.class', 'muted');
        cy.get('#sidebarItem_town-square').should('not.have.class', 'muted');
        cy.get('#sidebarItem_off-topic').should('not.have.class', 'muted');
        clickCategoryMenuItem({categoryDisplayName: 'CHANNELS', menuItemText: 'Mute Category', categoryMenuButtonName: 'Channels'});
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('have.class', 'muted');
        cy.get('#sidebarItem_town-square').should('have.class', 'muted');
        cy.get('#sidebarItem_off-topic').should('have.class', 'muted');
        clickCategoryMenuItem({categoryDisplayName: 'CHANNELS', menuItemText: 'Unmute Category', categoryMenuButtonName: 'Channels'});
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('not.have.class', 'muted');
        cy.get('#sidebarItem_town-square').should('not.have.class', 'muted');
        cy.get('#sidebarItem_off-topic').should('not.have.class', 'muted');
    });
    it('MM-T3489_1 moving a channel into a muted category should mute it', () => {
        cy.uiCreateSidebarCategory().then((category) => {
            clickCategoryMenuItem({categoryDisplayName: category.displayName, menuItemText: 'Mute Category', categoryMenuButtonName: category.displayName.toLowerCase()});
            cy.get('#sidebarItem_town-square').should('not.have.class', 'muted');
            cy.get(`.SidebarChannelGroupHeader:contains(${category.displayName})`).should('have.class', 'muted');
            cy.uiMoveChannelToCategory('Town Square', category.displayName);
            cy.get('#sidebarItem_town-square').should('have.class', 'muted');
            cy.uiMoveChannelToCategory('Town Square', 'Channels');
            cy.get('#sidebarItem_town-square').should('not.have.class', 'muted');
        });
    });
    it('MM-T3489_2 being added to a new channel should not mute it, even if the Channels category is muted', () => {
        cy.get('.SidebarChannelGroupHeader:contains(CHANNELS)').should('be.visible').should('not.have.class', 'muted');
        clickCategoryMenuItem({categoryDisplayName: 'CHANNELS', menuItemText: 'Mute Category', categoryMenuButtonName: 'Channels'});
        cy.makeClient({user: getAdminAccount()}).then((client) => {
            const channelName = `channel${getRandomId()}`;
            cy.wrap(client.createChannel({
                display_name: channelName,
                name: channelName,
                team_id: testTeam.id,
                type: 'O',
                create_at: 0,
                creator_id: '',
                delete_at: 0,
                group_constrained: false,
                header: '',
                id: '',
                last_post_at: 0,
                purpose: '',
                scheme_id: '',
                update_at: 0,
                last_root_post_at: 0,
            })).then((channel: Cypress.Channel) => {
                cy.wrap(client.addToChannel(testUser.id, channel.id));
                cy.get(`#sidebarItem_${channel.name}`).should('be.visible').should('not.have.class', 'muted');
            });
        });
    });
});