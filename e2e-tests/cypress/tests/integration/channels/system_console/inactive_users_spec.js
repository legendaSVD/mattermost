const perPage = 50;
describe('System Console', () => {
    it('SC18512 List pages of inactive users', () => {
        cy.visit('/admin_console/user_management/users');
        cy.get('div.systemUsersFilterContainer button').click();
        cy.get('#DropdownInput_filterStatus').click();
        cy.get('#react-select-5-option-2').click();
        cy.apiGetAnalytics().then(({analytics}) => {
            const inactiveUsers = analytics.filter((d) => {
                return d.name === 'inactive_user_count';
            }).reduce((_, item) => {
                return item.value;
            }, 0);
            const pages = Math.floor(inactiveUsers / perPage);
            const remainder = inactiveUsers % perPage;
            Cypress._.forEach(Array(pages), (_, index) => {
                if (pages === index) {
                    cy.findAllByTestId('userListRow').should('have.length', remainder);
                    cy.get('#searchableUserListNextBtn').should('not.exist');
                } else {
                    cy.findAllByTestId('userListRow').should('have.length', perPage);
                    cy.get('#searchableUserListNextBtn').should('be.visible').click();
                }
            });
        });
    });
});