import * as TIMEOUTS from '../../../../fixtures/timeouts';
import * as MESSAGES from '../../../../fixtures/messages';
describe('System Console > User Management > Deactivation', () => {
    let team1;
    let otherAdmin;
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            team1 = team;
        });
        cy.apiCreateCustomAdmin().then(({sysadmin}) => {
            otherAdmin = sysadmin;
        });
    });
    beforeEach(() => {
        cy.apiLogin(otherAdmin);
        cy.visit(`/${team1.name}`);
    });
    it('MM-T946 GM: User deactivated in System Console still displays', () => {
        cy.apiCreateUser({prefix: 'first'}).then(({user: user1}) => {
            cy.apiCreateUser({prefix: 'second'}).then(({user: user2}) => {
                const message = MESSAGES.SMALL;
                cy.sendDirectMessageToUsers([user1, user2], message);
                cy.uiGetLhsSection('DIRECT MESSAGES').find('.active').should('contain', user1.username + ', ' + user2.username);
                cy.apiDeactivateUser(user1.id);
                cy.uiGetLhsSection('DIRECT MESSAGES').find('.active').should('contain', user1.username + ', ' + user2.username);
                cy.uiSearchPosts(message);
                cy.findAllByTestId('search-item-container').
                    should('be.visible').and('have.length', 1).
                    eq(0).should('contain', message);
            });
        });
    });
    it('MM-T948 DM posts searchable in DM More... and channel switcher DM channel re-openable', () => {
        cy.apiCreateUser({prefix: 'other'}).then(({user: other}) => {
            cy.sendDirectMessageToUser(other, MESSAGES.SMALL);
            cy.get('#channelHeaderTitle').click();
            cy.findByText('Close Direct Message').click();
            cy.apiDeactivateUser(other.id);
            cy.uiOpenFindChannels();
            cy.get('#quickSwitchInput').type(other.username).wait(TIMEOUTS.HALF_SEC);
            cy.get('[data-testid="' + other.username + '"]').contains('Deactivated');
            cy.uiClose();
            cy.uiAddDirectMessage().click().wait(TIMEOUTS.ONE_SEC);
            cy.findByRole('dialog', {name: 'Direct Messages'}).should('be.visible').wait(TIMEOUTS.ONE_SEC);
            cy.findByRole('combobox', {name: 'Search for people'}).
                typeWithForce(other.username).
                wait(TIMEOUTS.ONE_SEC);
            cy.get('#displayedUserName' + other.username).parent().contains('Deactivated');
            cy.get('#displayedUserName' + other.username).click();
            cy.get('#moreDmModal').should('not.exist');
        });
    });
    it('MM-T949 If an active user is selected in DM More... or channel switcher, deactivated users should be shown in the DM more or channel switcher', () => {
        cy.apiCreateUser({prefix: 'first'}).then(({user: user1}) => {
            cy.apiCreateUser({prefix: 'second_'}).then(({user: user2}) => {
                cy.sendDirectMessageToUser(user1, MESSAGES.SMALL);
                cy.sendDirectMessageToUser(user2, MESSAGES.SMALL);
                cy.apiDeactivateUser(user2.id);
                cy.uiAddDirectMessage().click().wait(TIMEOUTS.HALF_SEC);
                cy.findByRole('combobox', {name: 'Search for people'}).
                    typeWithForce(user1.username).
                    wait(TIMEOUTS.ONE_SEC);
                cy.get('#displayedUserName' + user1.username).click();
                cy.get('.more-direct-channels #selectItems input').typeWithForce(user2.username).wait(TIMEOUTS.HALF_SEC);
                cy.get('#displayedUserName' + user2.username).should('be.visible');
            });
        });
    });
});