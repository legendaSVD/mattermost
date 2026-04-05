import * as TIMEOUTS from '../../../../fixtures/timeouts';
const saveAndNavigateBackTo = (name, displayName, page) => {
    cy.get('#saveSetting').should('be.enabled').click().wait(TIMEOUTS.HALF_SEC);
    cy.url().should('include', `/admin_console/user_management/${page}`).wait(TIMEOUTS.TWO_SEC);
    cy.get('.DataGrid_searchBar').within(() => {
        cy.findByPlaceholderText('Search').should('be.visible').type(`${displayName}{enter}`).wait(TIMEOUTS.HALF_SEC);
    });
    cy.findByTestId(`${name}edit`).should('be.visible').click();
};
const changeRole = (type, fromRole, toRole) => {
    cy.get(`#${type}Members`).scrollIntoView().within(() => {
        cy.get('.UserGrid_nameRow').should('be.visible');
    });
    cy.get(`#${type}_groups`).scrollIntoView().findByTestId('current-role').should('have.text', fromRole).click();
    cy.get('#role-to-be-menu').then((el) => {
        expect(el[0].firstElementChild.children.length).equal(1);
        cy.wrap(el).findByText(toRole).click().wait(TIMEOUTS.HALF_SEC);
    });
};
describe('System Console', () => {
    const groupDisplayName = 'board';
    let testTeam;
    let teamName;
    let teamDisplayName;
    let channelName;
    let channelDisplayName;
    before(() => {
        cy.apiRequireLicenseForFeature('LDAPGroups');
        cy.apiInitSetup({
            teamPrefix: {name: 'a-team', displayName: 'A Team'},
            channelPrefix: {name: 'a-channel', displayName: 'A Channel'},
        }).then(({team, channel}) => {
            testTeam = team;
            teamName = team.display_name;
            teamDisplayName = team.display_name;
            channelName = channel.name;
            channelDisplayName = channel.display_name;
            cy.apiGetLDAPGroups().then((res) => {
                res.body.groups.forEach((group) => {
                    if (group.name === groupDisplayName) {
                        cy.apiAddLDAPGroupLink(group.primary_key);
                    }
                });
            });
        });
    });
    beforeEach(() => {
        cy.apiGetTeamGroups(testTeam.id).then((resGroups) => {
            resGroups.body.groups.forEach((group) => {
                if (group.display_name === groupDisplayName) {
                    cy.apiDeleteLinkFromTeamToGroup(group.id, testTeam.id);
                }
            });
        });
    });
    it('MM-20059 - System Admin can map roles to groups from Team Configuration screen', () => {
        cy.visit('/admin_console/user_management/teams');
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').should('be.visible').type(`${teamDisplayName}{enter}`);
        });
        cy.findByTestId(`${teamName}edit`).click();
        cy.findByTestId('addGroupsToTeamToggle').scrollIntoView().click();
        cy.get('#multiSelectList').should('be.visible');
        cy.get('#multiSelectList>div').children().eq(0).click();
        cy.get('#saveItems').click();
        changeRole('team', 'Member', 'Team Admin');
        saveAndNavigateBackTo(teamName, teamDisplayName, 'teams');
        changeRole('team', 'Team Admin', 'Member');
        saveAndNavigateBackTo(teamName, teamDisplayName, 'teams');
        cy.get('#team_groups').scrollIntoView().findByTestId('current-role').should('have.text', 'Member');
        cy.waitUntil(() => cy.get('.group-row').eq(0).scrollIntoView().find('.group-name').then((el) => {
            return el[0].innerText === groupDisplayName;
        }), {
            errorMsg: `${groupDisplayName} group didn't show up in time`,
            timeout: TIMEOUTS.TEN_SEC,
        });
        cy.get('.group-row').eq(0).scrollIntoView().should('be.visible').within(() => {
            cy.get('.group-name').should('have.text', groupDisplayName);
            cy.get('.group-actions > a').should('have.text', 'Remove').click();
        });
        cy.get('#groups-list--body').should('be.visible').contains('No groups specified yet');
        saveAndNavigateBackTo(teamName, teamDisplayName, 'teams');
        cy.get('#groups-list--body').scrollIntoView().should('be.visible').contains('No groups specified yet');
    });
    it('MM-21789 - Add a group and change the role and then save and ensure the role was updated on team configuration page', () => {
        cy.visit('/admin_console/user_management/teams');
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').should('be.visible').type(`${teamDisplayName}{enter}`);
        });
        cy.findByTestId(`${teamName}edit`).click();
        cy.findByTestId('addGroupsToTeamToggle').click();
        cy.get('#multiSelectList').should('be.visible');
        cy.get('#multiSelectList>div').children().eq(0).click();
        cy.get('#saveItems').click();
        changeRole('team', 'Member', 'Team Admin');
        saveAndNavigateBackTo(teamName, teamDisplayName, 'teams');
        cy.get('#team_groups').scrollIntoView().findByTestId('current-role').should('have.text', 'Team Admin');
    });
    it('MM-20646 - System Admin can map roles to groups from Channel Configuration screen', () => {
        cy.visit('/admin_console/user_management/channels');
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').should('be.visible').type(`${channelDisplayName}{enter}`);
        });
        cy.findByTestId(`${channelName}edit`).click();
        cy.get('#addGroupsToChannelToggle').click();
        cy.get('#multiSelectList').should('be.visible');
        cy.get('#multiSelectList>div').children().eq(0).click();
        cy.get('#saveItems').click();
        changeRole('channel', 'Member', 'Channel Admin');
        saveAndNavigateBackTo(channelName, channelDisplayName, 'channels');
        changeRole('channel', 'Channel Admin', 'Member');
        saveAndNavigateBackTo(channelName, channelDisplayName, 'channels');
        cy.get('#channel_groups').scrollIntoView().findByTestId('current-role').should('have.text', 'Member');
    });
    it('MM-21789 - Add a group and change the role and then save and ensure the role was updated on channel configuration page', () => {
        cy.visit('/admin_console/user_management/channels');
        cy.get('.DataGrid_searchBar').within(() => {
            cy.findByPlaceholderText('Search').should('be.visible').type(`${channelDisplayName}{enter}`);
        });
        cy.findByTestId(`${channelName}edit`).click();
        cy.get('#addGroupsToChannelToggle').click();
        cy.get('#multiSelectList').should('be.visible');
        cy.get('#multiSelectList>div').children().eq(0).click();
        cy.get('#saveItems').click();
        changeRole('channel', 'Member', 'Channel Admin');
        saveAndNavigateBackTo(channelName, channelDisplayName, 'channels');
        cy.get('#channel_groups').scrollIntoView().findByTestId('current-role').should('have.text', 'Channel Admin');
    });
});