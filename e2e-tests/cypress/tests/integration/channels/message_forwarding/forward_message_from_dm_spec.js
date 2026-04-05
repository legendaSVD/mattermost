import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Forward Message', () => {
    let user1;
    let user2;
    let testTeam;
    let dmChannel;
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
        cy.visit(`/${testTeam.name}/channels/${dmChannel.name}`);
    });
    it('MM-T4936_1 Forward root post from DM', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').type('{shift}F');
        forwardPostFromDM();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', dmChannel.display_name);
        verifyForwardedMessage({post: testPost});
    });
    it('MM-T4936_2 Forward reply post from DM', () => {
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Forward').type('{shift}F');
        forwardPostFromDM({comment: commentMessage});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', dmChannel.display_name);
        verifyForwardedMessage({post: replyPost, comment: commentMessage});
    });
    it('MM-T4936_3 Forward post from DM - Cancel using escape key', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').type('{shift}F');
        forwardPostFromDM({cancel: true});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', dmChannel.display_name);
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
    const forwardPostFromDM = ({comment = '', cancel = false} = {}) => {
        cy.get('#forward-post-modal').should('be.visible').within(() => {
            cy.get('.forward-post__select').should('not.exist');
            cy.get('.btn-tertiary').should('not.be.disabled');
            cy.findByTestId('notification_forward_post').should('be.visible').should('contain.text', `This message is from a private conversation and can only be shared with ${dmChannel.display_name}`);
            if (comment) {
                cy.get('#forward_post_textbox').invoke('val', comment).trigger('change').type(' {backspace}');
                cy.get('label.post-error').should('not.exist');
            }
            if (cancel) {
                cy.get('.btn-tertiary').should('not.be.disabled').type('{esc}', {force: true});
            } else {
                cy.get('.GenericModal__button.confirm').should('not.be.disabled').type('{enter}', {force: true});
            }
        });
    };
});