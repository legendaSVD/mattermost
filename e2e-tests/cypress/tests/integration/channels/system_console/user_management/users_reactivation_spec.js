import * as TIMEOUTS from '../../../../fixtures/timeouts';
import * as MESSAGES from '../../../../fixtures/messages';
import {getRandomId} from '../../../../utils';
describe('System Console > User Management > Reactivation', () => {
    let teamName;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup().then(({team}) => {
            teamName = team.name;
        });
    });
    it('MM-T952 Reactivating a user results in them showing up in the normal spot in the list, without the `Deactivated` label.', () => {
        cy.visit(`/${teamName}`);
        const id = getRandomId();
        cy.apiCreateUser({prefix: id + '_a_'}).then(({user: user1}) => {
            cy.apiCreateUser({prefix: id + '_b_'}).then(({user: user2}) => {
                cy.sendDirectMessageToUser(user1, MESSAGES.SMALL);
                cy.sendDirectMessageToUser(user2, MESSAGES.SMALL);
                cy.uiAddDirectMessage().click().wait(TIMEOUTS.HALF_SEC);
                cy.get('.more-direct-channels #selectItems input').typeWithForce(id).wait(TIMEOUTS.HALF_SEC);
                cy.get('#moreDmModal .more-modal__row').siblings().its(0).get('#displayedUserName' + user1.username).parent().should('not.contain', 'Deactivated');
                cy.get('#moreDmModal .more-modal__row').siblings().its(1).get('#displayedUserName' + user2.username);
                cy.apiDeactivateUser(user1.id).then(() => {
                    cy.get('#moreDmModal .more-modal__row').siblings().its(1).get('#displayedUserName' + user1.username).parent().should('contain', 'Deactivated');
                    cy.get('#moreDmModal .more-modal__row').siblings().its(0).get('#displayedUserName' + user2.username);
                    cy.apiActivateUser(user1.id).then(() => {
                        cy.get('#moreDmModal .more-modal__row').siblings().its(0).get('#displayedUserName' + user1.username).parent().should('not.contain', 'Deactivated');
                        cy.get('#moreDmModal .more-modal__row').siblings().its(1).get('#displayedUserName' + user2.username);
                    });
                });
            });
        });
    });
});