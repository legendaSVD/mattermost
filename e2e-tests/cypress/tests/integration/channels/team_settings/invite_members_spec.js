describe('Invite Members', () => {
    let testUser;
    let testTeam;
    let userToBeInvited;
    before(() => {
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableAPITeamDeletion: true,
            },
            EmailSettings: {
                RequireEmailVerification: false,
            },
        });
    });
    afterEach(() => {
        closeAndComplete();
    });
    describe('Invite members - user to be invited not added to existing team', () => {
        beforeEach(() => {
            cy.apiAdminLogin();
            cy.apiInitSetup().then(({team, user}) => {
                testUser = user;
                testTeam = team;
                cy.apiCreateUser({bypassTutorial: false}).then(({user: otherUser}) => {
                    userToBeInvited = otherUser;
                });
            });
        });
        it('Invite members to Team as Member - invitation sent', () => {
            inviteUserToTeamAsMember(testUser, testTeam, userToBeInvited);
            verifyInvitationSuccess(testTeam, userToBeInvited);
            verifyInviteMembersModal(testTeam);
        });
        it('Invite members to Team as SysAdmin - invitation sent', () => {
            inviteUserToTeamAsSysadmin(testTeam, userToBeInvited);
            verifyInvitationSuccess(testTeam, userToBeInvited);
        });
    });
    describe('Invite members - user to be invited already member of existing team', () => {
        beforeEach(() => {
            cy.apiAdminLogin();
            cy.apiInitSetup().then(({team, user}) => {
                testUser = user;
                testTeam = team;
                cy.apiCreateUser({bypassTutorial: false}).then(({user: otherUser}) => {
                    userToBeInvited = otherUser;
                    cy.apiAddUserToTeam(testTeam.id, userToBeInvited.id);
                });
            });
        });
        it('Invite members to Team as Member - invitation not sent', () => {
            inviteUserToTeamAsMember(testUser, testTeam, userToBeInvited);
            verifyInvitationError(testTeam, userToBeInvited);
            verifyInviteMembersModal(testTeam);
        });
        it('Invite members to Team as SysAdmin - invitation not sent', () => {
            inviteUserToTeamAsSysadmin(testTeam, userToBeInvited);
            verifyInvitationError(testTeam, userToBeInvited);
        });
    });
    describe('default interface', () => {
        it('focuses user email input by default', () => {
            cy.apiLogin(testUser);
            cy.visit(`/${testTeam.name}/channels/town-square`);
            cy.uiOpenTeamMenu('Invite people');
            cy.get('.users-emails-input__control--is-focused').should('be.visible');
        });
    });
});
function verifyInvitationTable($subel, tableTitle, user, reason) {
    cy.wrap($subel).find('h2 > span').should('have.text', tableTitle);
    cy.wrap($subel).find('.people-header').should('have.text', 'People');
    cy.wrap($subel).find('.details-header').should('have.text', 'Details');
    cy.wrap($subel).find('.username-or-icon').should('contain', `@${user.username} - ${user.first_name} ${user.last_name} (${user.nickname})`);
    cy.wrap($subel).find('.reason').should('have.text', reason);
}
function verifyInvitationResult(team, user, reason, isInvitationSent) {
    cy.findByTestId('invitationModal').within(($el) => {
        cy.wrap($el).find('h1').should('have.text', `Members invited to ${team.display_name}`);
        if (isInvitationSent) {
            cy.wrap($el).find('div.invitation-modal-confirm--not-sent').should('not.exist');
            cy.wrap($el).find('div.invitation-modal-confirm--sent').should('be.visible').within(($subel) => {
                verifyInvitationTable($subel, 'Successful Invites', user, reason);
            });
        } else {
            cy.wrap($el).find('div.invitation-modal-confirm--sent').should('not.exist');
            cy.wrap($el).find('div.invitation-modal-confirm--not-sent').should('be.visible').within(($subel) => {
                verifyInvitationTable($subel, 'Invitations Not Sent', user, reason);
            });
        }
        cy.wrap($el).findByTestId('confirm-done').should('be.visible');
        cy.wrap($el).findByTestId('invite-more').should('be.visible').and('not.be.disabled').click();
    });
}
function verifyInvitationSuccess(team, user) {
    verifyInvitationResult(team, user, 'This member has been added to the team.', true);
}
function verifyInvitationError(team, user) {
    verifyInvitationResult(team, user, 'This person is already a team member.', false);
}
function verifyInviteMembersModal(team) {
    cy.findByTestId('invitationModal').within(($el) => {
        cy.wrap($el).find('h1').should('have.text', `Invite people to ${team.display_name}`);
    });
    cy.findByTestId('InviteView__copyInviteLink').should('be.visible').should('have.text', 'Copy invite link');
}
function inviteUser(user) {
    cy.get('.users-emails-input__control input').type(user.email, {force: true});
    cy.get('.users-emails-input__menu').children().eq(0).should('contain', user.username).click();
    cy.findByTestId('inviteButton').scrollIntoView().click();
}
function inviteUserToTeamAsMember(testUser, testTeam, user) {
    cy.apiLogin(testUser);
    cy.visit(`/${testTeam.name}/channels/town-square`);
    cy.uiOpenTeamMenu('Invite people');
    verifyInviteMembersModal(testTeam);
    inviteUser(user);
}
function inviteUserToTeamAsSysadmin(testTeam, user) {
    cy.apiAdminLogin();
    cy.visit(`/${testTeam.name}/channels/off-topic`);
    cy.uiOpenTeamMenu('Invite people');
    verifyInviteMembersModal(testTeam);
    inviteUser(user);
}
function closeAndComplete() {
    cy.uiClose();
    cy.get('.InvitationModal').should('not.exist');
}