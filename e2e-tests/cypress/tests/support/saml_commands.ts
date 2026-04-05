import {AdminConfig} from '@mattermost/types/config';
import * as TIMEOUTS from '../fixtures/timeouts';
import {ChainableT} from '../types';
import {stubClipboard} from '../utils';
interface SAMLUser {
    username: string;
    password: string;
    email: string;
    firstname: string;
    lastname: string;
    userType: string;
    isGuest?: boolean;
}
interface TestSettings {
    loginButtonText: string;
    siteName: string;
    siteUrl: string;
    teamName: string;
    user: SAMLUser | null;
}
function checkCreateTeamPage(settings: TestSettings) {
    if (settings.user.userType === 'Guest' || settings.user.isGuest) {
        cy.findByText('Create a team').scrollIntoView().should('not.exist');
    } else {
        cy.findByText('Create a team').scrollIntoView().should('be.visible');
    }
}
Cypress.Commands.add('checkCreateTeamPage', checkCreateTeamPage);
function doSamlLogin(settings) {
    cy.apiLogout();
    cy.visit('/login');
    cy.checkLoginPage(settings);
    return cy.findByText(settings.loginButtonText).should('be.visible').click().wait(TIMEOUTS.ONE_SEC);
}
Cypress.Commands.add('doSamlLogin', doSamlLogin);
function doSamlLogout(settings) {
    cy.checkLeftSideBar(settings);
    cy.uiLogout();
    return cy.checkLoginPage(settings);
}
Cypress.Commands.add('doSamlLogout', doSamlLogout);
function getInvitePeopleLink(settings: TestSettings): ChainableT<any> {
    cy.checkLeftSideBar(settings);
    cy.uiOpenTeamMenu('Invite people');
    stubClipboard().as('clipboard');
    cy.checkInvitePeoplePage();
    cy.findByTestId('InviteView__copyInviteLink').click();
    return cy.get('@clipboard').its('contents').then((text) => {
        cy.uiClose();
        return cy.wrap(text);
    });
}
Cypress.Commands.add('getInvitePeopleLink', getInvitePeopleLink);
function setTestSettings(loginButtonText: string, config: AdminConfig): ChainableT<TestSettings> {
    return cy.wrap({
        loginButtonText,
        siteName: config.TeamSettings.SiteName,
        siteUrl: config.ServiceSettings.SiteURL,
        teamName: '',
        user: null,
    });
}
Cypress.Commands.add('setTestSettings', setTestSettings);
declare global {
    namespace Cypress {
        interface Chainable {
            checkCreateTeamPage: typeof checkCreateTeamPage;
            doSamlLogin: typeof doSamlLogin;
            doSamlLogout: typeof doSamlLogout;
            getInvitePeopleLink: typeof getInvitePeopleLink;
            setTestSettings: typeof setTestSettings;
        }
    }
}