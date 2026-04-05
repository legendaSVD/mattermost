import * as TIMEOUTS from '../../../fixtures/timeouts';
const DEFAULT_CHARACTER_LIMIT = 16383;
describe('Forward Message', () => {
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
    const message = 'Forward this message';
    const replyMessage = 'Forward this reply';
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
            return cy.apiCreateChannel(testTeam.id, 'forward', 'Forward');
        }).then(({channel}) => {
            otherChannel = channel;
            cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        });
    });
    afterEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
    });
    it('MM-T4934_1 Forward root post from public channel to another public channel', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').click();
        forwardPost({channelId: otherChannel.id});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', otherChannel.display_name);
        verifyForwardedMessage({post: testPost});
    });
    it('MM-T4934_2 Forward root post from public channel to another public channel, long comment', () => {
        const longMessage = 'M'.repeat(6000);
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').click();
        forwardPost({channelId: otherChannel.id, comment: longMessage, testLongComment: true});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', otherChannel.display_name);
        verifyForwardedMessage({post: testPost, comment: longMessage, showMore: true});
    });
    it('MM-T4934_3 Forward reply post from public channel to another public channel', () => {
        cy.uiClickPostDropdownMenu(testPost.id, 'Reply', 'CENTER');
        cy.get('#rhsContainer').should('be.visible');
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Forward').click();
        forwardPost({channelId: otherChannel.id});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', otherChannel.display_name);
        verifyForwardedMessage({post: replyPost});
    });
    it('MM-T4934_4 Forward public channel post from global threads', () => {
        cy.uiClickSidebarItem('threads');
        cy.get('div.ThreadItem').should('have.lengthOf', 1).first().click();
        cy.clickPostDotMenu(replyPost.id, 'RHS_COMMENT');
        cy.findByText('Forward').click();
        forwardPost({channelId: otherChannel.id});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', otherChannel.display_name);
        verifyForwardedMessage({post: replyPost});
    });
    it('MM-T4934_6 Forward public channel post to Private channel', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').click();
        forwardPost({channelId: privateChannel.id});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', privateChannel.display_name);
        verifyForwardedMessage({post: testPost});
    });
    it('MM-T4934_7 Forward public channel post to GM', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').click();
        forwardPost({channelId: gmChannel.id});
        const displayName = gmChannel.display_name.split(', ').filter(((username) => username !== user1.username)).join(', ');
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', displayName);
        verifyForwardedMessage({post: testPost});
    });
    it('MM-T4934_8 Forward public channel post to DM', () => {
        cy.get(`#CENTER_button_${testPost.id}`).should('not.be.visible');
        cy.clickPostDotMenu(testPost.id);
        cy.findByText('Forward').click();
        forwardPost({channelId: dmChannel.id});
        cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').should('contain', dmChannel.display_name);
        verifyForwardedMessage({post: testPost});
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
    const forwardPost = ({channelId, comment = '', testLongComment = false}) => {
        const permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${testPost.id}`;
        const maxPostSize = DEFAULT_CHARACTER_LIMIT - permalink.length - 1;
        const longMessage = 'M'.repeat(maxPostSize);
        const extraChars = 'X';
        cy.get('#forward-post-modal').should('be.visible').within(() => {
            cy.get('.GenericModal__button.confirm').should('be.disabled');
            cy.get('.forward-post__select').should('be.visible').click();
            cy.get(`#post-forward_channel-select_option_${channelId}`).scrollIntoView().click();
            cy.get(`#post-forward_channel-select_singleValue_${channelId}`).should('be.visible');
            if (testLongComment) {
                cy.get('#forward_post_textbox').invoke('val', longMessage).trigger('change').type(extraChars, {delay: 500});
                cy.get('label.post-error').scrollIntoView().should('be.visible').should('contain', `Your message is too long. Character count: ${longMessage.length + extraChars.length}/${maxPostSize}`);
                cy.get('.GenericModal__button.confirm').should('be.disabled');
                cy.get('#forward_post_textbox').invoke('val', longMessage).trigger('change').type(' {backspace}');
                cy.get('label.post-error').should('not.exist');
            }
            if (comment) {
                cy.get('#forward_post_textbox').invoke('val', comment).trigger('change').type(' {backspace}');
                cy.get('label.post-error').should('not.exist');
            }
            cy.get('.GenericModal__button.confirm').should('not.be.disabled').click();
        });
    };
});