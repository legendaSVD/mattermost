import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Verify Accessibility Support in Channel Sidebar Navigation', () => {
    let testUser;
    let testTeam;
    let testChannel;
    let offTopicUrl;
    before(() => {
        let otherUser;
        let otherChannel;
        cy.apiInitSetup({promoteNewUserAsAdmin: true}).then(({team, channel, user, offTopicUrl: url}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
            offTopicUrl = url;
            return cy.apiCreateChannel(testTeam.id, 'test', 'Test');
        }).then(({channel}) => {
            otherChannel = channel;
            return cy.apiAddUserToChannel(otherChannel.id, testUser.id);
        }).then(() => {
            return cy.apiCreateUser({prefix: 'other'});
        }).then(({user}) => {
            otherUser = user;
            return cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        }).then(() => {
            return cy.apiAddUserToChannel(testChannel.id, otherUser.id);
        }).then(() => {
            return cy.apiAddUserToChannel(otherChannel.id, otherUser.id);
        }).then(() => {
            for (let index = 0; index < 5; index++) {
                cy.postMessageAs({sender: otherUser, message: 'This is an old message', channelId: otherChannel.id});
            }
        });
    });
    beforeEach(() => {
        cy.apiLogin(testUser);
        (cy as any).apiSaveSidebarSettingPreference();
        cy.visit(offTopicUrl);
        cy.get('#postListContent').should('be.visible');
    });
    it('MM-T1470 Verify Tab Support in Channels section', () => {
        Cypress._.times(2, () => {
            cy.apiCreateChannel(testTeam.id, 'public', 'public');
        });
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.uiGetLHSAddChannelButton().focus().tab().tab({shift: true});
        cy.uiGetLHSAddChannelButton().should('be.focused');
        cy.focused().tab();
        cy.findByRole('button', {name: 'Find Channels'}).should('be.focused');
        cy.focused().tab();
        cy.get('.SidebarChannel.unread').each((el) => {
            cy.wrap(el).find('.unread-title').should('be.focused');
            cy.focused().tab().tab();
        });
        cy.focused().parent().next().find('.SidebarChannel').each((el, i) => {
            if (i === 0) {
                cy.focused().findByText('CHANNELS');
                cy.focused().tab().tab();
            }
            cy.wrap(el).find('.SidebarLink').should('be.focused');
            cy.focused().tab().tab();
        });
    });
    it('MM-T1473 Verify Tab Support in Unreads section', () => {
        cy.uiGetLHSAddChannelButton().focus().tab().tab();
        cy.get('.SidebarChannel.unread').each((el) => {
            cy.wrap(el).find('.unread-title').should('be.focused');
            cy.focused().tab().tab();
        });
    });
    it('MM-T1474 Verify Tab Support in Favorites section', () => {
        markAsFavorite('off-topic');
        markAsFavorite(testChannel.name);
        cy.uiGetLHSAddChannelButton().focus().tab().tab();
        cy.get('.SidebarChannel.unread').each(() => {
            cy.focused().tab().tab();
        });
        cy.focused().tab().tab().parent().next().find('.SidebarChannel').each((el, i) => {
            if (i === 0) {
                cy.focused().findByText('FAVORITES');
                cy.focused().tab().tab();
            }
            cy.wrap(el).find('.SidebarLink').should('be.focused');
            cy.focused().tab().tab();
        });
    });
    it('MM-T1475 Verify Up & Down Arrow support in Channel Sidebar', () => {
        cy.apiCreateChannel(testTeam.id, 'public', 'Public', 'O');
        cy.apiCreateChannel(testTeam.id, 'private', 'Private', 'P');
        markAsFavorite('off-topic');
        markAsFavorite(testChannel.name);
        cy.uiGetLHSAddChannelButton().focus().tab().tab().tab();
        cy.get('body').type('{downarrow}{uparrow}');
        cy.uiGetLhsSection('UNREADS').should('be.focused');
        cy.get('body').type('{downarrow}');
        cy.uiGetLhsSection('FAVORITES').should('be.focused');
        cy.get('body').type('{downarrow}');
        cy.uiGetLhsSection('CHANNELS').should('be.focused');
        cy.get('body').type('{downarrow}');
        cy.uiGetLhsSection('DIRECT MESSAGES').should('be.focused');
    });
});
describe('Accessibility tests for RHS getting focus after buttons actions', () => {
    let testUser;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            cy.apiLogin(testUser);
            cy.visit(`/${team.name}/channels/town-square`);
            cy.get('#postListContent').should('be.visible');
        });
    });
    beforeEach(() => {
        cy.uiCloseRHS();
        cy.get('#sidebar-right').should('not.exist');
    });
    afterEach(() => {
        cy.uiCloseRHS();
        cy.get('#sidebar-right').should('not.exist');
    });
    it('Focus should be on RHS when opening Recent Mentions', () => {
        cy.findByRole('button', {name: /Recent mentions/i}).focus().realPress('Enter');
        cy.get('#sidebar-right').should('be.visible');
        cy.findByLabelText('Expand Sidebar Icon').should('be.focused');
    });
    it('Focus should be on RHS when opening Saved Messages', () => {
        cy.findByRole('button', {name: /Saved messages/i}).focus().realPress('Enter');
        cy.get('#sidebar-right').should('be.visible');
        cy.findByLabelText('Expand Sidebar Icon').should('be.focused');
    });
    it('Focus should be on RHS when opening Members', () => {
        cy.get('#channelHeaderInfo').should('exist');
        cy.get('#member_rhs').should('be.visible').focus().realPress('Enter');
        cy.get('#sidebar-right').should('be.visible');
        cy.get('.sidebar-right-container').find('#rhsCloseButton').should('be.focused');
    });
    it('Focus should be on RHS when opening Channel files', () => {
        cy.findByRole('button', {name: /Channel files/i}).focus().realPress('Enter');
        cy.get('#sidebar-right').should('be.visible');
        cy.findByLabelText('Expand Sidebar Icon').should('be.focused');
    });
});
function markAsFavorite(channelName) {
    cy.get(`#sidebarItem_${channelName}`).click();
    cy.get('#postListContent').should('be.visible');
    cy.get('#channelHeaderInfo').then((el) => {
        if (el.find('#toggleFavorite.active').length) {
            cy.get('#toggleFavorite').click();
        }
    });
    cy.get('#toggleFavorite').click();
}