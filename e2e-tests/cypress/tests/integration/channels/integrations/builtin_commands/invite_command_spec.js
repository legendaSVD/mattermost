import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {loginAndVisitChannel} from './helper';
describe('Integrations', () => {
    let testUser;
    let testTeam;
    const userGroup = [];
    let testChannel;
    let testChannelUrl;
    let offTopicUrl;
    before(() => {
        cy.apiInitSetup().then(({team, user, offTopicUrl: url}) => {
            testUser = user;
            testTeam = team;
            offTopicUrl = url;
            Cypress._.times(8, () => {
                cy.apiCreateUser().then(({user: otherUser}) => {
                    cy.apiAddUserToTeam(team.id, otherUser.id);
                    userGroup.push(otherUser);
                });
            });
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiCreateChannel(testTeam.id, 'channel', 'channel').then(({channel}) => {
            testChannel = channel;
            testChannelUrl = `/${testTeam.name}/channels/${channel.name}`;
            cy.apiAddUserToChannel(channel.id, testUser.id);
        });
    });
    it('MM-T658 /invite - current channel', () => {
        cy.apiCreateUser().then(({user}) => {
            return cy.apiDeactivateUser(user.id).then(() => user);
        }).then((deactivatedUser) => {
            const userToInvite = userGroup[0];
            loginAndVisitChannel(testUser, testChannelUrl);
            cy.postMessage(`/invite @${userToInvite.username} `);
            cy.uiWaitUntilMessagePostedIncludes(`@${userToInvite.username} added to the channel by you`);
            cy.postMessage(`/invite @${deactivatedUser.username} `);
            cy.uiWaitUntilMessagePostedIncludes(`We couldn't find the user ${deactivatedUser.username}. They may have been deactivated by the System Administrator.`);
            cy.apiLogout();
            loginAndVisitChannel(userToInvite, offTopicUrl);
            cy.uiGetLhsSection('CHANNELS').
                findByLabelText(`${testChannel.display_name.toLowerCase()} public channel 1 mention`).
                should('be.visible').
                click();
            cy.uiWaitUntilMessagePostedIncludes(`You were added to the channel by @${testUser.username}`);
        });
    });
    it('MM-T661 /invite extra white space before @ in DM or GM', () => {
        const [member1, member2, userToInviteGM, userToInviteDM] = userGroup;
        loginAndVisitChannel(testUser, testChannelUrl);
        cy.postMessage(`/groupmsg @${member1.username},@${member2.username} `);
        cy.uiGetChannelHeaderButton().contains(member1.username).contains(member2.username);
        cy.postMessage(`/invite        @${userToInviteGM.username} ~${testChannel.name} `);
        cy.uiWaitUntilMessagePostedIncludes(`${userToInviteGM.username} added to ${testChannel.name} channel.`);
        cy.uiAddDirectMessage().click();
        cy.get('#selectItems input').typeWithForce(userToInviteDM.username).wait(TIMEOUTS.ONE_SEC);
        cy.get('#multiSelectList').findByText(`@${userToInviteDM.username}`).click();
        cy.findByText('Go').click();
        cy.uiGetChannelHeaderButton().contains(userToInviteDM.username);
        cy.postMessage(`/invite        @${userToInviteDM.username} ~${testChannel.name} `);
        cy.uiWaitUntilMessagePostedIncludes(`${userToInviteDM.username} added to ${testChannel.name} channel.`);
    });
    it('MM-T659 /invite - other channel', () => {
        const userToInvite = userGroup[0];
        loginAndVisitChannel(testUser, offTopicUrl);
        cy.postMessage(`/invite @${userToInvite.username} ~${testChannel.name} `);
        cy.uiWaitUntilMessagePostedIncludes(`${userToInvite.username} added to ${testChannel.name} channel.`);
        cy.apiLogout();
        loginAndVisitChannel(userToInvite, offTopicUrl);
        cy.uiGetLhsSection('CHANNELS').
            findByLabelText(`${testChannel.display_name.toLowerCase()} public channel 1 mention`).
            should('be.visible').
            click();
        cy.uiWaitUntilMessagePostedIncludes(`You were added to the channel by @${testUser.username}`);
    });
    it('MM-T660_1 /invite tests when used in DMs and GMs', () => {
        const [member1, member2, userDM] = userGroup;
        loginAndVisitChannel(testUser, testChannelUrl);
        cy.postMessage(`/groupmsg @${member1.username},@${member2.username} `);
        cy.uiGetChannelHeaderButton().contains(member1.username).contains(member2.username);
        cy.reload();
        cy.postMessage(`/invite @${testChannel.name} `);
        cy.uiWaitUntilMessagePostedIncludes(`We couldn't find the user ${testChannel.name}. They may have been deactivated by the System Administrator.`);
        cy.uiAddDirectMessage().click();
        cy.get('#selectItems input').typeWithForce(userDM.username).wait(TIMEOUTS.ONE_SEC);
        cy.get('#multiSelectList').findByText(`@${userDM.username}`).click();
        cy.findByText('Go').click();
        cy.uiGetChannelHeaderButton().contains(userDM.username);
        cy.postMessage(`/invite @${testChannel.name} `);
        cy.uiWaitUntilMessagePostedIncludes(`We couldn't find the user ${testChannel.name}. They may have been deactivated by the System Administrator.`);
    });
    it('MM-T660_2 /invite tests when used in DMs and GMs', () => {
        const [member1, member2, userDM, userToInvite] = userGroup;
        cy.apiAddUserToChannel(testChannel.id, userToInvite.id);
        loginAndVisitChannel(testUser, testChannelUrl);
        cy.postMessage(`/groupmsg @${member1.username},@${member2.username} `);
        cy.uiGetChannelHeaderButton().contains(member1.username).contains(member2.username);
        cy.reload();
        cy.postMessage(`/invite @${userToInvite.username} ~${testChannel.name} `);
        cy.uiWaitUntilMessagePostedIncludes(`${userToInvite.username} is already in the channel.`);
        cy.uiAddDirectMessage().click();
        cy.get('#selectItems input').typeWithForce(userDM.username).wait(TIMEOUTS.ONE_SEC);
        cy.get('#multiSelectList').findByText(`@${userDM.username}`).click();
        cy.findByText('Go').click();
        cy.uiGetChannelHeaderButton().contains(userDM.username);
        cy.postMessage(`/invite @${userToInvite.username} ~${testChannel.name} `);
        cy.uiWaitUntilMessagePostedIncludes(`${userToInvite.username} is already in the channel.`);
    });
    it('MM-T660_3 /invite tests when used in DMs and GMs', () => {
        const [userA, userB, userC, userDM, member1, member2] = userGroup;
        loginAndVisitChannel(testUser, offTopicUrl);
        cy.uiCreateChannel({name: `${userA.username}-channel`});
        cy.get('#postListContent').should('be.visible');
        cy.apiLogout();
        loginAndVisitChannel(userB, offTopicUrl);
        cy.uiAddDirectMessage().click();
        cy.get('#selectItems input').typeWithForce(userDM.username).wait(TIMEOUTS.ONE_SEC);
        cy.get('#multiSelectList').findByText(`@${userDM.username}`).click();
        cy.findByText('Go').click();
        cy.uiGetChannelHeaderButton().contains(userDM.username);
        cy.postMessage(`/invite @${userC.username} ~${userA.username}-channel `);
        cy.uiWaitUntilMessagePostedIncludes(`You don't have enough permissions to add ${userC.username} in ${userA.username}-channel.`);
        cy.postMessage(`/groupmsg @${member1.username} @${member2.username} `);
        cy.postMessage(`/invite @${userC.username} ~${userA.username}-channel `);
        cy.uiWaitUntilMessagePostedIncludes(`You don't have enough permissions to add ${userC.username} in ${userA.username}-channel.`);
    });
    it('MM-T660_4 /invite tests when used in DMs and GMs', () => {
        const userToInvite = userGroup[0];
        loginAndVisitChannel(testUser, offTopicUrl);
        cy.postMessage(`/invite @${userToInvite.username} ${testChannel.display_name} `);
        cy.uiWaitUntilMessagePostedIncludes(`Could not find the channel ${testChannel.display_name.split(' ')[1]}. Please use the channel handle to identify channels.`);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).
                contains('a', 'channel handle').should('have.attr', 'href', 'https://docs.mattermost.com/messaging/managing-channels.html#naming-a-channel');
        });
    });
});