import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Multi-user group messages', () => {
    let testUser;
    let testTeam;
    const userIds = [];
    const userList = [];
    let groupChannel;
    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            ['0aadam', '0aabadam', 'beatrice'].forEach((prefix) => {
                createTestUser(prefix, team);
            });
            ['charlie', 'diana', 'eddie'].forEach((name) => {
                cy.apiCreateUser({prefix: name, bypassTutorial: true}).then(({user: groupUser}) => {
                    cy.apiAddUserToTeam(testTeam.id, groupUser.id);
                    userIds.push(groupUser.id);
                    userList.push(groupUser);
                });
            });
            userIds.push(testUser.id);
            cy.apiCreateGroupChannel(userIds).then(({channel}) => {
                groupChannel = channel;
            });
        });
    });
    it('MM-T459 Group Messaging: Add first user', () => {
        const searchTerm = '0aa';
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.contains('#channelHeaderTitle', 'Town Square');
        cy.uiAddDirectMessage().click().wait(TIMEOUTS.ONE_SEC);
        cy.findByRole('dialog', {name: 'Direct Messages'}).should('be.visible').wait(TIMEOUTS.ONE_SEC);
        cy.findByRole('combobox', {name: 'Search for people'}).
            typeWithForce(searchTerm).
            wait(TIMEOUTS.ONE_SEC);
        expectUserListSortedAlphabetically(searchTerm);
        cy.get('body').
            type('{downarrow}').
            type('{enter}');
        cy.get('.react-select__multi-value').
            should('be.visible').
            and('have.length', 1).
            then(($selectedUser) => {
                const selectedUserName = $selectedUser.text();
                expectUserListSortedAlphabetically(selectedUserName, true);
            });
        cy.get('.react-select__multi-value__remove').
            should('be.visible').
            and('have.length', 1);
        cy.get('.react-select__multi-value').next().find('input').should('have.focus');
        cy.get('#selectItems input').should('have.text', '');
        cy.get('#multiSelectHelpMemberInfo').
            should('be.visible').
            and('contain.text', 'You can add 6 more people');
    });
    it('MM-T468 Group Messaging: Add member to existing GM', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/${groupChannel.name}`);
        cy.postMessage('some');
        cy.postMessage('historical');
        cy.postMessage('messages');
        cy.uiOpenChannelMenu('Members');
        cy.uiGetButton('Add').click();
        cy.get('#moreDmModal').should('be.visible');
        const warnMessage = 'This will start a new conversation. If you\'re adding a lot of people, consider creating a private channel instead.';
        cy.contains(warnMessage).should('be.visible');
        userList.forEach((user) => {
            cy.get('.react-select__multi-value div').should('contain', user.username);
        });
        cy.get('#selectItems input').typeWithForce('beatrice');
        cy.get('.loading-screen').should('not.exist');
        cy.contains('#multiSelectList .clickable', 'beatrice').should('be.visible');
        cy.get('#selectItems input').typeWithForce('{enter}');
        cy.get('button#saveItems').click({force: true});
        cy.get('#moreDmModal').should('not.exist');
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.contains('.post-message__text', 'historical').should('not.exist');
        cy.contains('p.channel-intro__text', 'This is the start of your group message history with');
        cy.uiGetRHS().contains(testUser.username).should('be.visible');
        userList.forEach((user) => {
            cy.uiGetRHS().contains(user.username).scrollIntoView().should('be.visible');
        });
    });
});
const expectUserListSortedAlphabetically = (filterString, excludeFilter = false) => {
    return cy.get('#multiSelectList').
        should('be.visible').
        children().
        each(($child) => {
            const currentChildText = $child.find('[id*="displayedUserName"]').text();
            const immediateNextSibling = $child.next();
            if (immediateNextSibling.length) {
                const siblingText = immediateNextSibling.find('[id*="displayedUserName"]').text();
                const stringComparison = currentChildText.localeCompare(siblingText, 'en');
                expect(stringComparison, `${currentChildText} should be before ${siblingText}`).to.be.lte(0);
            }
            if (excludeFilter) {
                expect(currentChildText).to.not.contain(filterString);
            } else {
                expect(currentChildText).to.contain(filterString);
            }
        });
};
const createTestUser = (prefix, team) => {
    cy.apiCreateUser({prefix}).then(({user}) =>
        cy.apiAddUserToTeam(team.id, user.id),
    );
};