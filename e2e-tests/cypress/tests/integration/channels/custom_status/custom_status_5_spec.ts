describe('Custom Status - Verifying Where Custom Status Appears', () => {
    const customStatus = {
        emoji: 'grinning',
        text: 'Busy',
    };
    let currentUser;
    before(() => {
        cy.apiUpdateConfig({TeamSettings: {EnableCustomUserStatuses: true}});
        cy.apiInitSetup({loginAfter: true}).then(({team, user, channel}) => {
            cy.visit(`/${team.name}/channels/${channel.name}`);
            currentUser = user;
        });
    });
    it('MM-T3850_1 set a status', () => {
        cy.uiOpenUserMenu('Set custom status');
        cy.findByPlaceholderText('Set a status').type(customStatus.text, {force: true});
        cy.get('#custom_status_modal .StatusModal__emoji-button').click();
        cy.get('#emojiPicker').should('be.visible').find('.emoji-picker__items').should('be.visible');
        cy.findByTestId(customStatus.emoji).trigger('mouseover', {force: true}).click({force: true});
        cy.get('#custom_status_modal .GenericModal__button.confirm').should('be.visible').click();
        cy.get('#custom_status_modal').should('not.exist');
    });
    it('MM-T3850_2 should display the custom status emoji in LHS header', () => {
        cy.uiGetProfileHeader().
            find('.emoticon').
            should('have.attr', 'data-emoticon', customStatus.emoji);
    });
    it('MM-T3850_3 should show custom status emoji in the post header', () => {
        cy.postMessage('Hello World!');
        cy.get('.post.current--user .post__header span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
    });
    it('MM-T3850_4 should show custom status emoji in the RHS post header', () => {
        cy.get('.post.current--user .post__header').should('be.visible').first().trigger('mouseover');
        cy.get('.post.current--user .post__header').should('be.visible').first().get('.post-menu button[aria-label="reply"]').should('exist').click({force: true});
        cy.get('#rhsContainer .post-right__content .post.current--user.thread__root .post__header span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.get('#rhsCloseButton').click();
    });
    it('MM-T3850_5 should show full custom status in the user popover', () => {
        cy.get('.post.current--user .post__header .user-popover').first().click();
        cy.get('#user-profile-popover').should('exist');
        cy.get('#user-profile-popover #user-popover-status').should('contain', customStatus.text);
        cy.get('#user-profile-popover #user-popover-status span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
    });
    it('MM-T3850_6 should show custom status emoji next to username in the channel members popover', () => {
        cy.get('#member_popover').should('exist').click();
        cy.get('#member-list-popover').should('exist');
        cy.get('#member-list-popover .more-modal__row').first().get('span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
    });
    it('MM-T3850_7 should show custom status emoji next to username in the channel members modal', () => {
        cy.get('#member-list-popover .more-modal__button button').click();
        cy.get('#channelMembersModal').should('exist');
        cy.get('#searchUsersInput').type(currentUser.username);
        cy.get('#channelMembersModal .more-modal__row span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.get('#channelMembersModal .close').click();
    });
    it('MM-T3850_8 should show custom status emoji next to username in the team members modal', () => {
        cy.uiOpenTeamMenu('View members');
        cy.get('#teamMembersModal').should('exist');
        cy.get('#searchUsersInput').type(currentUser.username);
        cy.get('#teamMembersModal .more-modal__row span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.get('#teamMembersModal .close').click();
    });
    it('MM-T3850_9 should show custom status emoji next to username in the more direct messages modal', () => {
        cy.get('button[aria-label="Write a direct message"]').click();
        cy.get('#moreDmModal').should('exist');
        cy.get('#moreDmModal #react-select-2-input').type(currentUser.username);
        cy.get('#moreDmModal .more-modal__row span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
    });
    it('MM-T3850_10 should show custom status emoji next to username in DM in LHS Direct Messages section and full custom status in channel header', () => {
        cy.get('#moreDmModal .more-modal__row').should('be.visible').and('contain', currentUser.username).click({force: true});
        cy.get('#channelHeaderDescription .header-status__text').should('exist');
        cy.get('#channelHeaderDescription .header-status__text').should('contain', customStatus.text);
        cy.get('#channelHeaderDescription .header-status__text span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.get('.SidebarChannelGroup_content').contains('(you)').get('span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
    });
    it('MM-T3850_11 should show custom status emoji at autocomplete', () => {
        cy.uiGetPostTextBox().type(`/message @${currentUser.username}`);
        cy.get('#suggestionList').find('.suggestion-list__item').eq(0).contains(`@${currentUser.username}`).get('span.emoticon').should('exist').invoke('attr', 'data-emoticon').should('contain', customStatus.emoji);
        cy.uiGetPostTextBox().type('{enter}');
    });
    it('MM-T3850_12 should show custom status emoji at channel switcher', () => {
        cy.uiOpenFindChannels();
        cy.findByRole('textbox', {name: 'quick switch input'}).type(currentUser.username);
        cy.get('#suggestionList').should('be.visible');
        cy.findByTestId(currentUser.username).should('be.visible').
            find('.emoticon').should('have.attr', 'data-emoticon', 'grinning');
    });
});