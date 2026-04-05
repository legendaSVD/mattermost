import {getRandomId, stubClipboard} from '../../../utils';
import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Team Settings', () => {
    const randomId = getRandomId();
    const emailDomain = 'sample.mattermost.com';
    let testTeam;
    before(() => {
        cy.apiUpdateConfig({
            GuestAccountsSettings: {
                Enable: false,
            },
            LdapSettings: {
                Enable: false,
            },
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.visit(`/${team.name}`);
        });
    });
    it('MM-T387 - Try to join a closed team from a NON-mattermost email address via "Get Team Invite Link" while "Allow only users with a specific email domain to join this team" set to "sample.mattermost.com"', () => {
        stubClipboard().as('clipboard');
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#teamSettingsModal').should('exist').within(() => {
            cy.get('#accessButton').click();
            cy.get('.access-allowed-domains-section').should('exist').within(() => {
                cy.get('.mm-modal-generic-section-item__input-checkbox').should('not.be.checked').click();
            });
            cy.get('#allowedDomains').click().type(emailDomain).type(' ');
            cy.findByText('Save').should('be.visible').click();
        });
        cy.wait(TIMEOUTS.ONE_HUNDRED_MILLIS);
        cy.uiClose();
        cy.uiOpenTeamMenu('Invite people');
        cy.findByTestId('InviteView__copyInviteLink').should('be.visible').click();
        cy.get('@clipboard').its('contents').then((val) => {
            const inviteLink = val;
            cy.apiLogout();
            cy.visit(inviteLink);
            const email = `user${randomId}@sample.gmail.com`;
            const username = `user${randomId}`;
            const password = 'passwd';
            const errorMessage = `The following email addresses do not belong to an accepted domain: ${emailDomain}. Please contact your System Administrator for details.`;
            cy.get('#input_email').should('be.visible').type(email);
            cy.get('#input_name').type(username);
            cy.get('#input_password-input').type(password);
            cy.get('#signup-body-card-form-check-terms-and-privacy').check();
            cy.findByText('Create account').click();
            cy.findByText(errorMessage).should('be.visible');
        });
    });
    it('MM-T2341 Cannot add a user to a team if the user\'s email is not from the correct domain', () => {
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#teamSettingsModal').should('exist').within(() => {
            cy.get('#accessButton').click();
            cy.get('.access-invite-domains-section').should('exist').within(() => {
                cy.get('.mm-modal-generic-section-item__input-checkbox').should('not.be.checked').click();
            });
            cy.get('.access-allowed-domains-section').should('exist').within(() => {
                cy.get('.mm-modal-generic-section-item__input-checkbox').should('not.be.checked').click();
            });
            cy.get('#allowedDomains').click().type(emailDomain).type(' ');
            cy.findByText('Save').should('be.visible');
            cy.uiSave();
            cy.uiClose();
        });
        cy.apiCreateUser({user: {email: `user${randomId}@sample.gmail.com`, username: `user${randomId}`, password: 'passwd'}}).then(({user}) => {
            cy.apiCreateTeam('other-team', 'Other Team').then(({team: otherTeam}) => {
                cy.apiAddUserToTeam(otherTeam.id, user.id).then(() => {
                    cy.apiLogin(user);
                    cy.visit(`/${otherTeam.name}/channels/town-square`);
                    cy.uiOpenTeamMenu('Join another team');
                    cy.get('.signup-team-dir').find(`#${testTeam.display_name.replace(' ', '_')}`).scrollIntoView().click();
                    cy.get('div.has-error').should('contain', 'The user cannot be added as the domain associated with the account is not permitted.');
                });
            });
        });
    });
});