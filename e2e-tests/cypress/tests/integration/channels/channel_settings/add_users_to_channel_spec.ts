import {getRandomId} from '../../../utils';
describe('Channel Settings', () => {
    let testTeam: Cypress.Team;
    let firstUser: Cypress.UserProfile;
    let addedUsersChannel: Cypress.Channel;
    let username: string;
    let groupId: string;
    const usernames: string[] = [];
    const users: Cypress.UserProfile[] = [];
    before(() => {
        cy.apiRequireLicense();
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            firstUser = user;
            const teamId = testTeam.id;
            for (let i = 0; i < 10; i++) {
                cy.apiCreateUser().then(({user: newUser}) => {
                    users.push(newUser);
                    cy.apiAddUserToTeam(teamId, newUser.id);
                });
            }
            cy.apiCreateChannel(teamId, 'channel-test', 'Channel').then(({channel}) => {
                addedUsersChannel = channel;
            });
            cy.apiGetRolesByNames(['team_user']).then((result: any) => {
                if (result.roles) {
                    const role = result.roles[0];
                    const permissions = role.permissions.filter((permission) => {
                        return !(['add_user_to_team'].includes(permission));
                    });
                    if (permissions.length !== role.permissions) {
                        cy.apiPatchRole(role.id, {permissions});
                    }
                }
            });
            cy.apiLogin(firstUser);
        }).then(() => {
            groupId = getRandomId();
            cy.apiCreateCustomUserGroup(`group${groupId}`, `group${groupId}`, [users[0].id, users[1].id]);
        });
    });
    it('MM-T856_1 Add existing users to public channel from drop-down > Add Members', () => {
        cy.visit(`/${testTeam.name}/channels/${addedUsersChannel.name}`);
        cy.uiOpenChannelMenu('Members');
        cy.uiGetButton('Add').click();
        cy.get('#addUsersToChannelModal').should('be.visible');
        cy.get('#selectItems input').typeWithForce('user');
        cy.get('#multiSelectList > div').not(':contains("Already in channel")').first().then((el) => {
            const childNodes = Array.from(el[0].childNodes);
            childNodes.map((child: HTMLElement) => usernames.push(child.innerText));
            username = usernames.toString().match(/\w+/g)[0];
            cy.get('#multiSelectList').should('contain', username);
            cy.get(el as unknown as string).children().first().should('have.class', 'status-wrapper');
            cy.wrap(el).click();
            cy.get('#multiSelectList').should('not.exist');
            cy.uiGetButton('Add').click();
            cy.get('#addUsersToChannelModal').should('not.exist');
        });
        cy.getLastPostId().then((id) => {
            cy.get(`#postMessageText_${id}`).should('contain', `${username} added to the channel by you.`);
        });
        addNumberOfUsersToChannel(2, false);
        cy.getLastPostId().then((id) => {
            cy.get(`#postMessageText_${id}`).should('contain', 'added to the channel by you');
        });
    });
    it('MM-T856_2 Existing users cannot be added to public channel from drop-down > Add Members', () => {
        cy.apiAdminLogin();
        cy.visit(`/${testTeam.name}/channels/${addedUsersChannel.name}`);
        cy.getLastPostId().then((id) => {
            cy.get(`#postMessageText_${id}`).should('contain', `added to the channel by @${firstUser.username}`);
        });
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        cy.uiOpenChannelMenu('Members');
        cy.uiGetButton('Add').click();
        cy.get('#addUsersToChannelModal').should('be.visible');
        cy.get('#selectItems input').typeWithForce(firstUser.username);
        cy.get('#multiSelectList').should('exist').within(() => {
            cy.findByText('Already in channel').should('be.visible');
        });
        cy.get('body').type('{esc}');
    });
    it('Add group members to channel', () => {
        cy.apiLogin(firstUser);
        cy.apiCreateChannel(testTeam.id, 'new-channel', 'New Channel').then(({channel}) => {
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
            cy.uiOpenChannelMenu('Members');
            cy.uiGetButton('Add').click();
            cy.get('#addUsersToChannelModal').should('be.visible');
            cy.get('#selectItems input').typeWithForce(`group${groupId}`);
            cy.get('#multiSelectList').should('exist').children().first().click();
            cy.uiGetButton('Add').click();
            cy.get('#addUsersToChannelModal').should('not.exist');
            cy.getLastPostId().then((id) => {
                cy.get(`#postMessageText_${id}`).should('contain', 'added to the channel by you');
                verifyMentionedUserAndProfilePopover(id);
            });
            cy.get('#channelMemberCountText').
                should('be.visible').
                and('have.text', '3');
        });
    });
    it('Add group members that are not team members', () => {
        cy.apiAdminLogin();
        cy.apiCreateUser().then(({user: newUser}) => {
            const id = getRandomId();
            cy.apiCreateCustomUserGroup(`newgroup${id}`, `newgroup${id}`, [newUser.id]).then(() => {
                cy.apiCreateChannel(testTeam.id, 'new-group-channel', 'New Group Channel').then(({channel}) => {
                    cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                    cy.uiOpenChannelMenu('Members');
                    cy.uiGetButton('Add').click();
                    cy.get('#addUsersToChannelModal').should('be.visible');
                    cy.get('#selectItems input').typeWithForce(`newgroup${id}`);
                    cy.get('#multiSelectList').should('exist').children().first().click();
                    cy.findByTestId('teamWarningBanner').should('contain', '1 user was not selected because they are not a part of this team');
                    cy.findByTestId('teamWarningBanner').should('contain', `@${newUser.username}`);
                    cy.uiGetButton('Cancel').click();
                    cy.get('#addUsersToChannelModal').should('not.exist');
                });
            });
        });
    });
    it('Add group members and guests that are not team members', () => {
        cy.apiAdminLogin();
        cy.apiCreateUser().then(({user: newUser}) => {
            cy.apiCreateGuestUser({}).then(({guest}) => {
                const id = getRandomId();
                cy.apiCreateCustomUserGroup(`guestgroup${id}`, `guestgroup${id}`, [guest.id, newUser.id]).then(() => {
                    cy.apiCreateChannel(testTeam.id, 'group-guest-channel', 'Channel').then(({channel}) => {
                        cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                        cy.uiOpenChannelMenu('Members');
                        cy.uiGetButton('Add').click();
                        cy.get('#addUsersToChannelModal').should('be.visible');
                        cy.get('#selectItems input').typeWithForce(`guestgroup${id}`);
                        cy.get('#multiSelectList').should('exist').children().first().click();
                        cy.findByTestId('teamWarningBanner').should('contain', '2 users were not selected because they are not a part of this team');
                        cy.findByTestId('teamWarningBanner').should('contain', `@${newUser.username}`);
                        cy.findByTestId('teamWarningBanner').should('contain', `@${guest.username} is a guest user`);
                        cy.uiGetButton('Cancel').click();
                        cy.get('#addUsersToChannelModal').should('not.exist');
                    });
                });
            });
        });
    });
    it('User doesn\'t have permission to add user to team', () => {
        cy.apiAdminLogin();
        cy.apiCreateUser().then(({user: newUser}) => {
            const id = getRandomId();
            cy.apiCreateCustomUserGroup(`newgroup${id}`, `newgroup${id}`, [newUser.id]).then(() => {
                cy.apiCreateChannel(testTeam.id, 'new-group-channel', 'Channel').then(({channel}) => {
                    cy.apiLogin(firstUser);
                    cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                    cy.uiOpenChannelMenu('Members');
                    cy.uiGetButton('Add').click();
                    cy.get('#addUsersToChannelModal').should('be.visible');
                    cy.get('#selectItems input').typeWithForce(`newgroup${id}`);
                    cy.get('#multiSelectList').should('exist').children().first().click();
                    cy.findByTestId('teamWarningBanner').should('contain', '1 user was not selected because they are not a part of this team');
                    cy.findByTestId('teamWarningBanner').should('contain', `@${newUser.username}`);
                });
            });
        });
    });
});
function verifyMentionedUserAndProfilePopover(postId: string) {
    cy.get(`#post_${postId}`).find('.mention-link').each(($el) => {
        const userName = $el[0].innerHTML;
        cy.wrap($el).click();
        cy.get('div.user-profile-popover').should('be.visible');
        cy.get('div.user-profile-popover').should('contain', userName);
        cy.get('button.closeButtonRelativePosition').click();
        cy.get('#channelHeaderInfo').click();
    });
}
function addNumberOfUsersToChannel(num = 1, allowExisting = false) {
    cy.uiOpenChannelMenu('Members');
    cy.uiGetButton('Add').click();
    cy.get('#addUsersToChannelModal').should('be.visible');
    Cypress._.times(num, () => {
        cy.get('#selectItems input').typeWithForce('user');
        if (allowExisting) {
            cy.get('#multiSelectList').should('exist').children().first().click();
        } else {
            cy.get('#multiSelectList').should('exist').children().not(':contains("Already in channel")').first().click();
        }
    });
    cy.uiGetButton('Add').click();
    cy.get('#addUsersToChannelModal').should('not.exist');
}