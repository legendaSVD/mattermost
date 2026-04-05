describe('Verify Accessibility Support in Dropdown Menus', () => {
    let offTopicUrl;
    before(() => {
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            cy.apiLogin(sysadmin);
            cy.apiInitSetup().then(({offTopicUrl: url}) => {
                offTopicUrl = url;
            });
            cy.apiCreateTeam('other-team', 'Other Team');
        });
    });
    beforeEach(() => {
        cy.visit(offTopicUrl);
        cy.postMessage('hello');
    });
    it('MM-T1464 Accessibility Support in Channel Menu Dropdown', () => {
        cy.uiGetChannelFavoriteButton().
            focus().
            tab({shift: true}).
            tab().
            tab({shift: true});
        cy.uiGetChannelHeaderButton().
            findByLabelText('channel menu').
            should('be.focused').click();
        cy.uiGetChannelMenu().
            parent().
            should('have.attr', 'aria-label', 'channel menu').
            and('have.attr', 'role', 'menu');
        cy.uiGetChannelMenu().children().eq(0).should('not.be.focused');
        cy.focused().tab();
        const menuItems = [
            'View Info',
            'Move to...',
            'Notification Preferences',
            'Mute Channel',
            'Add Members',
            'Manage Members',
            'Edit Channel Header',
            'Edit Channel Purpose',
            'Rename Channel',
            'Convert to Private Channel',
            'Archive Channel',
            'Leave Channel',
        ];
        menuItems.forEach((item) => {
            cy.uiGetChannelMenu().findByText(item).parent().should('be.focused');
            cy.focused().tab();
        });
        cy.get('body').typeWithForce('{esc}');
        cy.uiGetChannelMenu({exist: false});
    });
    it('MM-T1476 Accessibility Support in Team Menu Dropdown', () => {
        cy.uiGetLHSHeader().click();
        cy.findByRole('menu').
            should('exist').
            and('have.attr', 'aria-label', 'team menu').
            and('have.class', 'a11y__popup');
        cy.uiGetLHSTeamMenu().find('.MenuItem').
            children().eq(0).
            should('not.be.focused').
            focus();
        const menuItems = [
            {id: 'invitePeople', label: 'Invite People dialog'},
            {id: 'teamSettings', label: 'Team Settings dialog'},
            {id: 'manageMembers', label: 'Manage Members dialog'},
            {id: 'joinTeam', text: 'Join another team'},
            {id: 'leaveTeam', label: 'Leave Team dialog'},
            {id: 'createTeam', text: 'Create a team'},
        ];
        menuItems.forEach((item) => {
            if (item.label) {
                cy.focused().should('have.attr', 'aria-label', item.label);
            } else {
                cy.focused().should('have.text', item.text);
            }
            cy.focused().tab();
        });
        cy.uiGetLHSTeamMenu().find('.MenuItem').each((el) => {
            cy.wrap(el).should('have.attr', 'role', 'menuitem');
        });
        cy.get('body').typeWithForce('{esc}');
        cy.uiGetLHSTeamMenu().should('not.exist');
    });
    it('MM-T1477 Accessibility Support in Status Dropdown  - KNOWN ISSUE: MM-45716', () => {
        cy.uiGetSetStatusButton().focus().tab({shift: true}).tab();
        cy.uiGetSetStatusButton().
            should('be.focused').
            click();
        cy.uiGetStatusMenuContainer().
            should('have.attr', 'aria-label', 'set status').
            and('have.class', 'a11y__popup').
            and('have.attr', 'role', 'menu');
        cy.uiGetStatusMenuContainer().find('.dropdown-menu').children().eq(0).should('not.be.focused');
        cy.focused().tab();
        cy.uiGetStatusMenuContainer().within(() => {
            cy.findByAltText('user profile image').should('be.focused');
        });
        cy.focused().tab();
        const menuItems = [
            {id: 'status-menu-custom-status', label: 'Set a Custom Status dialog'},
            {id: 'status-menu-online', label: 'online'},
            {id: 'status-menu-away', label: 'away'},
            {id: 'status-menu-dnd_menuitem', label: 'do not disturb. disables all notifications'},
            {id: 'status-menu-offline', label: 'offline'},
            {id: 'accountSettings', label: 'Profile dialog'},
            {id: 'logout', label: 'Log Out'},
        ];
        menuItems.forEach((item) => {
            cy.uiGetStatusMenuContainer().find(`#${item.id}`).
                should('be.visible').
                findAllByLabelText(item.label).first().
                should('be.focused');
            cy.focused().tab();
        });
        cy.get('body').typeWithForce('{esc}');
        cy.uiGetStatusMenuContainer({exist: false});
    });
});