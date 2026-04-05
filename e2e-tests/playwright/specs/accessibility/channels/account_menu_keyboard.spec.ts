import {Page} from '@playwright/test';
import {UserProfile} from '@mattermost/types/users';
import {expect, test, ChannelsPage} from '@mattermost/playwright-lib';
test('MM-63451 should be able to navigate the account settings menu with the keyboard after opening it with the mouse', async ({
    pw,
}) => {
    const {user} = await pw.initSetup();
    const {page, channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.globalHeader.accountMenuButton.click();
    await testMenuWithKeyboard(user, page, channelsPage);
});
test('MM-63451 should be able to navigate the account settings menu with the keyboard after opening it with the keyboard', async ({
    pw,
}) => {
    const {user} = await pw.initSetup();
    const {page, channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.globalHeader.accountMenuButton.focus();
    await expect(channelsPage.globalHeader.accountMenuButton).toBeFocused();
    await page.keyboard.press('Space');
    await testMenuWithKeyboard(user, page, channelsPage);
});
async function testMenuWithKeyboard(user: UserProfile, page: Page, channelsPage: ChannelsPage) {
    await expect(page.getByRole('menuitem', {name: '@' + user.username})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: 'Set custom status'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: 'Online'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: 'Away'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: 'Do not disturb Disables all notifications'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: 'Offline'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: 'Profile'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: 'Log Out'})).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', {name: 'Profile'})).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', {name: 'Offline'})).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', {name: 'Do not disturb Disables all notifications'})).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('menuitem', {name: "Don't clear"})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: '30 mins'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: '1 hour'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: '2 hours'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: 'Tomorrow'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: 'Choose date and time'})).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', {name: "Don't clear"})).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', {name: 'Choose date and time'})).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('menuitem', {name: 'Do not disturb Disables all notifications'})).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem')).toHaveCount(0);
    await expect(channelsPage.globalHeader.accountMenuButton).toBeFocused();
}