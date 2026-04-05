import {UserProfile} from '@mattermost/types/users';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
function verifyPurchaseModal() {
    cy.contains('Provide your payment details');
    cy.contains('Contact Sales');
    cy.contains('Compare plans');
    cy.contains('Credit Card');
    cy.contains('Billing address');
    cy.contains('Enterprise Edition Subscription Terms');
    cy.contains('You will be billed today.');
}
interface PurchaseForm {
    card: string;
    expires: string;
    cvc: string;
    org: string;
    name: string;
    country: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    agree: boolean;
    seats?: number;
}
const additionalSeatsToPurchase = 10;
const successCardNumber = '4242424242424242';
const failCardNumber = '4000000000000002';
const defaultSuccessForm: PurchaseForm = {
    card: successCardNumber,
    expires: '424',
    cvc: '242',
    org: 'My org',
    name: 'The Cardholder',
    country: 'United States of America',
    address: '123 Main Street',
    city: 'Minneapolis',
    state: 'Minnesota',
    zip: '55423',
    agree: true,
};
const prefilledProvinceCountryRegions = {
    'United States of America': true,
    Canada: true,
};
function changeByPlaceholder(placeholder: string, value: string) {
    cy.findByPlaceholderText(placeholder).type(value);
}
function selectDropdownValue(placeholder: string, value: string) {
    cy.contains(placeholder).click();
    cy.contains(value).click();
}
function fillForm(form: PurchaseForm, currentUsers: Cypress.Chainable<number>) {
    cy.uiGetPaymentCardInput().within(() => {
        cy.get('[name="cardnumber"]').should('be.enabled').clear().type(form.card);
        cy.get('[name="exp-date"]').should('be.enabled').clear().type(form.expires);
        cy.get('[name="cvc"]').should('be.enabled').clear().type(form.cvc);
    });
    changeByPlaceholder('Organization Name', form.org);
    changeByPlaceholder('Name on Card', form.name);
    selectDropdownValue('Country', form.country);
    changeByPlaceholder('Address', form.address);
    changeByPlaceholder('City', form.city);
    if (prefilledProvinceCountryRegions[form.country]) {
        selectDropdownValue('State/Province', form.state);
    } else {
        changeByPlaceholder('State/Province', form.state);
    }
    changeByPlaceholder('Zip/Postal Code', form.zip);
    if (form.agree) {
        cy.get('#self_hosted_purchase_terms').click();
    }
    if (form === defaultSuccessForm) {
        currentUsers.then((userCount) => {
            cy.findByTestId('selfHostedPurchaseSeatsInput').clear().type((userCount + additionalSeatsToPurchase).toString());
        });
    } else if (form.seats) {
        cy.findByTestId('selfHostedPurchaseSeatsInput').clear().type(form.seats.toString());
    }
    if (form === defaultSuccessForm) {
        cy.contains('Upgrade').should('be.enabled');
    }
    return cy.contains('Upgrade');
}
function assertLine(lines: string[], key: string, value: string) {
    const line = lines.find((line) => line.includes(key));
    if (!line) {
        throw new Error('Expected license to show start date line but did not');
    }
    if (!line.includes(value)) {
        throw new Error(`Expected license ${key} of ${value}, but got ${line}`);
    }
}
function getCurrentUsers(): Cypress.Chainable<number> {
    return cy.request('/api/v4/analytics/old?name=standard&team_id=').then((response) => {
        const userCount = response.body.find((row: Cypress.AnalyticsRow) => row.name === 'unique_user_count');
        return userCount.value;
    });
}
describe('Self hosted Purchase', () => {
    let adminUser: UserProfile;
    beforeEach(() => {
        window.localStorage.removeItem('PURCHASE_IN_PROGRESS');
    });
    before(() => {
        cy.apiInitSetup().then(() => {
            cy.apiAdminLogin().then(({user}) => {
                adminUser = user;
                cy.apiDeleteLicense();
                cy.visit('/');
                cy.request({
                    headers: {'X-Requested-With': 'XMLHttpRequest'},
                    url: '/api/v4/hosted_customer/bootstrap',
                    method: 'POST',
                    qs: {
                        reset: true,
                    },
                });
            });
        });
    });
    it('happy path, can purchase a license and have it applied automatically', () => {
        cy.apiAdminLogin();
        cy.apiDeleteLicense();
        cy.intercept('GET', '**/api/v4/hosted_customer/signup_available').as('airGappedCheck');
        cy.intercept('GET', 'https://js.stripe.com/v3').as('stripeCheck');
        cy.intercept('GET', '**/api/v4/cloud/products/selfhosted').as('products');
        cy.get('#UpgradeButton').should('exist').click();
        cy.wait('@airGappedCheck');
        cy.wait('@stripeCheck');
        cy.wait(50);
        cy.get('#professional_action').should('exist').click();
        verifyPurchaseModal();
        fillForm(defaultSuccessForm, getCurrentUsers());
        cy.intercept('POST', '**/api/v4/hosted_customer/customer').as('createCustomer');
        cy.intercept('POST', '**/api/v4/hosted_customer/confirm').as('purchaseLicense');
        cy.contains('Upgrade').click();
        cy.wait('@createCustomer');
        cy.wait('@purchaseLicense', {responseTimeout: TIMEOUTS.TWO_MIN + TIMEOUTS.ONE_HUNDRED_MILLIS});
        cy.contains('Your Professional license has now been applied.');
        cy.contains('Close').click();
        const today = new Date().toLocaleString().split(/\D/).slice(0, 3).join('/');
        const expiresDate = new Date(Date.now() + (366 * 24 * 60 * 60 * 1000)).toLocaleString().split(/\D/).slice(0, 3).join('/');
        const todayPadded = new Date().toLocaleString().split(/\D/).slice(0, 3).map((num) => num.padStart(2, '0')).join('/');
        cy.visit('/admin_console/about/license');
        cy.contains('Edition and License');
        cy.contains('Mattermost Professional');
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.findByTestId('EnterpriseEditionLeftPanel').
            get('.item-element').
            then(($els) => Cypress._.map($els, 'innerText')).
            then((lines) => {
                assertLine(lines, 'START DATE', today);
                assertLine(lines, 'EXPIRES', expiresDate);
                getCurrentUsers().then((userCount) => {
                    assertLine(lines, 'USERS', (userCount + additionalSeatsToPurchase).toString());
                    assertLine(lines, 'ACTIVE USERS', userCount.toString());
                });
                assertLine(lines, 'EDITION', 'Mattermost Professional');
                assertLine(lines, 'ISSUED', today);
                assertLine(lines, 'NAME', adminUser.first_name + ' ' + adminUser.last_name);
                assertLine(lines, 'COMPANY / ORG', defaultSuccessForm.org);
            });
        cy.visit('/admin_console/billing/billing_history');
        cy.contains('Billing History');
        cy.contains(todayPadded);
        cy.contains('Self-Hosted Professional');
        const dollarUSLocale = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 2});
        getCurrentUsers().then((userCount) => {
            cy.contains(`${userCount + additionalSeatsToPurchase} users`);
            cy.wait('@products').then((res) => {
                const product = res.response.body.find((product: Cypress.Product) => product.sku === 'professional');
                const purchaseAmount = dollarUSLocale.format((userCount + additionalSeatsToPurchase) * (product).price_per_seat * 12);
                cy.contains(purchaseAmount);
            });
        });
        cy.contains('Paid');
        cy.get('.BillingHistory__table-invoice >a').then((link) => {
            cy.request({
                url: link.prop('href'),
                encoding: 'binary',
            }).then(
                (response) => {
                    const fileName = 'self-hosted-purchase-invoice';
                    const filePath = Cypress.config('downloadsFolder') + '/' + fileName + '.pdf';
                    cy.writeFile(filePath, response.body, 'binary');
                    cy.task('getPdfContent', filePath).then((data) => {
                        const allLines = (data as {text: string}).text.split('\n');
                        const prodLine = allLines.filter((line) => line.includes('Self-Hosted Professional'));
                        expect(prodLine.length).to.be.equal(1);
                        getCurrentUsers().then((userCount) => {
                            cy.wait('@products').then((res) => {
                                const product = res.response.body.find((product: Cypress.Product) => product.sku === 'professional');
                                const purchaseAmount = dollarUSLocale.format((userCount + additionalSeatsToPurchase) * (product).price_per_seat * 12);
                                const amountLine = allLines.find((line: string) => line.includes('Amount paid'));
                                if (!amountLine.includes(purchaseAmount)) {
                                    throw new Error(`Expected purchase amount ${purchaseAmount}, but amount line was ${amountLine}`);
                                }
                            });
                        });
                    });
                },
            );
        });
        cy.visit('/');
        cy.uiGetProductMenuButton().click();
        cy.contains('User Groups').click();
        cy.contains('Create Group').should('be.enabled');
    });
    it('must purchase a license for at least the current number of users', () => {
        cy.apiAdminLogin();
        cy.visit('/');
        cy.apiDeleteLicense();
        cy.intercept('GET', '**/api/v4/hosted_customer/signup_available').as('airGappedCheck');
        cy.intercept('GET', 'https://js.stripe.com/v3').as('stripeCheck');
        cy.intercept('GET', '**/api/v4/cloud/products/selfhosted').as('products');
        cy.get('#UpgradeButton').should('exist').click();
        cy.wait('@airGappedCheck');
        cy.wait('@stripeCheck');
        cy.wait('@products');
        cy.wait(50);
        cy.get('#professional_action').should('exist').click();
        verifyPurchaseModal();
        fillForm({...defaultSuccessForm, seats: 1}, getCurrentUsers());
        getCurrentUsers().then((currentUsers) => {
            cy.contains(`Your workspace currently has ${currentUsers} users`).should('not.be.enabled');
            cy.contains('Upgrade').should('not.be.enabled');
            cy.findByTestId('selfHostedPurchaseSeatsInput').clear().type(currentUsers.toString());
        });
        cy.contains('Upgrade').should('be.enabled');
        cy.get('#closeIcon').click();
    });
    it('failed payment in stripe means no license is received', () => {
        cy.apiAdminLogin();
        cy.visit('/');
        cy.apiDeleteLicense();
        cy.intercept('GET', '**/api/v4/hosted_customer/signup_available').as('airGappedCheck');
        cy.intercept('GET', 'https://js.stripe.com/v3').as('stripeCheck');
        cy.intercept('GET', '**/api/v4/cloud/products/selfhosted').as('products');
        cy.get('#UpgradeButton').should('exist').click();
        cy.wait('@airGappedCheck');
        cy.wait('@stripeCheck');
        cy.wait('@products');
        cy.wait(50);
        cy.get('#professional_action').should('exist').click();
        verifyPurchaseModal();
        fillForm({...defaultSuccessForm, card: failCardNumber}, getCurrentUsers());
        cy.intercept('POST', '**/api/v4/hosted_customer/customer').as('createCustomer');
        cy.contains('Upgrade').should('be.enabled').click();
        cy.wait('@createCustomer');
        cy.contains('Sorry, the payment verification failed');
        cy.contains('Try again');
        cy.contains('Contact Support');
        cy.get('#closeIcon').click();
        cy.visit('/admin_console/about/license');
        cy.contains('Upgrade to the Professional Plan');
        cy.contains('Purchase');
    });
    it('customer in region banned from purchase is not able to purchase and is told their transaction is under review.', () => {
        cy.apiAdminLogin();
        cy.visit('/');
        cy.apiDeleteLicense();
        cy.intercept('GET', '**/api/v4/hosted_customer/signup_available').as('airGappedCheck');
        cy.intercept('GET', '**/api/v4/cloud/products/selfhosted').as('products');
        cy.get('#UpgradeButton').should('exist').click();
        cy.wait('@airGappedCheck');
        cy.wait('@products');
        cy.wait(50);
        cy.get('#professional_action').should('exist').click();
        verifyPurchaseModal();
        fillForm({...defaultSuccessForm, country: 'Iran, Islamic Republic of'}, getCurrentUsers());
        cy.intercept('POST', '**/api/v4/hosted_customer/customer').as('createCustomer');
        cy.contains('Upgrade').should('be.enabled').click();
        cy.wait('@createCustomer');
        cy.contains('Your transaction is being reviewed');
        cy.contains('We will check things on our side and get back to you');
        cy.get('#closeIcon').click();
        cy.get('#UpgradeButton').should('exist').click();
        cy.wait('@airGappedCheck');
        cy.wait('@products');
        cy.wait(50);
        cy.get('#professional_action').should('exist').click();
        cy.contains('Your transaction is being reviewed');
        cy.contains('We will check things on our side and get back to you');
    });
});