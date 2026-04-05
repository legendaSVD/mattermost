describe('Feedback modal', () => {
    beforeEach(() => {
        cy.apiLogout();
        cy.apiAdminLogin();
    });
    it('Should display feedback modal when downgrading to cloud free', () => {
        const subscription = {
            id: 'sub_test1',
            product_id: 'prod_2',
            is_free_trial: 'false',
        };
        cy.simulateSubscription(subscription);
        cy.intercept('**/api/v4/usage/teams', {statusCode: 200, body: {active: 1, cloud_archived: 0}}).as('teams');
        cy.visit('/admin_console/billing/subscription?action=show_pricing_modal');
        cy.wait('@teams');
        cy.get('#pricingModal').should('exist');
        cy.get('#free_action').contains('Downgrade').should('exist').should('be.enabled').click();
        cy.findByText('Please share your reason for downgrading').should('exist');
        cy.get('.GenericModal__button.confirm').contains('Downgrade').should('exist').should('be.disabled');
        cy.findByTestId('Exploring other solutions').click();
        cy.get('.GenericModal__button.confirm').contains('Downgrade').should('exist').should('be.enabled').click();
        cy.findByText('Downgrading your workspace').should('exist');
    });
    it('Downgrade Feedback modal submit button should be disabled if no option is selected', () => {
        const subscription = {
            id: 'sub_test1',
            product_id: 'prod_2',
            is_free_trial: 'false',
        };
        cy.simulateSubscription(subscription);
        cy.intercept('**/api/v4/usage/teams', {statusCode: 200, body: {active: 1, cloud_archived: 0}}).as('teams');
        cy.visit('/admin_console/billing/subscription?action=show_pricing_modal');
        cy.wait('@teams');
        cy.get('#pricingModal').should('exist');
        cy.get('#free_action').contains('Downgrade').should('exist').should('be.enabled').click();
        cy.findByText('Please share your reason for downgrading').should('exist');
        cy.get('.GenericModal__button.confirm').contains('Downgrade').should('exist').should('be.disabled');
    });
    it('Downgrade Feedback modal shows error state when "other" option is selected but not comments have been provided', () => {
        const subscription = {
            id: 'sub_test1',
            product_id: 'prod_2',
            is_free_trial: 'false',
        };
        cy.simulateSubscription(subscription);
        cy.intercept('**/api/v4/usage/teams', {statusCode: 200, body: {active: 1, cloud_archived: 0}}).as('teams');
        cy.visit('/admin_console/billing/subscription?action=show_pricing_modal');
        cy.wait('@teams');
        cy.get('#pricingModal').should('exist');
        cy.get('#free_action').contains('Downgrade').should('exist').should('be.enabled').click();
        cy.findByText('Please share your reason for downgrading').should('exist');
        cy.get('.GenericModal__button.confirm').contains('Downgrade').should('exist').should('be.disabled');
        cy.get('input[value="Other"]').click();
        cy.findByTestId('FeedbackModal__TextInput').type('Do not need it anymore.');
        cy.get('.GenericModal__button.confirm').contains('Downgrade').should('exist').should('be.enabled').click();
    });
    it('Downgrade Feedback modal appears and downgrades after team selection modal is submitted', () => {
        const subscription = {
            id: 'sub_test1',
            product_id: 'prod_2',
            is_free_trial: 'false',
        };
        cy.simulateSubscription(subscription);
        cy.intercept('**/api/v4/usage/teams', {statusCode: 200, body: {active: 2, cloud_archived: 0}}).as('teams');
        cy.visit('/admin_console/billing/subscription?action=show_pricing_modal');
        cy.wait('@teams');
        cy.get('#pricingModal').should('exist');
        cy.get('#free_action').contains('Downgrade').should('exist').should('be.enabled').click();
        cy.findByText('Confirm Plan Downgrade').should('exist');
        cy.get('input[name="deleteTeamRadioGroup"]').first().click();
        cy.get('.DowngradeTeamRemovalModal__buttons > .btn-primary').should('exist').should('be.enabled').click();
        cy.findByText('Please share your reason for downgrading').should('exist');
        cy.get('.GenericModal__button.confirm').contains('Downgrade').should('exist').should('be.disabled');
        cy.get('input[value="Other"]').click();
        cy.findByTestId('FeedbackModal__TextInput').type('Do not need it anymore.');
        cy.get('.GenericModal__button.confirm').contains('Downgrade').should('exist').should('be.enabled').click();
    });
});