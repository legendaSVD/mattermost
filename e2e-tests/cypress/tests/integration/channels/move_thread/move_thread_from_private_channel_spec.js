import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Move thread', () => {
    let user1;
    let testTeam;
    let privateChannel;
    let testPost;
    let replyPost;
    const message = 'Move this message';
    const replyMessage = 'Move this reply';
    beforeEach(() => {
        cy.apiRequireLicense();
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_on',
            },
            WranglerSettings: {
                MoveThreadFromPrivateChannelEnable: true,
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({
            user,
            team,
        }) => {
            user1 = user;
            testTeam = team;
            cy.apiSaveCRTPreference(user.id, 'on');
            return cy.apiCreateChannel(testTeam.id, 'private', 'Private', 'P');
        }).then(({channel}) => {
            privateChannel = channel;
            return cy.postMessageAs({sender: user1, message, channelId: privateChannel.id});
        }).then((post) => {
            testPost = post.data;
            return cy.postMessageAs({sender: user1, message: replyMessage, channelId: privateChannel.id, rootId: testPost.id});
        }).then((post) => {
            replyPost = post.data;
            cy.visit(`/${testTeam.name}/channels/${privateChannel.name}`);
        });
    });
    afterEach(() => {
        cy.get('body').then(($body) => {
            if ($body.find('.modal.in').length > 0) {
                cy.get('body').type('{esc}');
            }
        });
    });
    it('MM-T5511_1 Move root post from private channel', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').type('{shift}W');
        moveThreadFromPrivateChannel();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', privateChannel.display_name);
        verifyMovedMessage({post: testPost});
    });
    it('Move thread with replies from private channel', () => {
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Move Thread').type('{shift}W');
        moveThreadFromPrivateChannel();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', privateChannel.display_name);
        verifyMovedMessage({post: testPost});
    });
    it('Move post from private channel - Cancel', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').type('{shift}W');
        moveThreadFromPrivateChannel(true);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', privateChannel.display_name);
        cy.getLastPostId((id) => {
            assert.isEqual(id, testPost.id);
        });
    });
    it('MM-T5511_2 Should not be able to move post from private channel if configured off', () => {
        cy.apiUpdateConfig({
            WranglerSettings: {
                MoveThreadFromPrivateChannelEnable: false,
            },
        });
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Move Thread').should('not.exist');
    });
    const verifyMovedMessage = ({post}) => {
        cy.getLastPostId().then((id) => {
            cy.get(`#${id}_message`).should('be.visible').within(() => {
                cy.get(`#postMessageText_${post.id}`).should('be.visible').should('contain.text', post.message);
            });
            cy.apiDeletePost(id);
        });
    };
    const moveThreadFromPrivateChannel = (cancel = false) => {
        cy.get('#move-thread-modal').should('be.visible').within(() => {
            cy.get('.move-thread__select').should('not.exist');
            cy.get('.GenericModal__button.confirm').should('not.be.disabled');
            cy.findByTestId('notification-text').should('be.visible').should('contain.text', 'Moving this thread changes who has access');
            if (cancel) {
                cy.get('.MoveThreadModal__cancel-button').should('not.be.disabled').click();
            } else {
                cy.get('.GenericModal__button.confirm').should('not.be.disabled').click();
            }
        });
    };
});