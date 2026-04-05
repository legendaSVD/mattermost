import {test} from '@mattermost/playwright-lib';
test(
    'landing page visual check',
    {tag: ['@visual', '@landing_page', '@snapshots']},
    async ({pw, page, browserName, viewport}, testInfo) => {
        await pw.landingLoginPage.goto();
        await pw.landingLoginPage.toBeVisible();
        await pw.matchSnapshot(testInfo, {page, browserName, viewport});
    },
);