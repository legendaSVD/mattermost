import timeouts from '../../../fixtures/timeouts';
describe('Messaging', () => {
    let offTopicPath;
    let testTeam;
    const defaultEmojis = ['+1 emoji', 'grinning emoji', 'white check mark emoji'];
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl, team}) => {
            testTeam = team;
            offTopicPath = offTopicUrl;
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T4261_1 One-click reactions on a post', () => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/site_config/emoji');
        cy.get('.admin-console__header').should('be.visible').and('have.text', 'Emoji');
        cy.findByTestId('ServiceSettings.EnableEmojiPickertrue').check();
        cy.get('#saveSetting').then((btn) => {
            if (btn.is(':enabled')) {
                btn.click();
                cy.waitUntil(() => cy.get('#saveSetting').then((el) => {
                    return el[0].innerText === 'Save';
                }));
            }
        });
        cy.apiCreateUser({prefix: 'other'}).then(({user: user1}) => {
            cy.apiAddUserToTeam(testTeam.id, user1.id);
            cy.apiLogin(user1);
        });
        cy.visit(offTopicPath);
        cy.uiOpenSettingsModal('Display').within(() => {
            cy.findByText('Display', {timeout: timeouts.ONE_MIN}).click();
            cy.findByText('Quick reactions on messages').click();
            cy.findByLabelText('On').click();
            cy.uiSaveAndClose();
        });
        cy.postMessage('Test post for recent reactions.');
        cy.getLastPostId().then((postId) => {
            validateQuickReactions(postId, 'CENTER', defaultEmojis);
            cy.get(`#post_${postId}`).click();
            validateQuickReactions(postId, 'RHS_ROOT', defaultEmojis);
            cy.uiExpandRHS();
            validateQuickReactions(postId, 'RHS_ROOT', defaultEmojis);
            cy.uiCloseRHS();
            cy.clickPostReactionIcon(postId);
            cy.get('#emojiPickerSearch').type('wave');
            cy.clickEmojiInEmojiPicker('wave');
            let recentEmojis = ['wave emoji', '+1 emoji', 'grinning emoji'];
            validateQuickReactions(postId, 'CENTER', recentEmojis);
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker('blush');
            cy.clickPostReactionIcon(postId);
            cy.clickEmojiInEmojiPicker('innocent');
            recentEmojis = ['innocent emoji', 'blush emoji', 'wave emoji'];
            validateQuickReactions(postId, 'CENTER', recentEmojis);
        });
        cy.postMessage('Another post for recent reactions.');
        cy.getLastPostId().then((postId) => {
            cy.clickPostReactionIcon(postId);
            cy.get('#emojiPickerSearch').type('wave');
            cy.clickEmojiInEmojiPicker('wave');
            let recentEmojis = ['wave emoji', 'innocent emoji', 'blush emoji'];
            validateQuickReactions(postId, 'CENTER', recentEmojis);
            cy.clickPostReactionIcon(postId);
            cy.get('#emojiPickerSearch').type('+1');
            cy.findByTestId('+1,thumbsup').parent().click();
            recentEmojis = ['wave emoji', '+1 emoji', 'innocent emoji'];
            validateQuickReactions(postId, 'CENTER', recentEmojis);
        });
    });
    it('MM-T4261_2 One-Click Reactions setting with Emoji Picker OFF', () => {
        cy.apiAdminLogin();
        cy.visit('/admin_console/site_config/emoji');
        cy.get('.admin-console__header').should('be.visible').and('have.text', 'Emoji');
        cy.findByTestId('ServiceSettings.EnableEmojiPickerfalse').check();
        cy.get('#saveSetting').then((btn) => {
            if (btn.is(':enabled')) {
                btn.click();
                cy.waitUntil(() => cy.get('#saveSetting').then((el) => {
                    return el[0].innerText === 'Save';
                }));
            }
        });
        cy.visit(offTopicPath).wait(timeouts.HALF_SEC);
        cy.uiOpenSettingsModal('Display').within(() => {
            cy.findByText('Display', {timeout: timeouts.ONE_MIN}).click();
            cy.findByText('Quick reactions on messages').should('not.exist');
            cy.uiClose();
        });
        cy.postMessage('Test post for recent reactions. (2)');
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).trigger('mouseover', {force: true}).within(() => {
                cy.wait(timeouts.HALF_SEC).get(`#recent_reaction_${0}`).should('not.exist');
            });
        });
    });
    function validateQuickReactions(postId, location, emojis) {
        let idPrefix;
        let numReactions = 3;
        if (location === 'CENTER') {
            idPrefix = 'post';
        } else if (location === 'RHS_ROOT' || location === 'RHS_COMMENT') {
            idPrefix = 'rhsPost';
            numReactions = 1;
        } else if (location === 'RHS_EXPANDED') {
            idPrefix = 'rhsPost';
        }
        for (let i = 0; i < numReactions; i++) {
            cy.get(`#${idPrefix}_${postId}`).trigger('mouseover', {force: true}).within(() => {
                cy.wait(timeouts.HALF_SEC).get(`#recent_reaction_${i}`).should('have.attr', 'aria-label', emojis[i]);
            });
        }
    }
});