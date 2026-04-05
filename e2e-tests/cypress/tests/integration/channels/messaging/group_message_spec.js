import * as TIMEOUTS from '../../../fixtures/timeouts';
import {spyNotificationAs} from '../../../support/notification';
describe('Group Message', () => {
    let testTeam;
    let testUser;
    let townsquareLink;
    const users = [];
    const groupUsersCount = 3;
    before(() => {
        cy.apiInitSetup({}).then(({team, user, townSquareUrl}) => {
            testTeam = team;
            testUser = user;
            townsquareLink = townSquareUrl;
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        Cypress._.times(groupUsersCount, (i) => {
            cy.apiCreateUser().then(({user: newUser}) => {
                cy.apiAddUserToTeam(testTeam.id, newUser.id);
                users.push(newUser);
                if (i === groupUsersCount - 1) {
                    cy.apiLogin(testUser);
                    cy.visit(townsquareLink);
                }
            });
        });
    });
    it('MM-T3319 Add GM', () => {
        const otherUser1 = users[0];
        const otherUser2 = users[1];
        cy.uiAddDirectMessage().click();
        cy.get('#moreDmModal').should('be.visible').contains('Direct Messages');
        cy.get('#selectItems input').should('be.enabled').typeWithForce(`@${otherUser1.username}`);
        cy.get('#moreDmModal .more-modal__row').should('be.visible').and('contain', otherUser1.username).click({force: true});
        cy.get('#selectItems input').should('be.enabled').typeWithForce(`@${otherUser2.username}`);
        cy.get('#moreDmModal .more-modal__row').should('be.visible').and('contain', otherUser2.username).click({force: true});
        cy.get('#selectItems input').should('be.enabled').typeWithForce(`@${testUser.username}`);
        cy.get('.no-channel-message').should('be.visible').and('contain', 'No results found matching');
        cy.findByText('Go').click();
        cy.uiGetPostTextBox().type('Hi!').type('{enter}');
        cy.uiAddDirectMessage().click();
        cy.get('#moreDmModal').should('be.visible').contains('Direct Messages');
        cy.get('#selectItems input').should('be.enabled').typeWithForce(`@${otherUser2.username}`);
        cy.get('#moreDmModal .more-modal__row').should('be.visible').and('contain', otherUser2.username).and('contain', otherUser1.username);
    });
    it('MM-T460 - Add and Remove users whilst creating a group message', () => {
        createGroupMessageWith(users.slice(0, 2));
        cy.uiOpenChannelMenu('Add Members');
        cy.get('#selectItems input').typeWithForce(users[2].username).wait(TIMEOUTS.HALF_SEC);
        cy.get('#multiSelectList .clickable').first().click();
        cy.get('#multiSelectHelpMemberInfo').should('contain', 'You can add 4 more people');
        cy.get('#multiSelectList .clickable').first().click();
        cy.get('#multiSelectHelpMemberInfo').should('contain', 'You can add 3 more people');
        cy.get('#selectItems .react-select__multi-value__remove').first().click();
        cy.get('#multiSelectHelpMemberInfo').should('contain', 'You can add 4 more people');
        cy.get('#selectItems input').typeWithForce('{backspace}').wait(TIMEOUTS.HALF_SEC);
        cy.get('#multiSelectHelpMemberInfo').should('contain', 'You can add 5 more people');
    });
    it('MM-T465 - Assert that group message participant sees', () => {
        const participants = users.slice(0, 2);
        createGroupMessageWith(participants);
        cy.wait(TIMEOUTS.HALF_SEC);
        const sortedParticipants = participants.sort((a, b) => {
            return a.username > b.username ? 1 : -1;
        });
        const expectedChannelInfo = 'This is the start of your group message history with these teammates.';
        cy.get('#channelIntro p.channel-intro__text').first().should('contain', expectedChannelInfo);
        cy.get('#channelIntro .profile-icon').should('have.length', '2');
        cy.location().then((loc) => {
            const channelId = loc.pathname.split('/').slice(-1)[0];
            cy.get(`#sidebarItem_${channelId}`).should('contain', `${sortedParticipants[0].username}, ${sortedParticipants[1].username}`);
            cy.get(`#sidebarItem_${channelId} .status`).eq(0).should('contain', '2');
        });
    });
    it('MM-T469 - Post an @mention on a group channel', () => {
        spyNotificationAs('withNotification', 'granted');
        const participants = users.slice(0, 2);
        createGroupMessageWith(participants);
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.getCurrentChannelId().then((channelId) => {
            cy.postMessageAs({sender: participants[0], message: `@${testUser.username} Hello!!!`, channelId});
            cy.wait(TIMEOUTS.HALF_SEC);
            cy.get('@withNotification').should('have.been.called');
        });
    });
    it('MM-T475 - Channel preferences, mute channel', () => {
        spyNotificationAs('withNotification', 'granted');
        const participants = users.slice(0, 2);
        createGroupMessageWith(participants);
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.uiOpenChannelMenu().within(() => {
            cy.get('#markUnreadEdit').click();
            cy.get('#channelNotificationUnmute').click();
            cy.get('#saveSetting').click();
            cy.get('#toggleMute').should('be.visible');
        });
        cy.getCurrentChannelId().then((channelId) => {
            let channelName;
            cy.location().then((loc) => {
                channelName = loc.pathname.split('/').slice(-1)[0];
            });
            cy.postMessageAs({sender: participants[0], message: 'Hello all', channelId}).then(() => {
                cy.visit(townsquareLink);
                cy.get('@withNotification').should('not.have.been.called');
                cy.get(`#sidebarItem_${channelName}`).
                    scrollIntoView().
                    find('#unreadMentions').
                    should('not.exist');
            });
            cy.postMessageAs({sender: participants[0], message: `@${testUser.username} Hello!!!`, channelId}).then(() => {
                cy.apiLogin(testUser);
                cy.visit(townsquareLink);
                cy.get('@withNotification').should('not.have.been.called');
                cy.get(`#sidebarItem_${channelName}`).
                    scrollIntoView().
                    get('#unreadMentions').
                    should('exist');
            });
        });
    });
    it('MM-T478 - Open existing group message from More... section', () => {
        const participants = users.slice(0, 2);
        const sortedParticipants = participants.sort((a, b) => {
            return a.username > b.username ? 1 : -1;
        });
        createGroupMessageWith(participants);
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.location().then((loc) => {
            const channelName = loc.pathname.split('/').slice(-1)[0];
            cy.uiGetChannelSidebarMenu(channelName).within(() => {
                cy.findByText('Close Conversation').click();
            });
            cy.uiAddDirectMessage().click().wait(TIMEOUTS.HALF_SEC);
            cy.get('#selectItems input').typeWithForce(participants[0].username).wait(TIMEOUTS.HALF_SEC);
            cy.get('#multiSelectList .suggestion-list__item').last().click().wait(TIMEOUTS.HALF_SEC);
            cy.get('#selectItems').should('contain', `${sortedParticipants[0].username}${sortedParticipants[1].username}`);
            cy.get('#saveItems').click().wait(TIMEOUTS.HALF_SEC);
            cy.get('#channelHeaderTitle').should('contain', `${sortedParticipants[0].username}, ${sortedParticipants[1].username}`);
        });
    });
});
const createGroupMessageWith = (users) => {
    const defaultUserLimit = 7;
    cy.uiAddDirectMessage().click().wait(TIMEOUTS.HALF_SEC);
    cy.get('#multiSelectHelpMemberInfo').should('contain', 'You can add 7 more people');
    users.forEach((user, index) => {
        cy.get('#selectItems input').typeWithForce(user.username).type('{enter}').wait(TIMEOUTS.HALF_SEC);
        cy.get('#multiSelectHelpMemberInfo').should('contain', `You can add ${defaultUserLimit - (index + 1)} more people`);
    });
    cy.get('#saveItems').click().wait(TIMEOUTS.HALF_SEC);
};