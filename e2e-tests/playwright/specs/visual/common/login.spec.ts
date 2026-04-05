import {test} from '@mattermost/playwright-lib';
test(
    'login page visual check',
    {tag: ['@visual', '@login_page', '@snapshots']},
    async ({pw, page, browserName, viewport}, testInfo) => {
        await pw.hasSeenLandingPage();
        const {adminClient} = await pw.getAdminClient();
        await pw.loginPage.goto();
        await pw.loginPage.toBeVisible();
        await pw.loginPage.title.click();
        const testArgs = {page, browserName, viewport};
        const license = await adminClient.getClientLicenseOld();
        const editionSuffix = license.IsLicensed === 'true' ? '' : 'team edition';
        await pw.matchSnapshot({...testInfo, title: `${testInfo.title} ${editionSuffix}`}, testArgs);
        await pw.loginPage.signInButton.click();
        await pw.loginPage.userErrorLabel.waitFor();
        await pw.matchSnapshot({...testInfo, title: `${testInfo.title} error ${editionSuffix}`}, testArgs);
    },
);