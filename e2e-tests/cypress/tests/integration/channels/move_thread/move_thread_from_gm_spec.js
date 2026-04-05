import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Move thread', () => {
    let user1;
    let user2;
    let user3;
    let testTeam;
    let gmChannel;
    let gmChannelName;
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
                MoveThreadFromGroupMessageChannelEnable: true,
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
            return cy.apiCreateUser({prefix: 'third_'});
        }).then(({user}) => {
            user3 = user;
            return cy.apiAddUserToTeam(testTeam.id, user3.id);
        }).then(() => {
            return cy.apiCreateGroupChannel([user1.id, user2.id, user3.id]);
        }).then(({channel}) => {
            gmChannel = channel;
            gmChannelName = gmChannel.display_name.split(', ').filter(((username) => username !== user1.username)).join(', ');
            return cy.postMessageAs({sender: user1, message, channelId: gmChannel.id});
        }).then((post) => {
            testPost = post.data;
            return cy.postMessageAs({sender: user1, message: replyMessage, channelId: gmChannel.id, rootId: testPost.id});
        }).then((post) => {
            replyPost = post.data;
            cy.visit(`/${testTeam.name}/channels/${gmChannel.name}`);
        });
    });
    afterEach(() => {
        cy.get('body').then(($body) => {
            if ($body.find('.modal.in').length > 0) {
                cy.get('body').type('{esc}');
            }
        });
    });
    it('MM-T5514_1 Move post from GM (with at least 2 other users)', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').type('{shift}W');
        moveThreadFromGM();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', gmChannelName);
        verifyMovedMessage({post: testPost});
    });
    it('Move thread with replies from GM (with at least 2 other users)', () => {
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Move Thread').type('{shift}W');
        moveThreadFromGM();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', gmChannelName);
        verifyMovedMessage({post: testPost});
    });
    it('Move thread from GM (with at least 2 other users) - Cancel using X', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Move Thread').type('{shift}W');
        moveThreadFromGM({cancel: true});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', gmChannelName);
        cy.getLastPostId((id) => {
            assert.isEqual(id, testPost.id);
        });
    });
    it('MM-T5514_2 Should not be able to move post from GM if configured off', () => {
        cy.apiUpdateConfig({
            WranglerSettings: {
                MoveThreadFromGroupMessageChannelEnable: false,
            },
        });
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Move Thread').should('not.exist');
    });
    const verifyMovedMessage = ({post, comment, showMore}) => {
        const permaLink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${post.id}`;
        cy.getLastPostId().then((id) => {
            cy.get(`#${id}_message`).should('be.visible').within(() => {
                if (comment) {
                    cy.get(`#postMessageText_${id}`).should('be.visible').should('contain.text', permaLink).should('contain.text', comment);
                    if (showMore) {
                        cy.get('#showMoreButton').should('be.visible').should('contain.text', 'Show more').click().should('contain.text', 'Show less').click();
                    }
                }
                cy.get(`#postMessageText_${post.id}`).should('be.visible').should('contain.text', post.message);
            });
            cy.apiDeletePost(id);
        });
    };
    const moveThreadFromGM = ({cancel = false} = {}) => {
        cy.get('#move-thread-modal').should('be.visible').within(() => {
            cy.get('.move-thread__select').should('not.exist');
            cy.get('.GenericModal__button.confirm').should('not.be.disabled');
            cy.findByTestId('notification-text').should('be.visible').should('contain.text', 'Moving this thread changes who has access');
            if (cancel) {
                cy.uiCloseModal('Move thread');
            } else {
                cy.get('.GenericModal__button.confirm').should('not.be.disabled').type('{enter}', {force: true});
            }
        });
    };
});