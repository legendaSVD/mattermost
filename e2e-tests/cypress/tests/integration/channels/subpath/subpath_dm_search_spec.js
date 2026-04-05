import * as TIMEOUTS from '../../../fixtures/timeouts';
import {generateRandomUser} from '../../../support/api/user';
import {getAdminAccount} from '../../../support/env';
describe('Subpath Direct Message Search', () => {
    let testTeam;
    before(() => {
        cy.shouldRunWithSubpath();
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            cy.apiLogin(user);
        });
    });
    it('MM-T989 - User on other subpath, but not on this one, should not show in DM More list', () => {
        const admin = getAdminAccount();
        const secondServer = Cypress.env('secondServerURL');
        cy.request({
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            url: `${secondServer}/api/v4/users/login`,
            method: 'POST',
            body: {login_id: admin.username, password: admin.password},
        }).then((response) => {
            expect(response.status).to.equal(200);
            const newUser = generateRandomUser('otherSubpathUser');
            const createUserOption = {
                headers: {'X-Requested-With': 'XMLHttpRequest'},
                method: 'POST',
                url: `${secondServer}/api/v4/users`,
                body: newUser,
            };
            cy.request(createUserOption).then((userRes) => {
                expect(userRes.status).to.equal(201);
                const otherSubpathUser = userRes.body;
                cy.visit(`/${testTeam.name}/channels/town-square`);
                cy.uiAddDirectMessage().click().wait(TIMEOUTS.HALF_SEC);
                cy.get('#selectItems input').
                    typeWithForce(otherSubpathUser.username).
                    wait(TIMEOUTS.HALF_SEC);
                cy.get(`#displayedUserName${otherSubpathUser.username}`).should('not.exist');
            });
        });
    });
});