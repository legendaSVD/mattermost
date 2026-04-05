import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Forward Message', () => {
    let user1;
    let testTeam;
    let privateChannel;
    let testPost;
    let replyPost;
    const message = 'Forward this message';
    const replyMessage = 'Forward this reply';
    before(() => {
        cy.apiRequireLicense();
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
        cy.visit(`/${testTeam.name}/channels/${privateChannel.name}`);
    });
    it('MM-T4935_1 Forward root post from private channel', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').type('{shift}F');
        forwardPostFromPrivateChannel();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', privateChannel.display_name);
        verifyForwardedMessage({post: testPost});
    });
    it('MM-T4935_2 Forward reply post from private channel', () => {
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Forward').type('{shift}F');
        forwardPostFromPrivateChannel();
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', privateChannel.display_name);
        verifyForwardedMessage({post: replyPost});
    });
    it('MM-T4935_3 Forward post from private channel - Cancel', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').type('{shift}F');
        forwardPostFromPrivateChannel(true);
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', privateChannel.display_name);
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
    const forwardPostFromPrivateChannel = (cancel = false) => {
        cy.get('#forward-post-modal').should('be.visible').within(() => {
            cy.get('.forward-post__select').should('not.exist');
            cy.get('.GenericModal__button.confirm').should('not.be.disabled');
            cy.findByTestId('notification_forward_post').should('be.visible').should('contain.text', `This message is from a private channel and can only be shared with ~${privateChannel.display_name}`);
            if (cancel) {
                cy.get('.btn-tertiary').should('not.be.disabled').click();
            } else {
                cy.get('.GenericModal__button.confirm').should('not.be.disabled').click();
            }
        });
    };
});