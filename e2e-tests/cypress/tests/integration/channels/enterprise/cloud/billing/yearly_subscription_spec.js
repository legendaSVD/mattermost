import billing from '../../../../../fixtures/client_billing.json';
function simulateSubscription() {
    cy.intercept('GET', '**/api/v4/cloud/subscription', {
        statusCode: 200,
        body: {
            id: 'sub_test1',
            is_free_trial: 'true',
            customer_id: '5zqhakmibpgyix9juiwwkpfnmr',
            product_id: 'prod_LSBESgGXq9KlLj',
            seats: 25,
            status: 'active',
        },
    });
    cy.intercept('GET', '**/api/v4/cloud/products**', {
        statusCode: 200,
        body:
        [
            {
                id: 'prod_LSBESgGXq9KlLj',
                sku: 'cloud-starter',
                price_per_seat: 0,
                name: 'Cloud Free',
                recurring_interval: 'month',
                cross_sells_to: '',
            },
            {
                id: 'prod_K0AxuWCDoDD9Qq',
                sku: 'cloud-professional',
                price_per_seat: 10,
                name: 'Cloud Professional',
                recurring_interval: 'month',
                cross_sells_to: 'prod_MYrZ0xObCXOyVr',
            },
            {
                id: 'prod_Jh6tBLcgWWOOog',
                sku: 'cloud-enterprise',
                price_per_seat: 30,
                name: 'Cloud Enterprise',
                recurring_interval: 'month',
                cross_sells_to: '',
            },
            {
                id: 'prod_MYrZ0xObCXOyVr',
                sku: 'cloud-professional',
                price_per_seat: 96,
                recurring_interval: 'year',
                name: 'Cloud Professional Yearly',
                cross_sells_to: 'prod_K0AxuWCDoDD9Qq',
            },
        ],
    });
}
describe('System Console - Subscriptions section', () => {
    before(() => {
        cy.apiRequireLicenseForFeature('Cloud');
    });
    beforeEach(() => {
        simulateSubscription();
        cy.visit('/admin_console/billing/subscription');
    });
    it('MM-T5128 Updating the Usercount input field updates the prices accordingly in the Purchase modal', () => {
        const professionalYearlySubscription = {
            id: 'prod_MYrZ0xObCXOyVr',
            sku: 'cloud-professional',
            price_per_seat: 8,
            recurring_interval: 'year',
            name: 'Cloud Professional Yearly',
            cross_sells_to: 'prod_K0AxuWCDoDD9Qq',
        };
        cy.request('/api/v4/analytics/old?name=standard&team_id=').then((response) => {
            cy.get('.PlanDetails__userCount > span').invoke('text').then((text) => {
                const userCount = response.body.find((obj) => obj.name === 'unique_user_count');
                expect(text).to.contain(userCount.value);
                const count = Number(userCount.value);
                const numMonths = 12;
                const checkValues = (currentCount) => {
                    const totalVal = currentCount * professionalYearlySubscription.price_per_seat * numMonths;
                    cy.get('.RHS').get('.SeatsCalculator__total-value').then((elem) => {
                        const txt = elem.text();
                        const totalValText = txt.replace('$', '').replaceAll(',', '');
                        expect(totalVal.toString()).to.equal(totalValText);
                    });
                };
                cy.contains('span', 'Upgrade Now').parent().click();
                cy.get('#professional_action').click();
                cy.findByText('Provide your payment details').should('be.visible');
                cy.get('.RHS').get('.plan_price_rate_section').contains(professionalYearlySubscription.price_per_seat);
                cy.get('.RHS').get('#input_UserSeats').should('have.value', count);
                checkValues(count);
                cy.uiGetPaymentCardInput().within(() => {
                    cy.get('[name="cardnumber"]').should('be.enabled').clear().type(billing.visa.cardNumber);
                    cy.get('[name="exp-date"]').should('be.enabled').clear().type(billing.visa.expDate);
                    cy.get('[name="cvc"]').should('be.enabled').clear().type(billing.visa.cvc);
                });
                cy.get('#input_name').clear().type('test name');
                cy.findByText('Country').parent().find('.icon-chevron-down').click();
                cy.findByText('Country').parent().find("input[type='text']").type('India{enter}', {force: true});
                cy.get('#input_address').type('test1');
                cy.get('#input_address2').type('test2');
                cy.get('#input_city').clear().type('testcity');
                cy.get('#input_state').type('test');
                cy.get('#input_postalCode').type('444');
                cy.get('.RHS').find('button').should('be.enabled');
                const lessThanUserCount = 1;
                cy.get('#input_UserSeats').clear().type(lessThanUserCount);
                checkValues(lessThanUserCount);
                cy.get('.RHS').get('.Input___customMessage').contains(`Your workspace currently has ${count} users`);
                cy.get('.RHS').find('button').should('be.disabled');
                const greaterThanUserCount = count + 5;
                cy.get('#input_UserSeats').clear().type(greaterThanUserCount);
                checkValues(greaterThanUserCount);
                cy.get('.RHS').find('button').should('be.enabled');
            });
        });
    });
});