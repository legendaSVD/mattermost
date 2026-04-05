import {getAdminAccount} from '../../../../tests/support/env';
describe('loading of at-mentioned users', () => {
    const admin = getAdminAccount();
    let testChannel;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({channel, channelUrl}) => {
            testChannel = channel;
            cy.visit(channelUrl);
            cy.findByText('Write to ' + testChannel.display_name);
        });
    });
    it('should load a user who joins the channel', () => {
        cy.externalCreateUser({}).then((otherUser) => {
            assertUserNotLoaded(otherUser.id);
            cy.externalAddUserToTeam(otherUser.id, testChannel.team_id);
            cy.externalAddUserToChannel(otherUser.id, testChannel.id);
            cy.contains('a', '@' + otherUser.username).should('be.visible');
        });
    });
    it('should load a user who posts in the channel', () => {
        cy.externalCreateUser({}).then((otherUser) => {
            cy.externalUpdateUserRoles(otherUser.id, 'system_user system_admin');
            assertUserNotLoaded(otherUser.id);
            cy.externalCreatePostAsUser(otherUser, {
                channel_id: testChannel.id,
                message: 'This is a post',
            }).then((post) => {
                cy.findByText(post.message).should('be.visible');
                cy.get(`#${post.id}_message`).should('be.visible');
            });
            cy.contains('button.user-popover', otherUser.username).should('be.visible');
        });
    });
    it("should load a user who's been at-mentioned in a post", () => {
        cy.externalCreateUser({}).then((otherUser) => {
            assertUserNotLoaded(otherUser.id);
            cy.externalCreatePostAsUser(admin, {
                channel_id: testChannel.id,
                message: `Created @${otherUser.username}`,
            });
            cy.contains('a', '@' + otherUser.username).should('be.visible');
        });
    });
    it("should load a user who's been at-mentioned in a message attachment's text", () => {
        cy.externalCreateUser({}).then((otherUser) => {
            assertUserNotLoaded(otherUser.id);
            cy.externalCreatePostAsUser(admin, {
                channel_id: testChannel.id,
                props: {
                    attachments: [
                        {text: `Ticket updated by @${otherUser.username}`},
                    ],
                },
            });
            cy.contains('a', '@' + otherUser.username).should('be.visible');
        });
    });
    it("should load a user who's been at-mentioned in a message attachment's pretext", () => {
        cy.externalCreateUser({}).then((otherUser) => {
            assertUserNotLoaded(otherUser.id);
            cy.externalCreatePostAsUser(admin, {
                channel_id: testChannel.id,
                props: {
                    attachments: [
                        {pretext: `@${otherUser.username} created a ticket`, text: 'Ticket #123 - Fix some bug'},
                    ],
                },
            });
            cy.contains('a', '@' + otherUser.username).should('be.visible');
        });
    });
    it("should not load a user who's been at-mentioned in a message attachment's title", () => {
        cy.externalCreateUser({}).then((otherUser) => {
            assertUserNotLoaded(otherUser.id);
            cy.externalCreatePostAsUser(admin, {
                channel_id: testChannel.id,
                props: {
                    attachments: [
                        {title: `@${otherUser.username}'s ticket`, text: 'TODO'},
                    ],
                },
            });
            cy.contains('h1', `@${otherUser.username}'s ticket`).should('be.visible');
        });
    });
    it("should not load a user who's been at-mentioned in a message attachment's field's title", () => {
        cy.externalCreateUser({}).then((otherUser) => {
            assertUserNotLoaded(otherUser.id);
            cy.externalCreatePostAsUser(admin, {
                channel_id: testChannel.id,
                props: {
                    attachments: [
                        {
                            title: 'Ticket created',
                            fields: [
                                {title: `Note from @${otherUser.username}`, value: 'Something happened'},
                            ],
                        },
                    ],
                },
            });
            cy.contains('th', `Note from @${otherUser.username}`).should('be.visible');
        });
    });
    it("should load a user who's been at-mentioned in a message attachment's field's value", () => {
        cy.externalCreateUser({}).then((otherUser) => {
            assertUserNotLoaded(otherUser.id);
            cy.externalCreatePostAsUser(admin, {
                channel_id: testChannel.id,
                props: {
                    attachments: [
                        {
                            title: 'Ticket created',
                            fields: [
                                {title: 'Assignee', value: `Created @${otherUser.username}`},
                            ],
                        },
                    ],
                },
            });
            cy.contains('a', '@' + otherUser.username).should('be.visible');
        });
    });
});
function assertUserNotLoaded(userId: string) {
    cy.window().then((win) => {
        const state = (win as any).store.getState();
        cy.wrap(state.entities.users.profiles[userId]).should('be.undefined');
    });
}