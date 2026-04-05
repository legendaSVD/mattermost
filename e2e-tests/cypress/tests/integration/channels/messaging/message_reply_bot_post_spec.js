describe('Messaging', () => {
    let newChannel;
    before(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            newChannel = channel;
            cy.visit(`/${team.name}/channels/${channel.name}`);
        });
    });
    it('MM-T93 Replying to an older bot post that has no post content and no attachment pretext', () => {
        const yesterdaysDate = Cypress.dayjs().subtract(1, 'days').valueOf();
        cy.apiCreateBot().then(({bot}) => {
            const botUserId = bot.user_id;
            cy.externalUpdateUserRoles(botUserId, 'system_user system_post_all system_admin');
            cy.apiAccessToken(botUserId, 'Create token').then(({token}) => {
                cy.apiAddUserToTeam(newChannel.team_id, botUserId);
                const props = {attachments: [{text: 'Some Text posted by bot that has no content and no attachment pretext'}]};
                cy.postBotMessage({token, props, channelId: newChannel.id, createAt: yesterdaysDate}).
                    its('id').
                    should('exist').
                    as('yesterdaysBotPost');
            });
            cy.postMessage('First posting');
            cy.postMessage('Another one Posted');
            const replyMessage = 'A reply to an older post bot post';
            cy.get('@yesterdaysBotPost').then((postId) => {
                cy.clickPostCommentIcon(postId);
                cy.postMessageReplyInRHS(replyMessage);
                cy.getLastPostId().then((replyId) => {
                    cy.get(`#rhsPost_${replyId}`).within(() => {
                        cy.findByTestId('post-link').should('not.exist');
                        cy.get(`#rhsPostMessageText_${replyId}`).should('be.visible').and('have.text', replyMessage);
                    });
                    cy.get(`#CENTER_time_${postId}`).find('time').invoke('attr', 'dateTime').then((originalTimeStamp) => {
                        cy.get(`#RHS_ROOT_time_${postId}`).find('time').invoke('attr', 'dateTime').should('equal', originalTimeStamp);
                        cy.get(`#CENTER_time_${replyId}`).find('time').should('have.attr', 'dateTime').and('not.equal', originalTimeStamp);
                    });
                    cy.uiCloseRHS();
                    cy.get(`#post_${replyId}`).within(() => {
                        cy.findByTestId('post-link').should('be.visible').and('have.text', 'Commented on ' + bot.username + 'BOT\'s message: Some Text posted by bot that has no content and no attachment pretext');
                        cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', replyMessage);
                    });
                });
            });
            cy.get('#rhsContainer').should('not.exist');
        });
    });
    it('MM-T91 Replying to an older post by a user that has no content (only file attachments)', () => {
        const yesterdaysDate = Cypress.dayjs().subtract(1, 'days').valueOf();
        cy.apiCreateBot().then(({bot}) => {
            const botUserId = bot.user_id;
            cy.externalUpdateUserRoles(botUserId, 'system_user system_post_all system_admin');
            cy.apiAccessToken(botUserId, 'Create token').then(({token}) => {
                cy.apiAddUserToTeam(newChannel.team_id, botUserId);
                const message = 'Hello message from ' + bot.username;
                const props = {attachments: [{pretext: 'Some Pretext', text: 'Some Text'}]};
                cy.postBotMessage({token, message, props, channelId: newChannel.id, createAt: yesterdaysDate}).
                    its('id').
                    should('exist').
                    as('yesterdaysPost');
            });
            cy.postMessage('First post');
            cy.postMessage('Another Post');
            const replyMessage = 'A reply to an older post with message attachment';
            cy.get('@yesterdaysPost').then((postId) => {
                cy.clickPostCommentIcon(postId);
                cy.postMessageReplyInRHS(replyMessage);
                cy.getLastPostId().then((replyId) => {
                    cy.get(`#rhsPost_${replyId}`).within(() => {
                        cy.findByTestId('post-link').should('not.exist');
                        cy.get(`#rhsPostMessageText_${replyId}`).should('be.visible').and('have.text', replyMessage);
                    });
                    cy.get(`#CENTER_time_${postId}`).find('time').invoke('attr', 'dateTime').then((originalTimeStamp) => {
                        cy.get(`#RHS_ROOT_time_${postId}`).find('time').invoke('attr', 'dateTime').should('equal', originalTimeStamp);
                        cy.get(`#CENTER_time_${replyId}`).find('time').should('have.attr', 'dateTime').and('not.equal', originalTimeStamp);
                    });
                    cy.uiCloseRHS();
                    cy.get(`#post_${replyId}`).scrollIntoView().within(() => {
                        cy.findByTestId('post-link').should('be.visible').and('have.text', 'Commented on ' + bot.username + 'BOT\'s message: Hello message from ' + bot.username);
                        cy.get(`#postMessageText_${replyId}`).should('be.visible').and('have.text', replyMessage);
                    });
                });
            });
            cy.get('#rhsContainer').should('not.exist');
        });
    });
});