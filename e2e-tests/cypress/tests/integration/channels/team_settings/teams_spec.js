import * as TIMEOUTS from '../../../fixtures/timeouts';
import {getAdminAccount} from '../../../support/env';
describe('Teams Suite', () => {
    let testTeam;
    let testUser;
    let newUser;
    beforeEach(() => {
        cy.apiAdminLogin();
        cy.apiCreateUser().then(({user}) => {
            newUser = user;
        });
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;
        });
    });
    it('MM-T393 Cancel out of leaving team', () => {
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiGetLHSHeader().findByText(testTeam.display_name);
        cy.url().should('include', `/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Leave team');
        cy.get('#leaveTeamModal').should('be.visible');
        cy.get('#leaveTeamNo').click();
        cy.get('#leaveTeamModal').should('not.exist');
        cy.uiGetLHSHeader().findByText(testTeam.display_name);
        cy.url().should('include', `/${testTeam.name}/channels/town-square`);
    });
    it('MM-T2340 Team or System Admin searches and adds new team member', () => {
        cy.apiUpdateConfig({
            GuestAccountsSettings: {
                Enable: false,
            },
        });
        let otherUser;
        cy.apiCreateUser().then(({user}) => {
            otherUser = user;
            cy.visit(`/${testTeam.name}/channels/town-square`);
            cy.uiOpenTeamMenu();
            cy.uiGetLHSTeamMenu().find('div.label-elements > span:nth-child(2)').should('have.text', 'Add or invite people to the team');
            cy.uiGetLHSTeamMenu().find("li span:contains('Invite people')").should('have.text', 'Invite people').click().wait(TIMEOUTS.HALF_SEC);
            cy.findByTestId('invitationModal', {timeout: TIMEOUTS.HALF_SEC}).should('be.visible');
            cy.get('.users-emails-input__control').should('be.visible').within(($el) => {
                cy.wrap($el).get('input').typeWithForce(otherUser.first_name);
            });
            cy.get('.users-emails-input__menu').
                children().should('have.length', 1).
                eq(0).should('contain', `@${otherUser.username}`).and('contain', `${otherUser.first_name} ${otherUser.last_name}`).
                click();
            cy.findByTestId('inviteButton').click();
            cy.findByTestId('confirm-done').click();
            cy.getLastPost().wait(TIMEOUTS.HALF_SEC).then(($el) => {
                cy.wrap($el).get('.user-popover').
                    should('be.visible').
                    and('have.text', 'System');
                cy.wrap($el).get('.post-message__text-container').
                    should('be.visible').
                    and('contain', `You and @${testUser.username} joined the team.`).
                    and('contain', `@${otherUser.username} added to the team by you.`);
            });
            cy.get('#sidebarItem_off-topic').should('be.visible').click({force: true});
            cy.getLastPost().wait(TIMEOUTS.HALF_SEC).then(($el) => {
                cy.wrap($el).get('.user-popover').
                    should('be.visible').
                    and('have.text', 'System');
                cy.wrap($el).get('.post-message__text-container').
                    should('be.visible').
                    and('contain', `You and @${testUser.username} joined the channel.`).
                    and('contain', `@${otherUser.username} added to the channel by you.`);
            });
            cy.apiLogin(otherUser);
            cy.visit(`/${testTeam.name}/channels/town-square`);
            cy.uiGetLHSHeader().findByText(testTeam.display_name);
            const sysadmin = getAdminAccount();
            cy.getLastPost().wait(TIMEOUTS.HALF_SEC).then(($el) => {
                cy.wrap($el).get('.user-popover').
                    should('be.visible').
                    and('have.text', 'System');
                cy.wrap($el).get('.post-message__text-container').
                    should('be.visible').
                    and('contain', `@${sysadmin.username} and @${testUser.username} joined the team.`).
                    and('contain', `You were added to the team by @${sysadmin.username}.`);
            });
            cy.get('#sidebarItem_off-topic').should('be.visible').click({force: true});
            cy.findAllByTestId('postView').last().scrollIntoView();
            cy.getLastPost().wait(TIMEOUTS.HALF_SEC).then(($el) => {
                cy.wrap($el).get('.user-popover').
                    should('be.visible').
                    and('have.text', 'System');
                cy.wrap($el).get('.post-message__text-container').
                    should('be.visible').
                    and('contain', `@${sysadmin.username} and @${testUser.username} joined the channel.`).
                    and('contain', `You were added to the channel by @${sysadmin.username}.`);
            });
            removeTeamMember(testTeam.name, otherUser.username);
        });
    });
    it('MM-T394 Leave team by clicking Yes, leave all teams', () => {
        cy.apiUpdateConfig({EmailSettings: {RequireEmailVerification: false}});
        cy.apiLogin(testUser);
        cy.apiGetTeamsForUser().then(({teams}) => {
            teams.forEach((team) => {
                cy.visit(`/${team.name}/channels/town-square`);
                cy.uiGetLHSHeader().findByText(testTeam.display_name);
                cy.leaveTeam();
            });
        });
        cy.url().should('include', '/select_team');
        cy.get('#logout').should('be.visible').click();
        cy.url({timeout: TIMEOUTS.HALF_MIN}).should('include', 'login');
    });
    it('MM-T1535 Team setting / Invite code text', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#accessButton').click();
        cy.findByText('Invite Code').should('be.visible').click();
        cy.findByText('The Invite Code is part of the unique team invitation link which is sent to members you’re inviting to this team. Regenerating the code creates a new invitation link and invalidates the previous link.').
            scrollIntoView().
            should('be.visible');
        cy.get('body').typeWithForce('{esc}');
    });
    it('MM-T2312 Team setting / Team name: Change name', () => {
        const teamName = 'Test Team';
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Team settings');
        cy.findByText('Team Name').should('be.visible').click();
        cy.get('#teamName').should('be.visible').clear().type(teamName);
        cy.uiSaveAndClose();
        cy.uiGetLHSHeader().findByText(teamName);
        cy.get(`#${testTeam.name}TeamButton`).scrollIntoView().should('have.attr', 'aria-label', 'test team team');
        cy.url().should('include', `/${testTeam.name}/channels/town-square`);
    });
    it('MM-T2317 Team setting / Update team description', () => {
        const teamDescription = 'This is the best team';
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#teamDescription').should('be.visible').clear().type(teamDescription);
        cy.get('#teamDescription').should('have.value', teamDescription);
        cy.uiSaveAndClose();
        cy.wait(TIMEOUTS.ONE_HUNDRED_MILLIS);
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#teamDescription').should('have.text', teamDescription);
    });
    it('MM-T2318 Allow anyone to join this team', () => {
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#accessButton').click();
        cy.get('.access-invite-domains-section').should('exist').within(() => {
            cy.get('.mm-modal-generic-section-item__input-checkbox').should('not.be.checked').click();
        });
        cy.uiSaveAndClose();
        cy.apiLogin(newUser);
        cy.visit('/');
        cy.url().should('include', '/select_team');
        cy.get('#teamsYouCanJoinContent').should('be.visible');
        cy.findByText(testTeam.display_name, {timeout: TIMEOUTS.HALF_MIN}).should('be.visible').click();
        cy.url().should('include', `/${testTeam.name}/channels/town-square`);
        cy.get('h2.channel-intro__title').should('be.visible').should('have.text', 'Town Square');
    });
    it('MM-T2322 Do not allow anyone to join this team', () => {
        cy.apiCreateTeam().then(({team: joinableTeam}) => {
            cy.apiPatchTeam(joinableTeam.id, {allow_open_invite: true});
        });
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#accessButton').click();
        cy.get('.access-invite-domains-section').should('exist').within(() => {
            cy.get('.mm-modal-generic-section-item__input-checkbox').should('not.be.checked');
        });
        cy.uiClose();
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('Join another team');
        cy.get('.signup-team-dir').children().should('not.contain', `#${testTeam.name.charAt(0).toUpperCase() + testTeam.name.slice(1)}`);
    });
    it('MM-T2328 Member can view and search for members', () => {
        cy.apiLogout();
        cy.wait(TIMEOUTS.ONE_SEC);
        cy.apiLogin(testUser);
        cy.visit(`/${testTeam.name}/channels/town-square`);
        cy.uiOpenTeamMenu('View members');
        cy.wait(TIMEOUTS.HALF_SEC);
        cy.get('#searchUsersInput').should('be.visible').type('sysadmin');
        cy.get('.more-modal__list').should('be.visible').children().should('have.length', 1);
    });
});
function removeTeamMember(teamName, username) {
    cy.apiAdminLogin();
    cy.visit(`/${teamName}`);
    cy.uiOpenTeamMenu('Manage members');
    cy.get(`#teamMembersDropdown_${username}`).should('be.visible').click();
    cy.get('#removeFromTeam').should('be.visible').click();
    cy.uiClose();
}