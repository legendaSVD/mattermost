import {getRandomId, stubClipboard} from '../../../../utils';
import {getAdminAccount} from '../../../../support/env';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Guest Account - Member Invitation Flow', () => {
    const sysadmin = getAdminAccount();
    let testTeam: Cypress.Team;
    let testUser: Cypress.UserProfile;
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiRequireLicenseForFeature('GuestAccounts');
        cy.apiUpdateConfig({
            GuestAccountsSettings: {
                Enable: true,
            },
            ServiceSettings: {
                EnableEmailInvitations: true,
            },
        });
        cy.apiInitSetup().then(({team, user}) => {
            testUser = user;
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/town-square`);
        });
    });
    it('MM-T1323 Verify UI Elements of Members Invitation Flow - Accessing Invite People', () => {
        const email = `temp-${getRandomId()}@mattermost.com`;
        cy.uiOpenTeamMenu('Invite people');
        cy.findByTestId('invitationModal').within(() => {
            cy.get('h1').should('have.text', `Invite people to ${testTeam.display_name}`);
        });
        stubClipboard().as('clipboard');
        cy.findByTestId('InviteView__copyInviteLink').should('be.visible').should('have.text', 'Copy invite link').click();
        const baseUrl = Cypress.config('baseUrl');
        cy.get('@clipboard').its('contents').should('eq', `${baseUrl}/signup_user_complete/?id=${testTeam.invite_id}`);
        cy.findByTestId('inviteButton').scrollIntoView().should('be.visible').and('be.disabled');
        cy.get('.users-emails-input__control').should('be.visible').within(() => {
            cy.get('.users-emails-input__placeholder').should('have.text', 'Enter a name or email address');
            cy.get('input').typeWithForce(email);
        });
        cy.get('.users-emails-input__menu').
            children().should('have.length', 1).
            eq(0).should('contain', `Invite ${email} as a team member`).click();
        cy.get('#closeIcon').should('be.visible').click();
        cy.get('.InvitationModal').should('not.exist');
    });
    it('MM-T1324 Invite Members - Team Link - New User', () => {
        cy.uiGetPostTextBox().wait(TIMEOUTS.TWO_SEC);
        const inviteMembersLink = `/signup_user_complete/?id=${testTeam.invite_id}`;
        cy.apiLogout();
        cy.visit(inviteMembersLink);
        cy.findByText('AD/LDAP Credentials').scrollIntoView().should('be.visible');
        cy.findByText('Email address').should('be.visible');
        cy.findByPlaceholderText('Choose a Password').should('be.visible');
        const username = `temp-${getRandomId()}`;
        const email = `${username}@mattermost.com`;
        cy.get('#input_email').type(email);
        cy.get('#input_name').type(username);
        cy.get('#input_password-input').type('Testing123');
        cy.findByText('Create account').click();
        cy.uiGetLHSHeader().findByText(testTeam.display_name);
        cy.uiGetLhsSection('CHANNELS').within(() => {
            cy.findByText('Off-Topic').should('be.visible');
            cy.findByText('Town Square').should('be.visible');
        });
    });
    it('MM-T1325 Invite Members - Team Link - Existing User', () => {
        cy.apiAdminLogin();
        cy.apiCreateTeam('team', 'Team').then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
            cy.uiGetPostTextBox().wait(TIMEOUTS.TWO_SEC);
            const inviteMembersLink = `/signup_user_complete/?id=${team.invite_id}`;
            cy.apiLogout();
            cy.visit(inviteMembersLink);
            cy.findByText('Log in').should('be.visible').click();
            cy.get('#input_loginId').type(testUser.username);
            cy.get('#input_password-input').type('passwd');
            cy.get('#saveSetting').should('not.be.disabled').click();
            cy.get(`#${testTeam.name}TeamButton`).as('teamButton').should('be.visible').within(() => {
                cy.get('.badge').should('be.visible').and('have.text', 1);
            });
            cy.get('@teamButton').click().wait(TIMEOUTS.TWO_SEC);
            cy.uiGetLhsSection('CHANNELS').within(() => {
                cy.findByText('Off-Topic').should('be.visible');
                cy.findByText('Town Square').should('be.visible');
            });
        });
    });
    it('MM-T1326 Verify Invite Members - Existing Team Member', () => {
        cy.apiCreateTeam('team', 'Team').then(({team}) => {
            loginAsNewUser(team);
            invitePeople(sysadmin.username, 1, sysadmin.username);
            verifyInvitationError(sysadmin.username, team, 'This person is already a team member.');
        });
    });
    it('MM-T1328 Invite Members - Existing Member not on the team', () => {
        cy.apiCreateTeam('team', 'Team').then(({team}) => {
            loginAsNewUser(team);
            invitePeople(testUser.email, 1, testUser.username);
            verifyInvitationSuccess(testUser.username, team, 'This member has been added to the team.');
        });
    });
    it('MM-T1329 Invite Members - Invite People - Existing Guest not on the team', () => {
        cy.apiCreateTeam('team', 'Team').then(({team}) => {
            loginAsNewUser(team);
            const email = `temp-${getRandomId()}@mattermost.com`;
            invitePeople(email, 1, email);
            verifyInvitationSuccess(email, team, 'An invitation email has been sent.');
        });
    });
    it('MM-T4450 Invite Member via Email containing upper case letters', () => {
        loginAsNewUser(testTeam);
        const email = `tEMp-${getRandomId()}@mattermost.com`;
        invitePeople(email, 1, email);
        verifyInvitationSuccess(email, testTeam, 'An invitation email has been sent.');
    });
    it('MM-T1330 Invite Members - New User not in the system', () => {
        cy.apiAdminLogin();
        cy.apiCreateTeam('team', 'Team').then(({team}) => {
            loginAsNewUser(team);
            invitePeople(testUser.email, 1, testUser.username, false);
            const username = `temp-${getRandomId()}`;
            cy.get('.users-emails-input__control').should('be.visible').within(() => {
                cy.get('input').typeWithForce(username).tab();
            });
            cy.findByTestId('inviteButton').scrollIntoView().click();
            cy.findByTestId('invitationModal').within(() => {
                cy.get('h1').should('have.text', `Members invited to ${team.display_name}`);
                cy.get('div.invitation-modal-confirm--not-sent').should('be.visible').within(() => {
                    cy.get('h2 > span').should('have.text', 'Invitations Not Sent');
                    cy.get('.people-header').should('have.text', 'People');
                    cy.get('.details-header').should('have.text', 'Details');
                    cy.get('.username-or-icon').should('contain', username);
                    cy.get('.reason').should('have.text', 'Does not match a valid user or email.');
                });
                cy.get('div.invitation-modal-confirm--sent').should('be.visible').within(() => {
                    cy.get('h2 > span').should('have.text', 'Successful Invites');
                    cy.get('.people-header').should('have.text', 'People');
                    cy.get('.details-header').should('have.text', 'Details');
                    cy.get('.username-or-icon').should('contain', testUser.username);
                    cy.get('.reason').should('have.text', 'This member has been added to the team.');
                });
            });
        });
    });
});
function invitePeople(typeText, resultsCount, verifyText, clickInvite = true) {
    cy.uiOpenTeamMenu('Invite people');
    cy.get('.users-emails-input__control').should('be.visible').within(() => {
        cy.get('input').typeWithForce(typeText);
    });
    cy.get('.users-emails-input__menu').
        children().should('have.length', resultsCount).eq(0).should('contain', verifyText).click();
    cy.get('.users-emails-input__control').should('be.visible').within(() => {
        cy.get('input').tab();
    });
    if (clickInvite) {
        cy.findByTestId('inviteButton').scrollIntoView().click();
    }
}
function verifyInvitationError(user, team, errorText) {
    cy.findByTestId('invitationModal').within(() => {
        cy.get('h1').should('have.text', `Members invited to ${team.display_name}`);
        cy.get('div.invitation-modal-confirm--sent').should('not.exist');
        cy.get('div.invitation-modal-confirm--not-sent').should('be.visible').within(() => {
            cy.get('h2 > span').should('have.text', 'Invitations Not Sent');
            cy.get('.people-header').should('have.text', 'People');
            cy.get('.details-header').should('have.text', 'Details');
            cy.get('.username-or-icon').should('contain', user);
            cy.get('.reason').should('have.text', errorText);
        });
        cy.findByTestId('confirm-done').should('be.visible').and('not.be.disabled').click();
    });
    cy.get('.InvitationModal').should('not.exist');
}
function verifyInvitationSuccess(user, team, successText) {
    cy.findByTestId('invitationModal').within(() => {
        cy.get('h1').should('have.text', `Members invited to ${team.display_name}`);
        cy.get('div.invitation-modal-confirm--not-sent').should('not.exist');
        cy.get('div.invitation-modal-confirm--sent').should('be.visible').within(() => {
            cy.get('h2 > span').should('have.text', 'Successful Invites');
            cy.get('.people-header').should('have.text', 'People');
            cy.get('.details-header').should('have.text', 'Details');
            cy.get('.username-or-icon').should('contain', user);
            cy.get('.reason').should('have.text', successText);
        });
        cy.findByTestId('confirm-done').should('be.visible').and('not.be.disabled').click();
    });
    cy.get('.InvitationModal').should('not.exist');
}
function loginAsNewUser(team) {
    cy.apiCreateUser().then(({user}) => {
        cy.apiAddUserToTeam(team.id, user.id);
        cy.apiLogin(user);
        cy.visit(`/${team.name}`);
    });
}