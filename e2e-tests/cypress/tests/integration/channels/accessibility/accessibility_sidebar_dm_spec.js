import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Verify Accessibility Support in Channel Sidebar Navigation', () => {
    let testUser;
    let testTeam;
    let testChannel;
    let offTopicUrl;
    before(() => {
        let otherUser;
        let otherChannel;
        cy.apiInitSetup({promoteNewUserAsAdmin: true}).then(({team, channel, user, offTopicUrl: url}) => {
            testUser = user;
            testTeam = team;
            testChannel = channel;
            offTopicUrl = url;
            cy.apiCreateUser().then(({user: regularUser}) => {
                cy.apiAddUserToTeam(testTeam.id, regularUser.id);
            });
            return cy.apiCreateChannel(testTeam.id, 'test', 'Test');
        }).then(({channel}) => {
            otherChannel = channel;
            return cy.apiAddUserToChannel(otherChannel.id, testUser.id);
        }).then(() => {
            return cy.apiCreateUser({prefix: 'other'});
        }).then(({user}) => {
            otherUser = user;
            return cy.apiAddUserToTeam(testTeam.id, otherUser.id);
        }).then(() => {
            return cy.apiAddUserToChannel(testChannel.id, otherUser.id);
        }).then(() => {
            return cy.apiAddUserToChannel(otherChannel.id, otherUser.id);
        }).then(() => {
            for (let index = 0; index < 5; index++) {
                cy.postMessageAs({sender: otherUser, message: 'This is an old message', channelId: otherChannel.id});
            }
            cy.apiLogin(testUser);
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T1472 Verify Tab Support in Direct Messages section', () => {
        const usersPrefixes = ['a', 'c', 'd'];
        usersPrefixes.forEach((prefix) => {
            cy.apiCreateUser({prefix}).then(({user: newUser}) => {
                cy.apiCreateDirectChannel([testUser.id, newUser.id]).then(({channel}) => {
                    cy.postMessageAs({sender: newUser, message: 'test', channelId: channel.id});
                });
            });
        });
        cy.uiAddDirectMessage().click();
        searchAndSelectUser('user');
        searchAndSelectUser('user');
        cy.uiGetButton('Go').click();
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.uiAddDirectMessage().
            tab({shift: true}).tab().
            should('be.focused').
            tab({shift: true}).tab({shift: true});
        cy.focused().parent().parent().next().find('.SidebarChannel').each((el, i) => {
            if (i === 0) {
                cy.focused().findByText('DIRECT MESSAGES');
                cy.focused().tab().tab().tab();
            }
            cy.wrap(el).find('.SidebarLink').should('be.focused');
            cy.focused().tab().tab().tab();
        });
    });
});
function searchAndSelectUser(text) {
    cy.findByRole('textbox', {name: 'Search for people'}).
        typeWithForce(text).
        wait(TIMEOUTS.ONE_SEC);
    cy.get('.more-modal__row.clickable').
        first().
        click();
}