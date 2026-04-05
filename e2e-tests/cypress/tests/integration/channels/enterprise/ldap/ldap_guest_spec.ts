import {UserProfile} from '@mattermost/types/users';
import ldapUsers from '../../../../fixtures/ldap_users.json';
import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getAdminAccount} from '../../../../support/env';
import {getRandomId} from '../../../../utils';
describe('LDAP guest', () => {
    let testSettings;
    let user1Data;
    let user2Data;
    const user1 = ldapUsers['test-2'];
    const user2 = ldapUsers['test-3'];
    const userBoard1 = ldapUsers['board-1'];
    before(() => {
        cy.apiRequireLicenseForFeature('LDAP');
        cy.apiLDAPTest();
        cy.apiLDAPSync();
        cy.apiGetConfig().then(({config}) => {
            testSettings = setLDAPTestSettings(config);
        });
        cy.apiLogin(user1 as unknown as UserProfile).then((user) => {
            user1Data = user;
            removeUserFromAllTeams(user1Data);
        });
        cy.apiLogin(user2 as unknown as UserProfile).then((user) => {
            user2Data = user;
            removeUserFromAllTeams(user2Data);
        });
    });
    beforeEach(() => {
        cy.apiAdminLogin();
        promoteGuestToUser(user1Data);
        promoteGuestToUser(user2Data);
    });
    it('MM-T1422 LDAP Guest Filter', () => {
        gotoLDAPSettings();
        cy.findByTestId('LdapSettings.AdditionalFiltersbutton').click();
        updateGuestFilter(`(uid=${user1.username})`);
        testSettings.user = user1;
        cy.doLDAPLogin(testSettings);
        cy.get('.select-team__container', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.get('.signup__content').should('have.text', 'Your guest account has no channels assigned. Please contact an administrator.');
        cy.apiLogout().then(() => {
            cy.apiAdminLogin();
            gotoLDAPSettings();
            cy.findByTestId('LdapSettings.AdditionalFiltersbutton').click();
            updateGuestFilter('');
            testSettings.user = user1;
            cy.doLDAPLogin(testSettings);
            cy.get('.select-team__container', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
            cy.get('#createNewTeamLink').should('not.exist');
            cy.apiLogout().then(() => {
                testSettings.user = user2;
                cy.doLDAPLogin(testSettings);
                cy.get('.select-team__container', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
                cy.get('#createNewTeamLink').should('exist');
            });
        });
    });
    it('MM-T1424 LDAP Guest Filter behavior when Guest Access is disabled', () => {
        gotoGuestAccessSettings();
        setGuestAccess(true);
        gotoLDAPSettings();
        cy.findByTestId('LdapSettings.AdditionalFiltersbutton').click();
        updateGuestFilter(`(uid=${user1.username})`);
        gotoGuestAccessSettings();
        setGuestAccess(false);
        gotoLDAPSettings();
        cy.findByTestId('LdapSettings.GuestFilterinput').should('have.attr', 'disabled');
        cy.visit('/admin_console/authentication/saml');
        cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'SAML 2.0');
        cy.findByTestId('SamlSettings.GuestAttributeinput').should('be.disabled');
        testSettings.user = user1;
        cy.doLDAPLogin(testSettings);
        cy.get('.select-team__container', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');
        cy.get('#createNewTeamLink').should('exist');
    });
    it('MM-T1425 LDAP Guest Filter Change', () => {
        gotoGuestAccessSettings();
        setGuestAccess(true);
        testSettings.user = user2;
        cy.doLDAPLogin(testSettings);
        cy.skipOrCreateTeam(testSettings, getRandomId()).then(() => {
            cy.uiGetLHSAddChannelButton().should('exist');
            demoteUserToGuest(user2Data);
            cy.apiLogout().then(() => {
                cy.doLDAPLogin(testSettings);
                cy.uiAddDirectMessage().should('exist');
                cy.uiGetLHSAddChannelButton().should('not.exist');
            });
        });
    });
    it('MM-T1427 Prevent Invite Guest for LDAP Group Synced Teams', () => {
        cy.apiCreateTeam('team', 'Team').then(({team}) => {
            cy.apiGetLDAPGroups().then((result) => {
                const board = result.body.groups.find((group) => group.name === 'board');
                cy.apiLinkGroup(board.primary_key).then(() => {
                    cy.visit(`/admin_console/user_management/teams/${team.id}`);
                    cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Team Configuration');
                    cy.findByTestId('syncGroupSwitch').scrollIntoView().click();
                    cy.get('#addGroupsToTeamToggle').scrollIntoView().click();
                    cy.get('#multiSelectList').should('be.visible');
                    cy.get('#multiSelectList>div').children().eq(0).click();
                    cy.uiGetButton('Add').click();
                    cy.get('#saveSetting').should('be.enabled').click();
                    cy.get('#genericModalLabel > span').should('be.visible').and('have.text', 'Save and remove 1 user?');
                    cy.get('#confirmModalButton').should('be.visible').click();
                    cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Mattermost Teams');
                    testSettings.user = userBoard1;
                    cy.doLDAPLogin(testSettings);
                    cy.wait(TIMEOUTS.TWO_SEC);
                    cy.visit(`/${team.name}/channels/town-square`);
                    cy.uiOpenTeamMenu('Invite people');
                    cy.wait(TIMEOUTS.TWO_SEC);
                    cy.get('#invitation_modal_title').should('be.visible');
                    cy.findByTestId('inviteGuestLink').should('not.exist');
                });
            });
        });
    });
});
function gotoGuestAccessSettings() {
    cy.visit('/admin_console/authentication/guest_access');
    cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'Guest Access');
}
function gotoLDAPSettings() {
    cy.visit('/admin_console/authentication/ldap');
    cy.get('.admin-console__header', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').and('have.text', 'AD/LDAP Wizard');
}
function promoteGuestToUser(user) {
    cy.task('externalRequest', {
        user: getAdminAccount(),
        method: 'post',
        baseUrl: Cypress.config('baseUrl'),
        path: `users/${user.id}/promote`,
    });
}
function demoteUserToGuest(user) {
    cy.task('externalRequest', {
        user: getAdminAccount(),
        method: 'post',
        baseUrl: Cypress.config('baseUrl'),
        path: `users/${user.id}/demote`,
    });
}
function removeUserFromAllTeams(user: { id: string }) {
    cy.apiGetTeamsForUser(user.id).then((teams) => {
        if (teams.length > 0) {
            teams.forEach((team: { id: string }) => {
                cy.apiDeleteUserFromTeam(team.id, user.id);
            });
        }
    });
}
function setGuestAccess(enable) {
    const inputId = 'GuestAccountsSettings.' + (enable ? 'Enabletrue' : 'Enablefalse');
    cy.findByTestId(inputId).then((elem) => {
        if (!Cypress.$(elem).is(':checked')) {
            cy.findByTestId(inputId).check().should('be.checked');
            cy.findByTestId('saveSetting').click();
            if (!enable) {
                cy.get('#confirmModalButton').click();
            }
            waitUntilConfigSave();
        }
    });
}
function setLDAPTestSettings(config) {
    return {
        siteName: config.TeamSettings.SiteName,
        siteUrl: config.ServiceSettings.SiteURL,
        teamName: '',
        user: null,
    };
}
function updateGuestFilter(value) {
    if (value) {
        cy.findByTestId('LdapSettings.GuestFilterinput').type(value);
    } else {
        cy.findByTestId('LdapSettings.GuestFilterinput').clear();
    }
    cy.findByTestId('saveSetting').click();
    waitUntilConfigSave();
}
const waitUntilConfigSave = () => {
    cy.waitUntil(() => cy.findByTestId('saveSetting').then((el) => {
        return el[0].innerText === 'Save';
    }));
};