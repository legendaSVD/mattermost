import {Page} from '@playwright/test';
import {expect, test} from '@mattermost/playwright-lib';
test('should be able to scroll the post list with page up and down', async ({pw}) => {
    const {user} = await pw.initSetup();
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    for (let i = 0; i < 10; i++) {
        await channelsPage.centerView.postCreate.postMessage('a\n'.repeat(10));
    }
    let lastScrollTop = await getScrollTop(page, '#postListScrollContainer');
    channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(200);
    let currentScrollTop = await getScrollTop(page, '#postListScrollContainer');
    expect(currentScrollTop).toBeLessThan(lastScrollTop);
    lastScrollTop = currentScrollTop;
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(200);
    currentScrollTop = await getScrollTop(page, '#postListScrollContainer');
    expect(currentScrollTop).toBeLessThan(lastScrollTop);
    lastScrollTop = currentScrollTop;
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(200);
    currentScrollTop = await getScrollTop(page, '#postListScrollContainer');
    expect(currentScrollTop).toBeGreaterThan(lastScrollTop);
    lastScrollTop = currentScrollTop;
    channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(200);
    currentScrollTop = await getScrollTop(page, '#postListScrollContainer');
    expect(currentScrollTop).toBeGreaterThan(lastScrollTop);
});
async function getScrollTop(page: Page, selector: string): Promise<number> {
    const locator = await page.locator(selector);
    return locator?.evaluate((element) => element.scrollTop);
}