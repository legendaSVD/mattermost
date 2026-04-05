import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Team Scheme', () => {
    let testTeam;
    const schemeName = 'Test Team Scheme';
    before(() => {
        cy.apiRequireLicense();
        cy.apiCreateTeam('team-scheme-test', 'Scheme Test').then(({team}) => {
            testTeam = team;
        });
        deleteExistingTeamOverrideSchemes();
    });
    beforeEach(() => {
        cy.visit('/admin_console/user_management/permissions');
    });
    it('MM-T2855 Create a Team Override Scheme', () => {
        cy.findByTestId('team-override-schemes-link').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#scheme-name').should('be.visible').type(schemeName);
        cy.get('#scheme-description').type('Description');
        cy.findByTestId('add-teams').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#selectItems input').typeWithForce(testTeam.display_name).wait(TIMEOUTS.HALF_SEC);
        cy.get('#multiSelectList div.more-modal__row.clickable').eq(0).click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#saveItems').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        const checkId = 'all_users-public_channel-create_public_channel-checkbox';
        cy.findByTestId(checkId).click();
        cy.get('#saveSetting').click().wait(TIMEOUTS.TWO_SEC);
        cy.url().should('include', '/admin_console/user_management/permissions');
        cy.findByTestId('permissions-scheme-summary').within(() => {
            cy.get('.permissions-scheme-summary--header').should('include.text', schemeName);
            cy.get('.permissions-scheme-summary--teams').should('include.text', testTeam.display_name);
        });
        cy.findByTestId(schemeName + '-edit').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByTestId(checkId).should('not.have.class', 'checked');
    });
    it('MM-T2857 Delete Scheme', () => {
        cy.findByTestId(schemeName + '-delete').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#cancelModalButton').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByTestId('permissions-scheme-summary').within(() => {
            cy.get('.permissions-scheme-summary--header').should('include.text', schemeName);
            cy.get('.permissions-scheme-summary--teams').should('include.text', testTeam.display_name);
        });
        cy.findByTestId(schemeName + '-delete').click().wait(TIMEOUTS.HALF_SEC);
        cy.get('#confirmModalButton').should('be.visible').click().wait(TIMEOUTS.HALF_SEC);
        cy.findByTestId('permissions-scheme-summary').should('not.exist');
    });
});
const deleteExistingTeamOverrideSchemes = () => {
    cy.apiGetSchemes('team').then(({schemes}) => {
        schemes.forEach((scheme) => {
            cy.apiDeleteScheme(scheme.id);
        });
    });
};