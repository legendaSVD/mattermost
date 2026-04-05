import {expect, test} from '@mattermost/playwright-lib';
test('Settings sidebar should be keyboard accessible', async ({axe, pw}) => {
    const {user} = await pw.initSetup();
    const {page, channelsPage} = await pw.testBrowser.login(user);
    const ab = axe.builder(page).disableRules([
        'color-contrast',
        'aria-required-children',
        'aria-required-parent',
    ]);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    const settingsModal = await channelsPage.globalHeader.openSettings();
    const accessibilityScanResults = await ab.analyze();
    expect(accessibilityScanResults.violations).toHaveLength(0);
    await settingsModal.container.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('tab', {name: 'Notifications'})).toBeFocused();
    await expect(page.getByText('Desktop and mobile notifications')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('tab', {name: 'Display'})).toBeFocused();
    await expect(page.getByText('Theme', {exact: true})).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('tab', {name: 'Sidebar'})).toBeFocused();
    await expect(page.getByText('Group unread channels separately')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('tab', {name: 'Advanced'})).toBeFocused();
    await expect(page.getByText('Enable Post Formatting')).toBeVisible();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('tab', {name: 'Sidebar'})).toBeFocused();
    await expect(page.getByText('Group unread channels separately')).toBeVisible();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('tab', {name: 'Display'})).toBeFocused();
    await expect(page.getByText('Theme', {exact: true})).toBeVisible();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('tab', {name: 'Notifications'})).toBeFocused();
    await expect(page.getByText('Desktop and mobile notifications')).toBeVisible();
});