import {getRandomId} from '../../../../utils';
import {
    changeGuestFeatureSettings,
    invitePeople,
    verifyInvitationSuccess,
} from './helpers';
describe('Guest Account - Guest User Invitation Flow', () => {
    let testTeam: Cypress.Team;
    let newUser: Cypress.UserProfile;
    before(() => {
        cy.apiRequireLicenseForFeature('GuestAccounts');
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        changeGuestFeatureSettings();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            cy.apiCreateUser().then(({user}) => {
                newUser = user;
                cy.apiAddUserToTeam(testTeam.id, newUser.id);
            });
            cy.visit(`/${team.name}/channels/town-square`);
        });
    });
    it('MM-T4451 Verify UI Elements of Guest User Invitation Flow', () => {
        cy.uiOpenTeamMenu('Invite people');
        cy.findByTestId('inviteGuestLink').should('be.visible').click();
        cy.findByText('Add to channels').should('be.visible');
        cy.findByTestId('invitationModal').within(() => {
            cy.get('h1').should('have.text', `Invite guests to ${testTeam.display_name}`);
        });
        cy.findByTestId('inviteButton').scrollIntoView().should('be.visible').and('be.disabled');
        const email = `temp-${getRandomId()}@mattermost.com`;
        cy.get('.users-emails-input__control').should('be.visible').within(() => {
            cy.get('.users-emails-input__placeholder').should('have.text', 'Enter a name or email address');
            cy.get('input').typeWithForce(email);
        });
        cy.get('.users-emails-input__menu').
            children().should('have.length', 1).
            eq(0).should('contain', `Invite ${email} as a guest`).click();
        cy.get('.channels-input__control').should('be.visible').within(() => {
            cy.get('.channels-input__placeholder').should('have.text', 'e.g. Town Square');
            cy.get('input').typeWithForce('town sq');
        });
        cy.get('.channels-input__menu').
            children().should('have.length', 1).
            eq(0).should('contain', 'Town Square').click();
        cy.get('.AddToChannels').should('be.visible').within(() => {
            cy.get('textarea').should('not.exist');
            cy.get('a').should('have.text', 'Set a custom message').click();
        });
        cy.get('.AddToChannels').should('be.visible').within(() => {
            cy.get('a').should('not.exist');
            cy.get('.AddToChannels__customMessageTitle').findByText('Custom message');
            cy.get('textarea').should('be.visible');
        });
    });
    it('MM-T1386 Verify when different feature settings are disabled', () => {
        changeGuestFeatureSettings(false, true);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Invite people');
        cy.findByTestId('invitationModal').find('h1').should('have.text', `Invite people to ${testTeam.display_name}`);
        cy.findByTestId('InviteView__copyInviteLink').should('be.visible').within(() => {
            cy.findByText('Copy invite link').should('be.visible');
        });
        cy.get('#closeIcon').should('be.visible').click();
        changeGuestFeatureSettings(true, false);
        cy.reload();
        const email = `temp-${getRandomId()}@mattermost.com`;
        invitePeople(email, 1, email, 'Town Square', false);
        cy.findByTestId('inviteButton').should('be.disabled');
    });
    it('MM-T4449 Invite Guest via Email containing upper case letters', () => {
        changeGuestFeatureSettings();
        cy.visit(`/${testTeam.name}/channels/town-square`);
        const email = `tEMp-${getRandomId()}@mattermost.com`;
        invitePeople(email, 1, email);
        verifyInvitationSuccess(email.toLowerCase(), testTeam, 'An invitation email has been sent.');
    });
    it('MM-T1414 Add Guest from Add New Members dialog', () => {
        cy.apiDemoteUserToGuest(newUser.id);
        cy.uiOpenTeamMenu('Invite people');
        cy.get('.InviteAs').findByTestId('inviteMembersLink').click();
        cy.get('.users-emails-input__control').should('be.visible').within(() => {
            cy.get('input').typeWithForce(newUser.username);
        });
        cy.get('.users-emails-input__menu').
            children().should('have.length', 1).eq(0).should('contain', newUser.username).click();
        cy.findByTestId('inviteButton').scrollIntoView().click();
        cy.findByTestId('invitationModal').within(() => {
            cy.get('div.invitation-modal-confirm--sent').should('not.exist');
            cy.get('div.invitation-modal-confirm--not-sent').should('be.visible').within(() => {
                cy.get('h2 > span').should('have.text', 'Invitations Not Sent');
                cy.get('.people-header').should('have.text', 'People');
                cy.get('.details-header').should('have.text', 'Details');
                cy.get('.username-or-icon').should('contain', newUser.username);
                cy.get('.reason').should('have.text', 'Contact your admin to make this guest a full member.');
                cy.get('.username-or-icon .Tag').should('be.visible').and('have.text', 'GUEST');
            });
        });
    });
    it('MM-T1415 Check invite more button available on both successful and failed invites', () => {
        invitePeople(newUser.username, 1, newUser.username);
        cy.findByText('This person is already a member of the workspace. Invite them as a member instead of a guest.').should('be.visible');
        cy.findByTestId('invite-more').click();
        cy.get('.channels-input__control').should('be.visible').within(() => {
            cy.get('.public-channel-icon').should('be.visible');
            cy.findByText('Town Square').should('be.visible');
        });
        const email = `temp-${getRandomId()}@mattermost.com`;
        cy.get('.users-emails-input__control').should('be.visible').within(() => {
            cy.get('.users-emails-input__multi-value').should('not.exist');
            cy.get('input').typeWithForce(email);
        });
        cy.get('.users-emails-input__menu').children().should('have.length', 1).eq(0).should('contain', email).click();
        cy.findByTestId('inviteButton').scrollIntoView().click();
        cy.findByTestId('invite-more').should('be.visible');
    });
    it('hides the copy link button when inviting guests', () => {
        cy.uiOpenTeamMenu('Invite people');
        cy.findByTestId('inviteGuestLink').should('be.visible').click();
        cy.findByTestId('InviteView__copyInviteLink').should('not.exist');
    });
});