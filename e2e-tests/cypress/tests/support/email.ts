import {getEmailUrl, splitEmailBodyText} from '../utils';
Cypress.Commands.add('getRecentEmail', ({username, email}) => {
    return cy.task('getRecentEmail', {username, email, mailUrl: getEmailUrl()}).then(({status, data}) => {
        expect(status).to.equal(200);
        const {to, date, body: {text}} = data;
        expect(to.length).to.equal(1);
        expect(to[0]).to.contain(email);
        const isoDate = new Date().toISOString().substring(0, 10);
        expect(date).to.contain(isoDate);
        const body = splitEmailBodyText(text);
        return cy.wrap({...data, body});
    });
});
declare global {
    namespace Cypress {
        interface Chainable {
            getRecentEmail(options: Pick<UserProfile, 'username' | 'email'>): Chainable;
        }
    }
}