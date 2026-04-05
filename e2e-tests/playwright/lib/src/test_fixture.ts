import {Browser, Page, test as base} from '@playwright/test';
import {AxeResults} from 'axe-core';
import {AxeBuilder} from '@axe-core/playwright';
import {TestBrowser} from './browser_context';
import {
    ensureLicense,
    ensurePluginsLoaded,
    ensureServerDeployment,
    shouldHaveCallsEnabled,
    shouldHaveFeatureFlag,
    shouldRunInLinux,
    skipIfFeatureFlagNotSet,
    skipIfNoLicense,
} from './flag';
import {getBlobFromAsset, getFileFromAsset} from './file';
import {
    createNewUserProfile,
    createNewTeam,
    createRandomChannel,
    createRandomPost,
    createRandomTeam,
    createRandomUser,
    createUserWithAttributes,
    getAdminClient,
    initSetup,
    isOutsideRemoteUserHour,
    makeClient,
    mergeWithOnPremServerConfig,
    installAndEnablePlugin,
    isPluginActive,
} from './server';
import {
    toBeFocusedWithFocusVisible,
    hideDynamicChannelsContent,
    waitForAnimationEnd,
    waitUntil,
    logFocusedElement,
} from './test_action';
import {pages} from './ui/pages';
import {matchSnapshot} from './visual';
import {stubNotification, waitForNotification} from './mock_browser_api';
import {duration, getRandomId, simpleEmailRe, wait} from './util';
export {expect} from '@playwright/test';
export type ExtendedFixtures = {
    axe: AxeBuilderExtended;
    pw: PlaywrightExtended;
};
type AxeBuilderOptions = {
    disableColorContrast?: boolean;
    disableLinkInTextBlock?: boolean;
};
export const test = base.extend<ExtendedFixtures>({
    axe: async ({}, use) => {
        const ab = new AxeBuilderExtended();
        await use(ab);
    },
    pw: async ({browser, page, isMobile}, use) => {
        const pw = new PlaywrightExtended(browser, page, isMobile);
        await use(pw);
        await pw.testBrowser.close();
    },
});
export class PlaywrightExtended {
    readonly testBrowser;
    readonly shouldHaveCallsEnabled;
    readonly shouldHaveFeatureFlag;
    readonly shouldRunInLinux;
    readonly ensureLicense;
    readonly ensureServerDeployment;
    readonly skipIfNoLicense;
    readonly skipIfFeatureFlagNotSet;
    readonly getBlobFromAsset;
    readonly getFileFromAsset;
    readonly ensurePluginsLoaded;
    readonly getAdminClient;
    readonly mergeWithOnPremServerConfig;
    readonly initSetup;
    readonly installAndEnablePlugin;
    readonly isPluginActive;
    readonly toBeFocusedWithFocusVisible;
    readonly hideDynamicChannelsContent;
    readonly waitForAnimationEnd;
    readonly waitUntil;
    readonly logFocusedElement;
    readonly stubNotification;
    readonly waitForNotification;
    readonly createNewUserProfile;
    readonly createNewTeam;
    readonly isOutsideRemoteUserHour;
    readonly makeClient;
    readonly matchSnapshot;
    readonly duration;
    readonly simpleEmailRe;
    readonly wait;
    readonly random;
    readonly loginPage;
    readonly landingLoginPage;
    readonly signupPage;
    readonly resetPasswordPage;
    readonly hasSeenLandingPage;
    constructor(browser: Browser, page: Page, isMobile: boolean) {
        this.testBrowser = new TestBrowser(browser);
        this.shouldHaveCallsEnabled = shouldHaveCallsEnabled;
        this.shouldHaveFeatureFlag = shouldHaveFeatureFlag;
        this.shouldRunInLinux = shouldRunInLinux;
        this.ensureLicense = ensureLicense;
        this.ensureServerDeployment = ensureServerDeployment;
        this.skipIfNoLicense = skipIfNoLicense;
        this.skipIfFeatureFlagNotSet = skipIfFeatureFlagNotSet;
        this.getBlobFromAsset = getBlobFromAsset;
        this.getFileFromAsset = getFileFromAsset;
        this.ensurePluginsLoaded = ensurePluginsLoaded;
        this.initSetup = initSetup;
        this.getAdminClient = getAdminClient;
        this.mergeWithOnPremServerConfig = mergeWithOnPremServerConfig;
        this.isOutsideRemoteUserHour = isOutsideRemoteUserHour;
        this.installAndEnablePlugin = installAndEnablePlugin;
        this.isPluginActive = isPluginActive;
        this.toBeFocusedWithFocusVisible = toBeFocusedWithFocusVisible;
        this.hideDynamicChannelsContent = hideDynamicChannelsContent;
        this.waitForAnimationEnd = waitForAnimationEnd;
        this.waitUntil = waitUntil;
        this.logFocusedElement = logFocusedElement;
        this.loginPage = new pages.LoginPage(page);
        this.landingLoginPage = new pages.LandingLoginPage(page, isMobile);
        this.signupPage = new pages.SignupPage(page);
        this.resetPasswordPage = new pages.ResetPasswordPage(page);
        this.stubNotification = stubNotification;
        this.waitForNotification = waitForNotification;
        this.createNewUserProfile = createNewUserProfile;
        this.createNewTeam = createNewTeam;
        this.makeClient = makeClient;
        this.matchSnapshot = matchSnapshot;
        this.duration = duration;
        this.wait = wait;
        this.simpleEmailRe = simpleEmailRe;
        this.random = {
            id: getRandomId,
            channel: createRandomChannel,
            post: createRandomPost,
            team: createRandomTeam,
            user: createRandomUser,
            userWithAttributes: createUserWithAttributes,
        };
        this.hasSeenLandingPage = async () => {
            await page.goto('/');
            return await waitUntilLocalStorageIsSet(page, '__landingPageSeen__', 'true');
        };
    }
}
export class AxeBuilderExtended {
    readonly builder: (page: Page, options?: AxeBuilderOptions) => AxeBuilder;
    readonly tags: string[] = ['wcag2a', 'wcag2aa', 'wcag21aa'];
    constructor() {
        this.builder = (page: Page, options: AxeBuilderOptions = {}) => {
            const disabledRules: string[] = [];
            if (options.disableColorContrast) {
                disabledRules.push('color-contrast');
            }
            if (options.disableLinkInTextBlock) {
                disabledRules.push('link-in-text-block');
            }
            return new AxeBuilder({page}).withTags(this.tags).disableRules(disabledRules);
        };
    }
    violationFingerprints(accessibilityScanResults: AxeResults) {
        const fingerprints = accessibilityScanResults.violations.map((violation) => ({
            rule: violation.id,
            description: violation.description,
            helpUrl: violation.helpUrl,
            targets: violation.nodes.map((node) => {
                return {target: node.target, impact: node.impact, html: node.html};
            }),
        }));
        return JSON.stringify(fingerprints, null, 2);
    }
}
async function waitUntilLocalStorageIsSet(page: Page, key: string, value: string, timeout = duration.ten_sec) {
    await waitUntil(
        () =>
            page.evaluate(
                ({key, value}) => {
                    if (localStorage.getItem(key) === value) {
                        return true;
                    }
                    localStorage.setItem(key, value);
                    return false;
                },
                {key, value},
            ),
        {timeout},
    );
}