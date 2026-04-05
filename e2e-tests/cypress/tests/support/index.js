import dayjs from 'dayjs';
import localforage from 'localforage';
import '@testing-library/cypress/add-commands';
import 'cypress-file-upload';
import 'cypress-wait-until';
import 'cypress-plugin-tab';
import 'cypress-real-events';
import addContext from 'mochawesome/addContext';
import './api';
import './api_commands';
import './client';
import './common_login_commands';
import './db_commands';
import './email';
import './external_commands';
import './extended_commands';
import './fetch_commands';
import './keycloak_commands';
import './ldap_commands';
import './ldap_server_commands';
import './notification_commands';
import './okta_commands';
import './saml_commands';
import './shell';
import './task_commands';
import './ui';
import './ui_commands';
import {DEFAULT_TEAM} from './constants';
import {getDefaultConfig} from './api/system';
Cypress.dayjs = dayjs;
Cypress.on('test:after:run', (test, runnable) => {
    if (test.state === 'failed') {
        let parentNames = '';
        let parent = runnable.parent;
        if (test.failedFromHookId) {
            const hookId = test.failedFromHookId.split('')[1];
            if (parent.id !== `r${hookId}`) {
                while (parent.parent && parent.parent.id !== `r${hookId}`) {
                    if (parent.title === '') {
                        break;
                    } else {
                        parent = parent.parent;
                    }
                }
            }
        }
        while (parent) {
            if (parent.title !== '') {
                parentNames = parent.title + ' -- ' + parentNames;
            }
            parent = parent.parent;
        }
        const charactersToStrip = /[;:"<>/]/g;
        parentNames = parentNames.replace(charactersToStrip, '');
        const testTitle = test.title.replace(charactersToStrip, '');
        const hookName = test.hookName ? ' -- ' + test.hookName + ' hook' : '';
        const filename = encodeURIComponent(`${parentNames}${testTitle}${hookName} (failed).png`);
        addContext({test}, {
            title: 'Failing Screenshot: >> screenshots/' + Cypress.spec.name + '/' + filename,
            value: 'screenshots/' + Cypress.spec.name + '/' + filename,
        });
    }
});
Cypress.on('uncaught:exception', () => {
    return false;
});
before(() => {
    localforage.clear();
    cy.apiAdminLogin({failOnStatusCode: false}).then((response) => {
        if (response.user) {
            sysadminSetup(response.user);
        } else {
            cy.apiCreateAdmin().then(({sysadmin}) => {
                cy.apiAdminLogin().then(() => sysadminSetup(sysadmin));
            });
        }
        switch (Cypress.env('serverEdition')) {
        case 'Cloud':
            cy.apiRequireLicenseForFeature('Cloud');
            break;
        case 'E20':
            cy.apiRequireLicense();
            break;
        default:
            break;
        }
        if (Cypress.env('serverClusterEnabled')) {
            cy.log('Checking cluster information...');
            cy.shouldHaveClusterEnabled();
            cy.apiGetClusterStatus().then(({clusterInfo}) => {
                const sameCount = clusterInfo?.length === Cypress.env('serverClusterHostCount');
                expect(sameCount, sameCount ? '' : `Should match number of hosts in a cluster as expected. Got "${clusterInfo?.length}" but expected "${Cypress.env('serverClusterHostCount')}"`).to.equal(true);
                clusterInfo.forEach((info) => cy.log(`hostname: ${info.hostname}, version: ${info.version}, config_hash: ${info.config_hash}`));
            });
        }
        printLicenseStatus();
        printServerDetails();
    });
});
beforeEach(() => {
    cy.then(() => null);
});
function printLicenseStatus() {
    cy.apiGetClientLicense().then(({license}) => {
        cy.log(`Server License:
  - IsLicensed      = ${license.IsLicensed}
  - IsTrial         = ${license.IsTrial}
  - SkuName         = ${license.SkuName}
  - SkuShortName    = ${license.SkuShortName}
  - Cloud           = ${license.Cloud}
  - Users           = ${license.Users}`);
    });
}
function printServerDetails() {
    cy.apiGetConfig(true).then(({config}) => {
        cy.log(`Build Info:
  - BuildNumber             = ${config.BuildNumber}
  - BuildDate               = ${config.BuildDate}
  - Version                 = ${config.Version}
  - BuildHash               = ${config.BuildHash}
  - BuildHashEnterprise     = ${config.BuildHashEnterprise}
  - BuildEnterpriseReady    = ${config.BuildEnterpriseReady}
  - TelemetryId             = ${config.TelemetryId}
  - ServiceEnvironment      = ${config.ServiceEnvironment}`);
    });
    cy.apiGetConfig().then(({config}) => {
        cy.log(`Notable Server Config:
  - ServiceSettings.EnableSecurityFixAlert  = ${config.ServiceSettings.EnableSecurityFixAlert}
  - LogSettings.EnableDiagnostics           = ${config.LogSettings?.EnableDiagnostics}`);
    });
}
function sysadminSetup(user) {
    if (Cypress.env('firstTest')) {
        cy.externalRequest({user, method: 'put', path: 'config', data: getDefaultConfig(), failOnStatusCode: false});
    }
    cy.apiUpdateConfig();
    if (!user.email_verified) {
        cy.apiVerifyUserEmailById(user.id);
    }
    resetUserPreference(user.id);
    cy.apiUpdateUserStatus('online');
    cy.apiPatchMe({
        locale: 'en',
        timezone: {automaticTimezone: '', manualTimezone: 'UTC', useAutomaticTimezone: 'false'},
    });
    cy.apiGetClientLicense().then(({isLicensed}) => {
        if (isLicensed) {
            cy.apiResetRoles();
        }
    });
    cy.apiDisableNonPrepackagedPlugins();
    cy.apiDeactivateTestBots();
    cy.apiDisableTutorials(user.id);
    cy.apiGetTeamsForUser().then(({teams}) => {
        const defaultTeam = teams && teams.length > 0 && teams.find((team) => team.name === DEFAULT_TEAM.name);
        if (!defaultTeam) {
            cy.apiCreateTeam(DEFAULT_TEAM.name, DEFAULT_TEAM.display_name, 'O', false);
        } else if (defaultTeam && Cypress.env('resetBeforeTest')) {
            teams.forEach((team) => {
                if (team.name !== DEFAULT_TEAM.name) {
                    cy.apiDeleteTeam(team.id);
                }
            });
            cy.apiGetChannelsForUser('me', defaultTeam.id).then(({channels}) => {
                channels.forEach((channel) => {
                    if (
                        (channel.team_id === defaultTeam.id || channel.team_name === defaultTeam.name) &&
                        (channel.name !== 'town-square' && channel.name !== 'off-topic')
                    ) {
                        cy.apiDeleteChannel(channel.id);
                    }
                });
            });
        }
    });
}
function resetUserPreference(userId) {
    cy.apiSaveTeammateNameDisplayPreference('username');
    cy.apiSaveLinkPreviewsPreference('true');
    cy.apiSaveCollapsePreviewsPreference('false');
    cy.apiSaveClockDisplayModeTo24HourPreference(false);
    cy.apiSaveTutorialStep(userId, '999');
    cy.apiSaveOnboardingTaskListPreference(userId, 'onboarding_task_list_open', 'false');
    cy.apiSaveOnboardingTaskListPreference(userId, 'onboarding_task_list_show', 'false');
    cy.apiSaveCloudTrialBannerPreference(userId, 'trial', 'max_days_banner');
    cy.apiSaveSkipStepsPreference(userId, 'true');
    cy.apiSaveStartTrialModal(userId, 'true');
    cy.apiSaveUnreadScrollPositionPreference(userId, 'start_from_left_off');
}