import {test} from '@mattermost/playwright-lib';
test(
    'signup page visual check',
    {tag: ['@visual', '@signup_email_page', '@snapshots']},
    async ({pw, page, browserName, viewport}, testInfo) => {
        await pw.hasSeenLandingPage();
        const {adminClient} = await pw.getAdminClient();
        await pw.loginPage.goto();
        await pw.loginPage.toBeVisible();
        await pw.loginPage.createAccountLink.click();
        await pw.signupPage.toBeVisible();
        await pw.signupPage.title.click();
        const license = await adminClient.getClientLicenseOld();
        const editionSuffix = license.IsLicensed === 'true' ? '' : 'team edition';
        const testArgs = {page, browserName, viewport};
        await pw.matchSnapshot({...testInfo, title: `${testInfo.title} ${editionSuffix}`}, testArgs);
        const invalidUser = {email: 'invalid', username: 'a', password: 'b'};
        await pw.signupPage.create(invalidUser, false);
        await pw.signupPage.emailError.waitFor();
        await pw.signupPage.usernameError.waitFor();
        await pw.signupPage.passwordError.waitFor();
        await pw.waitForAnimationEnd(pw.signupPage.bodyCard);
        await pw.matchSnapshot({...testInfo, title: `${testInfo.title} error ${editionSuffix}`}, testArgs);
    },
);