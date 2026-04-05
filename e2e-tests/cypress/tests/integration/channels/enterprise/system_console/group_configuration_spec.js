import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('group configuration', () => {
    let groupID;
    let testTeam;
    let testChannel;
    before(() => {
        cy.apiRequireLicenseForFeature('LDAP');
        cy.apiInitSetup({teamPrefix: {name: 'aaa-test', displayName: 'AAA Test'}}).then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
        });
    });
    beforeEach(() => {
        cy.apiGetLDAPGroups().then((result) => {
            cy.apiLinkGroup(result.body.groups[0].primary_key).then((linkGroupRes) => {
                groupID = linkGroupRes.body.id;
                cy.apiGetGroupTeams(groupID).then((response) => {
                    response.body.forEach((item) => {
                        cy.apiUnlinkGroupTeam(groupID, item.team_id);
                    });
                });
                cy.apiGetGroupChannels(groupID).then((response) => {
                    response.body.forEach((item) => {
                        cy.apiUnlinkGroupChannel(groupID, item.channel_id);
                    });
                });
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                cy.get('#adminConsoleWrapper', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').
                    find('.admin-console__header').should('have.text', 'Group Configuration');
                verifyNoTeamsOrChannelsIsVisible();
            });
        });
    });
    it("MM-58840 Groups - can't navigate to invalid URL", () => {
        cy.visit('/admin_console/user_management/groups/invalid');
        cy.findByText('AD/LDAP Groups').should('be.visible');
    });
    describe('adding a team', () => {
        it('does not add a team without saving', () => {
            addGroupSyncable('team', () => {
                cy.get('.sidebar-section').first().click();
                cy.get('.discard-changes-modal').should('be.visible');
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                verifyNoTeamsOrChannelsIsVisible();
            });
        });
        it('does add a team when saved', () => {
            addGroupSyncable('team', (teamName) => {
                savePage();
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                teamOrChannelIsPresent(teamName);
                cy.get('.error-message').should('be.empty');
            });
        });
    });
    describe('adding a channel', () => {
        it('shows default channels', () => {
            cy.get('#add_team_or_channel').should('be.visible').click();
            cy.get('.dropdown-menu').find('#add_channel').should('be.visible').click();
            cy.get('#selectItems input').typeWithForce('off-');
            cy.get('.more-modal__details').should('have.length.greaterThan', 1);
            cy.findByText(`(${testTeam.display_name})`).should('exist');
        });
        it('does not add a channel without saving', () => {
            addGroupSyncable('channel', () => {
                cy.get('.sidebar-section').first().click();
                cy.get('.discard-changes-modal').should('be.visible');
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                verifyNoTeamsOrChannelsIsVisible();
            });
        });
        it('does add a channel when saved', () => {
            addGroupSyncable('channel', (channelName) => {
                savePage();
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                teamOrChannelIsPresent(channelName);
                cy.get('.error-message').should('be.empty');
            });
        });
    });
    describe('removing a team', () => {
        it('does not remove a team without saving', () => {
            cy.apiGetTeamsForUser().then(({teams}) => {
                const team = teams[0];
                cy.apiLinkGroupTeam(groupID, team.id);
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                teamOrChannelIsPresent(team.display_name);
                removeAndConfirm(team.display_name);
                cy.get('.sidebar-section').first().click();
                cy.get('.discard-changes-modal').should('be.visible');
                cy.get('#cancelModalButton').click();
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                teamOrChannelIsPresent(team.display_name);
            });
        });
        it('does remove a team when saved', () => {
            cy.apiGetTeamsForUser().then(({teams}) => {
                const team = teams[0];
                cy.apiLinkGroupTeam(groupID, team.id);
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                teamOrChannelIsPresent(team.display_name);
                removeAndConfirm(team.display_name);
                cy.get('.sidebar-section').first().click();
                cy.get('.discard-changes-modal').should('be.visible');
                cy.get('#cancelModalButton').click();
                savePage();
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                verifyNoTeamsOrChannelsIsVisible();
            });
        });
    });
    describe('removing a channel', () => {
        it('does not remove a channel without saving', () => {
            cy.apiLinkGroupChannel(groupID, testChannel.id);
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            teamOrChannelIsPresent(testChannel.display_name);
            cy.findByTestId(`${testChannel.display_name}_groupsyncable_remove`).click();
            cy.get('#confirmModalButton').should('be.visible').click();
            cy.get('.sidebar-section').first().click();
            cy.get('.discard-changes-modal').should('be.visible');
            cy.get('#cancelModalButton').click();
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            teamOrChannelIsPresent(testChannel.display_name);
        });
        it('does remove a channel when saved', () => {
            cy.apiLinkGroupChannel(groupID, testChannel.id);
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            teamOrChannelIsPresent(testChannel.display_name);
            cy.get('.group-teams-and-channels-row', {timeout: TIMEOUTS.ONE_MIN}).not('.has-children').should('have.length', 2);
            cy.findByTestId(`${testChannel.display_name}_groupsyncable_remove`).click();
            cy.get('#confirmModalButton').should('be.visible').click();
            cy.get('.sidebar-section').first().click();
            cy.get('.discard-changes-modal').should('be.visible');
            cy.get('#cancelModalButton').click();
            savePage();
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            cy.get('.group-teams-and-channels-row', {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().should('have.length', 1);
        });
    });
    describe('updating a team role', () => {
        it('updates the role for a new team', () => {
            addGroupSyncable('team', (teamName) => {
                const newRole = 'Team Admin';
                changeRole(teamName, newRole);
                cy.get('.sidebar-section').first().click();
                cy.get('.discard-changes-modal').should('be.visible');
                cy.get('#cancelModalButton').click();
                savePage();
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                verifyNewRoleIsVisible(teamName, newRole);
            });
        });
        it('updates the role for an existing team', () => {
            cy.apiLinkGroupTeam(groupID, testTeam.id);
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            teamOrChannelIsPresent(testTeam.display_name);
            const newRole = 'Team Admin';
            changeRole(testTeam.display_name, newRole);
            cy.get('.sidebar-section').first().click();
            cy.get('.discard-changes-modal').should('be.visible');
            cy.get('#cancelModalButton').click();
            savePage();
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            verifyNewRoleIsVisible(testTeam.display_name, newRole);
        });
        it('does not update the role if not saved', () => {
            cy.apiLinkGroupTeam(groupID, testTeam.id);
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            teamOrChannelIsPresent(testTeam.display_name);
            changeRole(testTeam.display_name, 'Team Admin');
            cy.get('.sidebar-section').first().click();
            cy.get('.discard-changes-modal').should('be.visible');
            cy.get('#cancelModalButton').click();
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            verifyNewRoleIsVisible(testTeam.display_name, 'Member');
        });
        it('does not update the role of a removed team', () => {
            cy.apiLinkGroupTeam(groupID, testTeam.id);
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            teamOrChannelIsPresent(testTeam.display_name);
            changeRole(testTeam.display_name, 'Team Admin');
            removeAndConfirm(testTeam.display_name);
            cy.get('.sidebar-section').first().click();
            cy.get('.discard-changes-modal').should('be.visible');
            cy.get('#cancelModalButton').click();
            savePage();
            cy.apiGetGroupTeam(groupID, testTeam.id).then(({body}) => {
                expect(body.scheme_admin).to.eq(false);
            });
        });
    });
    describe('updating a channel role', () => {
        it('updates the role for a new channel', () => {
            addGroupSyncable('channel', (channelName) => {
                const newRole = 'Channel Admin';
                changeRole(channelName, newRole);
                cy.get('.sidebar-section').first().click();
                cy.get('.discard-changes-modal').should('be.visible');
                cy.get('#cancelModalButton').click();
                savePage();
                cy.visit(`/admin_console/user_management/groups/${groupID}`);
                verifyNewRoleIsVisible(channelName, newRole);
            });
        });
        it('updates the role for an existing channel', () => {
            cy.apiLinkGroupChannel(groupID, testChannel.id);
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            teamOrChannelIsPresent(testChannel.display_name);
            const newRole = 'Channel Admin';
            changeRole(testChannel.display_name, newRole);
            cy.get('.sidebar-section').first().click();
            cy.get('.discard-changes-modal').should('be.visible');
            cy.get('#cancelModalButton').click();
            savePage();
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            verifyNewRoleIsVisible(testChannel.display_name, newRole);
        });
        it('does not update the role if not saved', () => {
            cy.apiLinkGroupChannel(groupID, testChannel.id);
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            teamOrChannelIsPresent(testChannel.display_name);
            changeRole(testChannel.display_name, 'Channel Admin');
            cy.get('.sidebar-section').first().click();
            cy.get('.discard-changes-modal').should('be.visible');
            cy.get('#cancelModalButton').click();
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            verifyNewRoleIsVisible(testChannel.display_name, 'Member');
        });
        it('does not update the role of a removed channel', () => {
            cy.apiLinkGroupChannel(groupID, testChannel.id);
            cy.visit(`/admin_console/user_management/groups/${groupID}`);
            teamOrChannelIsPresent(testChannel.display_name);
            changeRole(testChannel.display_name, 'Channel Admin');
            cy.findByTestId(`${testChannel.display_name}_groupsyncable_remove`).click();
            cy.get('#confirmModalButton').should('be.visible').click();
            cy.get('.sidebar-section').first().click();
            cy.get('.discard-changes-modal').should('be.visible');
            cy.get('#cancelModalButton').click();
            savePage();
            cy.apiGetGroupChannel(groupID, testChannel.id).then(({body}) => {
                expect(body.scheme_admin).to.eq(false);
            });
        });
    });
});
function teamOrChannelIsPresent(name) {
    cy.get('.group-teams-and-channels--body', {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().should('be.visible').within(() => {
        cy.findByText(name).scrollIntoView().should('be.visible');
    });
}
function addGroupSyncable(type, callback) {
    cy.get('#add_team_or_channel', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').click();
    cy.get('.dropdown-menu').find(`#add_${type}`).should('be.visible').click();
    cy.get(`.${type}-selector-modal`).should('be.visible');
    cy.get('#multiSelectList').find('.more-modal__row').find(type === 'channel' ? '.channel-name' : '.title').then(($elements) => {
        const name = $elements[0].innerText;
        cy.get('#multiSelectList').find('.more-modal__row').first().click();
        cy.get('#saveItems').click();
        teamOrChannelIsPresent(name);
        callback(name);
    });
}
function changeRole(teamOrChannel, newRole) {
    cy.findByTestId(`${teamOrChannel}_current_role`, {timeout: TIMEOUTS.ONE_MIN}).click();
    cy.get('.Menu__content').should('be.visible').findByText(newRole).click();
}
function savePage() {
    cy.get('#saveSetting', {timeout: TIMEOUTS.TWO_SEC}).click();
    cy.get('#saveSetting', {timeout: TIMEOUTS.TWO_SEC}).should('be.disabled');
}
function removeAndConfirm(name) {
    cy.findByTestId(`${name}_groupsyncable_remove`, {timeout: TIMEOUTS.ONE_MIN}).click();
    cy.get('#confirmModalButton').should('be.visible').click();
    verifyNoTeamsOrChannelsIsVisible();
}
function verifyNewRoleIsVisible(teamOrChannel, newRole) {
    cy.findByTestId(`${teamOrChannel}_current_role`, {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().should('be.visible').findByText(newRole).should('be.visible');
}
function verifyNoTeamsOrChannelsIsVisible() {
    cy.findByText('No teams or channels specified yet', {timeout: TIMEOUTS.ONE_MIN}).scrollIntoView().should('be.visible');
}