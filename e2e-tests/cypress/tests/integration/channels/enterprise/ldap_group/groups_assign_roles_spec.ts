import * as TIMEOUTS from '../../../../fixtures/timeouts';
const getTeamsAssociatedToGroupAndUnlink = (groupId) => {
    cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/groups/${groupId}/teams`,
        method: 'GET',
    }).then((response) => {
        expect(response.status).to.equal(200);
        response.body.forEach((element) => {
            cy.request({
                headers: {'X-Requested-With': 'XMLHttpRequest'},
                url: `/api/v4/groups/${element.group_id}/teams/${element.team_id}/link`,
                method: 'DELETE',
            });
        });
    });
};
const getChannelsAssociatedToGroupAndUnlink = (groupId) => {
    cy.request({
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        url: `/api/v4/groups/${groupId}/channels`,
        method: 'GET',
    }).then((response) => {
        expect(response.status).to.equal(200);
        response.body.forEach((element) => {
            cy.request({
                headers: {'X-Requested-With': 'XMLHttpRequest'},
                url: `/api/v4/groups/${element.group_id}/channels/${element.channel_id}/link`,
                method: 'DELETE',
            });
        });
    });
};
describe('LDAP Group Sync', () => {
    before(() => {
        cy.apiRequireLicenseForFeature('LDAPGroups');
        cy.apiUpdateConfig({LdapSettings: {Enable: true}});
        cy.apiLDAPTest();
        cy.apiLDAPSync();
    });
    it('MM-T2668 Team admin role can be set and saved', () => {
        cy.visit('/admin_console/user_management/groups');
        cy.get('#developers_group').then((el) => {
            if (el.text().includes('Edit')) {
                cy.get('#developers_edit').then((buttonEl) => {
                    const anchorElement = buttonEl[0] as HTMLAnchorElement;
                    const groupId = anchorElement.href.match(/\/(?:.(?!\/))+$/)[0].substring(1);
                    getTeamsAssociatedToGroupAndUnlink(groupId);
                    getChannelsAssociatedToGroupAndUnlink(groupId);
                    cy.get('#developers_edit').click();
                });
            } else {
                if (el.find('.icon.fa-unlink').length > 0) {
                    el.find('.icon.fa-unlink').click();
                }
                cy.get('#developers_configure').then((buttonEl) => {
                    const anchorElement = buttonEl[0] as HTMLAnchorElement;
                    const groupId = anchorElement.href.match(/\/(?:.(?!\/))+$/)[0].substring(1);
                    getTeamsAssociatedToGroupAndUnlink(groupId);
                    getChannelsAssociatedToGroupAndUnlink(groupId);
                    cy.get('#developers_configure').click();
                });
            }
        });
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#add_team_or_channel').click();
        cy.get('#add_team').click();
        cy.get('#multiSelectList').should('be.visible').children().first().click({force: true});
        cy.uiGetButton('Add').click();
        cy.get('#add_team_or_channel').click();
        cy.get('#add_channel').click();
        cy.get('#multiSelectList').children().first().click();
        cy.uiGetButton('Add').click();
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#team_and_channel_membership_table').then((el) => {
            const table = el[0] as HTMLTableElement;
            const name = table.rows[1].cells[0].innerText;
            cy.findByTestId(`${name}_current_role`).scrollIntoView().should('contain.text', 'Member');
            cy.findByTestId(`${name}_current_role`).scrollIntoView().click();
            cy.get(`#${name}_change_role_options button`).scrollIntoView().click();
            cy.findByTestId(`${name}_current_role`).scrollIntoView().should('not.contain.text', 'Member');
        });
    });
});