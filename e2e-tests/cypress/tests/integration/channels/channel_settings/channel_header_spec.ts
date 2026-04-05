import {ChannelType} from '@mattermost/types/channels';
import {getRandomId} from '../../../utils';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Channel Settings', () => {
    let testTeam: Cypress.Team;
    let user1: Cypress.UserProfile;
    let admin: Cypress.UserProfile;
    before(() => {
        cy.apiGetMe().then(({user: adminUser}) => {
            admin = adminUser;
            cy.apiInitSetup().then(({team, user}) => {
                testTeam = team;
                user1 = user;
                cy.visit(`/${testTeam.name}/channels/town-square`);
            });
        });
    });
    it('MM-T1808 Hover effect exists to add a channel description / header (when not already present)', () => {
        ['O', 'P'].forEach((channelType) => {
            cy.apiCreateChannel(testTeam.id, `chan${getRandomId()}`, 'chan', channelType as ChannelType).then(({channel}) => {
                cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                hoverOnChannelDescriptionAndVerifyBehavior();
            });
        });
        cy.apiCreateDirectChannel([admin.id, user1.id]).then(() => {
            cy.visit(`/${testTeam.name}/messages/@${user1.username}`);
            hoverOnChannelDescriptionAndVerifyBehavior();
        });
        cy.apiCreateUser().then(({user: user2}) => {
            cy.apiAddUserToTeam(testTeam.id, user2.id).then(() => {
                cy.apiCreateGroupChannel([user2.id, user1.id, admin.id]).then(({channel}) => {
                    cy.visit(`/${testTeam.name}/channels/${channel.name}`);
                    hoverOnChannelDescriptionAndVerifyBehavior();
                });
            });
        });
    });
});
function hoverOnChannelDescriptionAndVerifyBehavior() {
    const channelDescriptionText = `test description ${getRandomId()}`;
    cy.wait(TIMEOUTS.ONE_SEC);
    cy.get('#channelHeaderDescription').should('be.visible').find('span').invoke('show').click({multiple: true, force: true});
    cy.get('.a11y__modal.modal-dialog').should('be.visible').within(() => {
        cy.findByTestId('edit_textbox').should('exist').clear().type(channelDescriptionText);
        cy.findByText('Save').should('be.visible').click();
    });
    cy.get('#channelHeaderDescription').should('be.visible').within(() => {
        cy.findAllByText(channelDescriptionText).should('be.visible').click({multiple: true, force: true});
    });
    cy.get('.a11y__modal.modal-dialog').should('not.exist');
}