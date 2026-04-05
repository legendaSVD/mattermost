import * as TIMEOUTS from '../../../fixtures/timeouts';
const SpaceKeyCode = 32;
const DownArrowKeyCode = 40;
describe('MM-T3156 DM category', () => {
    let testUser;
    const usernames = [];
    before(() => {
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({team, user}) => {
            testUser = user;
            cy.visit(`/${team.name}/channels/town-square`);
            const usersPrefixes = ['a', 'c', 'd', 'j', 'p', 'u', 'x', 'z'];
            usersPrefixes.forEach((prefix) => {
                cy.apiCreateUser({prefix}).then(({user: newUser}) => {
                    cy.apiCreateDirectChannel([testUser.id, newUser.id]).then(({channel}) => {
                        cy.postMessageAs({sender: newUser, message: 'test', channelId: channel.id});
                        usernames.push(newUser.username);
                    });
                });
            });
        });
    });
    it('MM-T3156_1 Should open DM modal on click of + in category header', () => {
        cy.findByLabelText('DIRECT MESSAGES').parents('.SidebarChannelGroup').within(() => {
            cy.get('.SidebarChannelGroupHeader_addButton').click();
        });
        cy.get('#moreDmModal').should('be.visible');
        cy.get('#moreDmModal .close').click();
    });
    it('MM-T3156_2 should order DMs based on recent interactions', () => {
        cy.findByLabelText('DIRECT MESSAGES').parents('.SidebarChannelGroup').within(() => {
            const usernamesReversed = [...usernames].reverse();
            cy.get('.NavGroupContent').children().each(($el, index) => {
                cy.wrap($el).find('.SidebarChannelLinkLabel').should('contain', usernamesReversed[index]);
            });
        });
    });
    it('MM-T3156_3 should order DMs alphabetically ', () => {
        cy.get('.SidebarChannelGroupHeader:contains(DIRECT MESSAGES) .SidebarMenu').invoke('show').
            get('.SidebarChannelGroupHeader:contains(DIRECT MESSAGES) .SidebarMenu_menuButton').should('be.visible').click({force: true});
        cy.findByText('Sort').trigger('mouseover');
        cy.findByText('Alphabetically').click().wait(TIMEOUTS.ONE_SEC);
        cy.findByLabelText('DIRECT MESSAGES').parents('.SidebarChannelGroup').within(() => {
            cy.get('.NavGroupContent').children().each(($el, index) => {
                cy.wrap($el).findByText(usernames[index]).should('be.visible');
            });
        });
    });
    it('MM-T3156_4 should not be able to rearrange DMs', () => {
        cy.get('button[aria-label="DIRECT MESSAGES"]').parents('.SidebarChannelGroup').within(() => {
            cy.get(`.SidebarChannel:contains(${usernames[0]}) > .SidebarLink`).
                trigger('keydown', {keyCode: SpaceKeyCode}).
                trigger('keydown', {keyCode: DownArrowKeyCode, force: true}).wait(TIMEOUTS.THREE_SEC).
                trigger('keydown', {keyCode: SpaceKeyCode, force: true}).wait(TIMEOUTS.THREE_SEC);
            cy.get('.NavGroupContent').children().each(($el, index) => {
                cy.wrap($el).find('.SidebarChannelLinkLabel').should('contain', usernames[index]);
            });
        });
    });
});