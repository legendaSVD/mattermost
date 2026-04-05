import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Move Thread', () => {
    let user1;
    let user2;
    let testTeam;
    let dmChannel;
    let testPost;
    let replyPost;
    const message = 'Move this message';
    const replyMessage = 'Move this reply';
    beforeEach(() => {
        cy.shouldHaveFeatureFlag('MoveThreadsEnabled', true);
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_on',
            },
            WranglerSettings: {
                MoveThreadFromDirectMessageChannelEnable: true,
            },
        });
        cy.apiInitSetup({loginAfter: true, promoteNewUserAsAdmin: true}).then(({
            user,
            team,
        }) => {
            user1 = user;
            testTeam = team;
            cy.apiSaveCRTPreference(user.id, 'on');
            return cy.apiCreateUser({prefix: 'second_'});
        }).then(({user}) => {
            user2 = user;
            return cy.apiAddUserToTeam(testTeam.id, user2.id);
        }).then(() => {
            return cy.apiCreateDirectChannel([user1.id, user2.id]);
        }).then(({channel}) => {
            dmChannel = channel;
            return cy.postMessageAs({sender: user1, message, channelId: dmChannel.id});
        }).then((post) => {
            testPost = post.data;
            return cy.postMessageAs({sender: user1, message: replyMessage, channelId: dmChannel.id, rootId: testPost.id});
        }).then((post) => {
            replyPost = post.data;
            cy.visit(`/${testTeam.name}/channels/${dmChannel.name}`);
        });
    });
    afterEach(() => {
        cy.get('body').then(($body) => {
            if ($body.find('.modal.in').length > 0) {
                cy.get('body').type('{esc}');
            }
        });
    });
    it('MM-T5512_1 Move root post from DM', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').type('{shift}W');
        movePostFromDM();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', dmChannel.display_name);
        verifyMovedThread({post: testPost});
    });
    it('Move thread reply from DM', () => {
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Move Thread').type('{shift}W');
        movePostFromDM();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', dmChannel.display_name);
        verifyMovedThread({post: testPost});
    });
    it('Move post from DM - Cancel using escape key', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').type('{shift}W');
        movePostFromDM({cancel: true});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', dmChannel.display_name);
        cy.getLastPostId((id) => {
            assert.isEqual(id, testPost.id);
        });
    });
    it('MM-T5512_2 Should not be able to move post from DM if configured off', () => {
        cy.apiUpdateConfig({
            WranglerSettings: {
                MoveThreadFromDirectMessageChannelEnable: false,
            },
        });
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Move Thread').should('not.exist');
    });
    const verifyMovedThread = ({post}) => {
        cy.getLastPostId().then((id) => {
            cy.get(`#${id}_message`).should('be.visible').within(() => {
                cy.get(`#postMessageText_${post.id}`).should('be.visible').should('contain.text', post.message);
            });
            cy.apiDeletePost(id);
        });
    };
    const movePostFromDM = ({cancel = false} = {}) => {
        cy.get('#move-thread-modal').should('be.visible').within(() => {
            cy.get('.move-thread__select').should('not.exist');
            cy.get('.GenericModal__button.confirm').should('not.be.disabled');
            cy.findByTestId('notification-text').should('be.visible').should('contain.text', 'Moving this thread changes who has access');
            if (cancel) {
                cy.get('.MoveThreadModal__cancel-button').should('not.be.disabled').type('{esc}', {force: true});
            } else {
                cy.get('.GenericModal__button.confirm').should('not.be.disabled').type('{enter}', {force: true});
            }
        });
    };
});