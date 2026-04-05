import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Forward Message', () => {
    let user1;
    let user2;
    let user3;
    let testTeam;
    let gmChannel;
    let gmChannelName;
    let testPost;
    let replyPost;
    const message = 'Forward this message';
    const replyMessage = 'Forward this reply';
    const commentMessage = 'Comment for the forwarded message';
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                ThreadAutoFollow: true,
                CollapsedThreads: 'default_on',
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
        cy.visit(`/${testTeam.name}/channels/${gmChannel.name}`);
    });
    it('MM-T4937_1 Forward reply post from GM (with at least 2 other users)', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').type('{shift}F');
        forwardPostFromGM();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', gmChannelName);
        verifyForwardedMessage({post: testPost});
    });
    it('MM-T4937_2 Forward reply post from GM (with at least 2 other users)', () => {
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Forward').type('{shift}F');
        forwardPostFromGM({comment: commentMessage});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', gmChannelName);
        verifyForwardedMessage({post: replyPost, comment: commentMessage});
    });
    it('MM-T4937_3 Forward post from GM (with at least 2 other users) - Cancel using X', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').type('{shift}F');
        forwardPostFromGM({cancel: true});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', gmChannelName);
        cy.getLastPostId((id) => {
            assert.isEqual(id, testPost.id);
        });
    });
    const verifyForwardedMessage = ({post, comment, showMore}) => {
        const permaLink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${post.id}`;
        cy.getLastPostId().then((id) => {
            cy.get(`#${id}_message`).should('be.visible').within(() => {
                if (comment) {
                    cy.get(`#postMessageText_${id}`).should('be.visible').should('contain.text', permaLink).should('contain.text', comment);
                    if (showMore) {
                        cy.get('#showMoreButton').should('be.visible').should('contain.text', 'Show more').click().should('contain.text', 'Show less').click();
                    }
                }
                cy.get('.attachment.attachment--permalink').should('have.length', 1);
                cy.get(`#postMessageText_${post.id}`).should('be.visible').should('contain.text', post.message);
            });
            cy.apiDeletePost(id);
        });
    };
    const forwardPostFromGM = ({comment = '', cancel = false} = {}) => {
        const participants = gmChannel.display_name.split(', ').slice(1).join(' and ');
        cy.get('#forward-post-modal').should('be.visible').within(() => {
            cy.get('.forward-post__select').should('not.exist');
            cy.get('.GenericModal__button.confirm').should('not.be.disabled');
            cy.findByTestId('notification_forward_post').should('be.visible').should('contain.text', `This message is from a private conversation and can only be shared with ${participants}`);
            if (comment) {
                cy.get('#forward_post_textbox').invoke('val', comment).trigger('change').type(' {backspace}');
                cy.get('label.post-error').should('not.exist');
            }
            if (cancel) {
                cy.uiCloseModal('Forward message');
            } else {
                cy.get('.GenericModal__button.confirm').should('not.be.disabled').type('{enter}', {force: true});
            }
        });
    };
});