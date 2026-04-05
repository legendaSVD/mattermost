import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {stubClipboard} from '../../../utils';
describe('Channel Info RHS', () => {
    let testTeam: Team;
    let testChannel: Channel;
    let groupChannel: Channel;
    let directChannel: Channel;
    let directUser: UserProfile;
    let admin: UserProfile;
    let user: UserProfile;
    const otherUsers: UserProfile[] = [];
    before(() => {
        cy.apiInitSetup({promoteNewUserAsAdmin: true}).then(({team, user: newAdmin}) => {
            testTeam = team;
            admin = newAdmin;
            cy.apiCreateChannel(testTeam.id, 'channel', 'Public Channel', 'O').then(({channel}) => {
                testChannel = channel;
                cy.apiAddUserToChannel(channel.id, newAdmin.id);
            });
            cy.apiCreateUser().then(({user: newUser}) => {
                cy.apiAddUserToTeam(team.id, newUser.id);
                user = newUser;
            });
            cy.apiCreateUser().then(({user: newUser}) => {
                otherUsers.push(newUser);
                cy.apiPatchUser(newUser.id, {position: 'Upside down'} as UserProfile).then(({user: patchedUser}) => {
                    cy.apiCreateDirectChannel([newAdmin.id, newUser.id]).then(({channel}) => {
                        directChannel = channel;
                    });
                    directUser = patchedUser;
                });
                cy.apiAddUserToTeam(team.id, newUser.id);
                cy.apiCreateUser().then(({user: newUser2}) => {
                    otherUsers.push(newUser2);
                    cy.apiAddUserToTeam(team.id, newUser.id);
                    cy.apiCreateGroupChannel([newAdmin.id, newUser.id, newUser2.id]).then(({channel}) => {
                        groupChannel = channel;
                    });
                });
            });
            cy.apiGetRolesByNames(['channel_user']).then(({roles}) => {
                const role = roles[0];
                const permissions = role.permissions.filter((permission) => {
                    return !(['manage_public_channel_members', 'manage_private_channel_members', 'manage_public_channel_properties', 'manage_private_channel_properties'].includes(permission));
                });
                if (permissions.length !== role.permissions.length) {
                    cy.apiPatchRole(role.id, {permissions});
                }
            });
            cy.apiLogin(admin);
        });
    });
    it('should be able to open the RHS', () => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#channel-info-btn').click();
        ensureRHSIsOpenOnChannelInfo(testChannel);
    });
    describe('regular channel', () => {
        describe('top buttons', () => {
            it('should show correct tooltips for all buttons', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Favorite').trigger('mouseenter');
                cy.findByText('Add this channel to favorites').should('be.visible');
                cy.uiGetRHS().findByText('Favorite').trigger('mouseleave');
                cy.uiGetRHS().findByText('Mute').trigger('mouseenter');
                cy.findByText('Mute notifications for this channel').should('be.visible');
                cy.uiGetRHS().findByText('Mute').trigger('mouseleave');
                cy.uiGetRHS().findByText('Add People').trigger('mouseenter');
                cy.findByText('Add team members to this channel').should('be.visible');
                cy.uiGetRHS().findByText('Add People').trigger('mouseleave');
                cy.uiGetRHS().findByText('Copy Link').trigger('mouseenter');
                cy.findByText('Copy link to this channel').should('be.visible');
                cy.uiGetRHS().findByText('Copy Link').trigger('mouseleave');
            });
            it('should be able to toggle favorite on a channel', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Favorite').should('be.visible').click();
                cy.uiGetRHS().findByText('Favorited').should('be.visible').click();
                cy.uiGetRHS().findByText('Favorite').should('be.visible');
            });
            it('should be able to toggle mute on a channel', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Mute').should('be.visible').click();
                cy.uiGetRHS().findByText('Muted').should('be.visible').click();
                cy.uiGetRHS().findByText('Mute').should('be.visible');
            });
            it('should be able to add people', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Add People').should('be.visible').click();
                cy.get('.channel-invite').should('be.visible');
            });
            it('should NOT be able to add people without permission', () => {
                cy.apiLogout().then(() => {
                    cy.apiLogin(user);
                    cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                    cy.get('#channel-info-btn').click();
                    cy.uiGetRHS().findByText('Add People').should('not.exist');
                    cy.apiLogout().then(() => {
                        cy.apiLogin(admin);
                    });
                });
            });
            it('should be able to copy link', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                stubClipboard().as('clipboard');
                cy.get('#channel-info-btn').click();
                cy.get('@clipboard').its('contents').should('eq', '');
                cy.uiGetRHS().findByText('Copy Link').parent().should('be.visible').trigger('click');
                cy.uiGetRHS().findByText('Copied').should('be.visible');
                cy.get('@clipboard').its('contents').should('eq', `${Cypress.config('baseUrl')}/${testTeam.name}/channels/${testChannel.name}`);
            });
        });
        describe('about area', () => {
            it('should display purpose', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.apiPatchChannel(testChannel.id, {
                    purpose: 'purpose for the tests',
                }).then(() => {
                    cy.uiGetRHS().findByText('purpose for the tests').should('be.visible');
                });
            });
            it('should display header', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.apiPatchChannel(testChannel.id, {
                    header: 'header for the tests',
                }).then(() => {
                    cy.uiGetRHS().findByText('header for the tests').should('be.visible');
                });
            });
            it('should be able to rename channel from About area', () => {
                cy.apiCreateChannel(testTeam.id, 'channel-to-rename', 'Channel To Rename', 'O').then(({channel}) => {
                    cy.apiAddUserToChannel(channel.id, admin.id);
                    cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                    cy.get('#channel-info-btn').click();
                    cy.uiGetRHS().findAllByLabelText('Edit').first().click({force: true});
                    cy.findByRole('heading', {name: /rename channel/i}).should('be.visible');
                    cy.findByPlaceholderText(/enter display name/i).clear().type('Renamed Channel');
                    cy.get('.url-input-button').click();
                    cy.get('.url-input-container input').clear().type('renamed-channel');
                    cy.get('.url-input-container button.url-input-button').click();
                    cy.findByRole('button', {name: /save/i}).click();
                    cy.location('pathname').should('include', `/${testTeam.name}/channels/renamed-channel`);
                    cy.get('#channelHeaderTitle').should('contain', 'Renamed Channel');
                });
            });
        });
        describe('bottom menu', () => {
            it('should be able to manage notifications', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByTestId('channel_info_rhs-menu').findByText('Notification Preferences').scrollIntoView().should('be.visible').click();
                cy.get('.ChannelNotificationModal').should('be.visible');
            });
            it('should open Channel Settings from RHS menu', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('body').then(($body) => {
                    if ($body.find('#rhsCloseButton').length > 0) {
                        cy.get('#rhsCloseButton').click();
                    }
                    cy.get('#channel-info-btn').should('be.visible').click();
                });
                cy.uiGetRHS().findByTestId('channel_info_rhs-menu').findByText('Channel Settings').scrollIntoView().should('be.visible').click();
                cy.get('.ChannelSettingsModal').should('be.visible');
            });
            it('should be able to view files and come back', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByTestId('channel_info_rhs-menu').findByText('Files').scrollIntoView().should('be.visible').click();
                cy.uiGetRHS().findByText('No files yet').should('be.visible');
                cy.uiGetRHS().get('[aria-label="Back Icon"]').click();
                ensureRHSIsOpenOnChannelInfo(testChannel);
            });
            it('should be able to view pinned message and come back', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.uiPostMessageQuickly('Hello channel info rhs spec').then(() => {
                    cy.getNthPostId(-1).then((postId) => {
                        cy.clickPostDotMenu(postId);
                        cy.get(`#pin_post_${postId}`).click();
                    });
                });
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByTestId('channel_info_rhs-menu').findByText('Pinned messages').scrollIntoView().should('be.visible').click();
                cy.uiGetRHS().findByText('Hello channel info rhs spec').first().should('be.visible');
                cy.uiGetRHS().get('[aria-label="Back Icon"]').click();
                ensureRHSIsOpenOnChannelInfo(testChannel);
            });
            it('should be able to view channel members and come back', () => {
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByTestId('channel_info_rhs-menu').findByText('Members').scrollIntoView().should('be.visible').click();
                cy.uiGetRHS().contains('sysadmin').should('be.visible');
                cy.uiGetRHS().contains(`${admin.username}`).should('be.visible');
                cy.uiGetRHS().get('[aria-label="Back Icon"]').click();
                ensureRHSIsOpenOnChannelInfo(testChannel);
            });
        });
    });
    describe('group channel', () => {
        describe('top buttons', () => {
            it('should be able to toggle favorite', () => {
                cy.visit(`/${testTeam.name}/messages/${groupChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Favorite').should('be.visible').click();
                cy.uiGetRHS().findByText('Favorited').should('be.visible').click();
                cy.uiGetRHS().findByText('Favorite').should('be.visible');
            });
            it('should be able to toggle mute', () => {
                cy.visit(`/${testTeam.name}/messages/${groupChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Mute').should('be.visible').click();
                cy.uiGetRHS().findByText('Muted').should('be.visible').click();
                cy.uiGetRHS().findByText('Mute').should('be.visible');
            });
            it('should be able to add people', () => {
                cy.visit(`/${testTeam.name}/messages/${groupChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Add People').should('be.visible').click();
                cy.get('.more-direct-channels').should('be.visible');
            });
            it('should NOT be able to copy link', () => {
                cy.visit(`/${testTeam.name}/messages/${groupChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().get('Copy Link').should('not.exist');
            });
        });
        describe('about area', () => {
            it('should display other users', () => {
                cy.visit(`/${testTeam.name}/messages/${groupChannel.name}`);
                cy.get('#channel-info-btn').click();
                otherUsers.forEach((otherUser) => {
                    cy.uiGetRHS().contains(otherUser.username);
                });
            });
            it('should display header', () => {
                cy.visit(`/${testTeam.name}/messages/${groupChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.apiPatchChannel(groupChannel.id, {
                    header: 'header for the tests',
                }).then(() => {
                    cy.uiGetRHS().findByText('header for the tests').should('be.visible');
                });
            });
        });
        describe('bottom menu', () => {
            it('should be able to manage notifications', () => {
                cy.visit(`/${testTeam.name}/messages/${groupChannel.name}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByTestId('channel_info_rhs-menu').findByText('Notification Preferences').scrollIntoView().should('be.visible').click();
                cy.get('.ChannelNotificationModal').should('be.visible');
            });
        });
    });
    describe('direct channel', () => {
        describe('top buttons', () => {
            it('should be able to toggle favorite', () => {
                cy.visit(`/${testTeam.name}/messages/@${directUser.username}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Favorite').should('be.visible').click();
                cy.uiGetRHS().findByText('Favorited').should('be.visible').click();
                cy.uiGetRHS().findByText('Favorite').should('be.visible');
            });
            it('should be able to toggle mute', () => {
                cy.visit(`/${testTeam.name}/messages/@${directUser.username}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Mute').should('be.visible').click();
                cy.uiGetRHS().findByText('Muted').should('be.visible').click();
                cy.uiGetRHS().findByText('Mute').should('be.visible');
            });
            it('should NOT be able to add people', () => {
                cy.visit(`/${testTeam.name}/messages/@${directUser.username}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().findByText('Add People').should('not.exist');
            });
            it('should NOT be able to copy link', () => {
                cy.visit(`/${testTeam.name}/messages/@${directUser.username}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().get('Copy Link').should('not.exist');
            });
        });
        describe('about area', () => {
            it('should display other user name and position', () => {
                cy.visit(`/${testTeam.name}/messages/@${directUser.username}`);
                cy.get('#channel-info-btn').click();
                cy.uiGetRHS().contains(directUser.username);
                cy.uiGetRHS().contains(directUser.position);
            });
            it('should display header', () => {
                cy.visit(`/${testTeam.name}/messages/@${directUser.username}`);
                cy.get('#channel-info-btn').click();
                cy.apiPatchChannel(directChannel.id, {
                    header: 'header for the tests',
                }).then(() => {
                    cy.uiGetRHS().findByText('header for the tests').should('be.visible');
                });
            });
        });
    });
});
function ensureRHSIsOpenOnChannelInfo(testChannel) {
    cy.get('#rhsContainer').then((rhsContainer) => {
        cy.wrap(rhsContainer).findByText('Info').should('be.visible');
        cy.wrap(rhsContainer).find('.sidebar--right__title__subtitle').should('contain', testChannel.display_name);
    });
}