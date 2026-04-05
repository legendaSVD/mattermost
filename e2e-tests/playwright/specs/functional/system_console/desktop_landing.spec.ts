import {Page} from '@playwright/test';
import {expect, test} from '@mattermost/playwright-lib';
async function interceptConfigWithLandingPage(page: Page, enabled: boolean) {
    const apiUrl = '**/api/v4/config/client?format=old**';
    await page.route(apiUrl, (route) => {
        route.fulfill({
            status: 200,
            body: JSON.stringify({
                EnableDesktopLandingPage: enabled,
                EnableSignInWithUsername: 'true',
            }),
            headers: {'Content-Type': 'application/json'},
        });
    });
}
test('MM-T5640_1 should not see landing page ', async ({pw, page}) => {
    await interceptConfigWithLandingPage(page, false);
    await page.goto('/');
    await page.waitForURL(/.*\/login.*/);
    expect(page.url()).toContain('/login');
    await pw.loginPage.toBeVisible();
});
test('MM-T5640_2 should see landing page', async ({pw, page}) => {
    await page.goto('/');
    await page.waitForURL(/.*\/landing.*/, {timeout: pw.duration.ten_sec});
    expect(page.url()).toContain('/landing');
    await pw.landingLoginPage.toBeVisible();
});