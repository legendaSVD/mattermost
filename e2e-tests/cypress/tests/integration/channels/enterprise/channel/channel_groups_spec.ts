import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('channel groups', () => {
    const groups = [];
    let testTeam;
    before(() => {
        cy.apiRequireLicenseForFeature('LDAP');
        cy.apiGetLDAPGroups().then((result) => {
            for (let i = 0; i < 2; i++) {
                cy.apiLinkGroup(result.body.groups[i].primary_key).then((response) => {
                    groups.push(response.body);
                });
            }
        });
        cy.apiUpdateConfig({LdapSettings: {Enable: true}, ServiceSettings: {EnableTutorial: false}});
        cy.apiCreateTeam('team', 'Team').then(({team}) => {
            testTeam = team;
            cy.apiLinkGroupTeam(groups[0].id, team.id);
            cy.apiGetChannelByName(testTeam.name, 'off-topic').then(({channel}) => {
                cy.apiPatchChannel(channel.id, {group_constrained: true});
            });
        });
    });
    after(() => {
        cy.apiDeleteTeam(testTeam.id, true);
        for (let i = 0; i < 2; i++) {
            cy.apiUnlinkGroup(groups[i].remote_id);
        }
    });
    it.skip('limits the listed groups if the parent team is group-constrained', () => {
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        openAddGroupsToChannelModal();
        let beforeCount;
        cy.get('#addGroupsToChannelModal').find('.more-modal__row').then((items) => {
            beforeCount = Cypress.$(items).length;
        });
        cy.get('#addGroupsToChannelModal').find('.more-modal__row').its('length').should('be.gte', 2);
        cy.apiPatchTeam(testTeam.id, {group_constrained: true});
        cy.visit(`/${testTeam.name}/channels/off-topic`);
        openAddGroupsToChannelModal();
        cy.get('#addGroupsToChannelModal').find('.more-modal__row').then((items) => {
            const newCount = beforeCount - 1;
            expect(items).to.have.length(newCount);
        });
    });
});
function openAddGroupsToChannelModal() {
    cy.get('#channelHeaderTitle', {timeout: TIMEOUTS.ONE_MIN}).click();
    cy.get('#channelManageGroups').should('be.visible');
    cy.get('#channelManageGroups').click();
    cy.findByText('Add Groups').should('exist');
    cy.findByText('Add Groups').click();
    cy.get('#addGroupsToChannelModal').should('be.visible');
}