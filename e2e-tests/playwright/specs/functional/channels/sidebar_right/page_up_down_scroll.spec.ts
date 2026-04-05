import {Page} from '@playwright/test';
import {expect, test} from '@mattermost/playwright-lib';
test('should be able to scroll the RHS with page up and down', async ({pw}) => {
    const {user} = await pw.initSetup();
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.centerView.postCreate.postMessage('post');
    const lastPost = await channelsPage.getLastPost();
    await lastPost.reply();
    for (let i = 0; i < 10; i++) {
        await channelsPage.sidebarRight.postCreate.postMessage('a\n'.repeat(10));
    }
    let lastScrollTop = await getScrollTop(page, '#threadViewerScrollContainer');
    channelsPage.sidebarRight.postCreate.input.focus();
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(200);
    let currentScrollTop = await getScrollTop(page, '#threadViewerScrollContainer');
    expect(currentScrollTop).toBeLessThan(lastScrollTop);
    lastScrollTop = currentScrollTop;
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(200);
    currentScrollTop = await getScrollTop(page, '#threadViewerScrollContainer');
    expect(currentScrollTop).toBeLessThan(lastScrollTop);
    lastScrollTop = currentScrollTop;
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(200);
    currentScrollTop = await getScrollTop(page, '#threadViewerScrollContainer');
    expect(currentScrollTop).toBeGreaterThan(lastScrollTop);
    lastScrollTop = currentScrollTop;
    channelsPage.centerView.postCreate.input.focus();
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(200);
    currentScrollTop = await getScrollTop(page, '#threadViewerScrollContainer');
    expect(currentScrollTop).toBeGreaterThan(lastScrollTop);
});
async function getScrollTop(page: Page, selector: string): Promise<number> {
    const locator = await page.locator(selector);
    return locator?.evaluate((element) => element.scrollTop);
}