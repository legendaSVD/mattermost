describe('Move Thread', () => {
    let user1;
    let user2;
    let user3;
    let testTeam;
    let testChannel;
    let otherChannel;
    let privateChannel;
    let dmChannel;
    let gmChannel;
    let testPost;
    let replyPost;
    const message = 'Move this message';
    const replyMessage = 'Move this reply';
    beforeEach(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_on',
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({
            user,
            team,
            channel,
        }) => {
            user1 = user;
            testTeam = team;
            testChannel = channel;
            cy.apiSaveCRTPreference(user.id, 'on');
            return cy.apiCreateUser({prefix: 'second_'});
        }).then(({user}) => {
            user2 = user;
            return cy.apiAddUserToTeam(testTeam.id, user2.id);
        }).then(() => {
            return cy.apiCreateUser({prefix: 'third_'});
        }).then(({user}) => {
            user3 = user;
            return cy.apiAddUserToTeam(testTeam.id, user3.id);
        }).then(() => {
            cy.apiAddUserToChannel(testChannel.id, user2.id);
            cy.apiAddUserToChannel(testChannel.id, user3.id);
            return cy.postMessageAs({sender: user1, message, channelId: testChannel.id});
        }).then((post) => {
            testPost = post.data;
            return cy.postMessageAs({sender: user1, message: replyMessage, channelId: testChannel.id, rootId: testPost.id});
        }).then((post) => {
            replyPost = post.data;
            return cy.apiCreateDirectChannel([user1.id, user2.id]);
        }).then(({channel}) => {
            dmChannel = channel;
            return cy.apiCreateGroupChannel([user1.id, user2.id, user3.id]);
        }).then(({channel}) => {
            gmChannel = channel;
            return cy.apiCreateChannel(testTeam.id, 'private', 'Private');
        }).then(({channel}) => {
            privateChannel = channel;
            return cy.apiCreateChannel(testTeam.id, 'movethread', 'Move Thread');
        }).then(({channel}) => {
            otherChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        });
    });
    afterEach(() => {
        cy.get('body').then(($body) => {
            if ($body.find('.modal.in').length > 0) {
                cy.get('body').type('{esc}');
            }
        });
    });
    it('MM-T5514 Move root post from public channel to another public channel', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').click();
        moveThread({channelId: otherChannel.id});
        verifyMovedMessage({post: testPost});
    });
    it('Move reply post from public channel to another public channel', () => {
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Move Thread').click();
        moveThread({channelId: otherChannel.id});
        verifyMovedMessage({post: testPost});
    });
    it('Move public channel post to Private channel', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').click();
        moveThread({channelId: privateChannel.id});
        verifyMovedMessage({post: testPost});
    });
    it('Move public channel post to GM', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').click();
        moveThread({channelId: gmChannel.id});
        verifyMovedMessage({post: testPost});
    });
    it('Move public channel post to DM', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').click();
        moveThread({channelId: dmChannel.id});
        verifyMovedMessage({post: testPost});
    });
    const verifyMovedMessage = ({post}) => {
        cy.getLastPostId().then((id) => {
            cy.get(`#${id}_message`).should('be.visible').within(() => {
                cy.get(`#postMessageText_${post.id}`).should('be.visible').should('contain.text', post.message);
            });
            cy.apiDeletePost(id);
        });
    };
    const moveThread = () => {
        cy.get('#move-thread-modal').should('be.visible').within(() => {
            cy.get('.move-thread__select').should('not.exist');
            cy.get('.GenericModal__button.confirm').should('not.be.disabled');
            cy.findByTestId('notification-text').should('be.visible').should('contain.text', 'Moving this thread changes who has access');
            cy.get('.GenericModal__button.confirm').click();
        });
    };
});