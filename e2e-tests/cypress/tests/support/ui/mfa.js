import authenticator from 'authenticator';
import * as TIMEOUTS from '../../fixtures/timeouts';
Cypress.Commands.add('uiGetMFASecret', (userId) => {
    return cy.url().then((url) => {
        if (url.includes('mfa/setup')) {
            return cy.get('#mfa').wait(TIMEOUTS.HALF_SEC).find('.col-sm-12').then((p) => {
                const secretp = p.text();
                const secret = secretp.split(' ')[1];
                const token = authenticator.generateToken(secret);
                cy.findByPlaceholderText('MFA Code').type(token);
                cy.findByText('Save').click();
                cy.wait(TIMEOUTS.HALF_SEC);
                cy.findByText('Okay').click();
                return cy.wrap(secret);
            });
        }
        return cy.apiGenerateMfaSecret(userId).then((res) => {
            return cy.wrap(res.code.secret);
        });
    });
});