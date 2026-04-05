import {expect, test} from '@mattermost/playwright-lib';
test(
    'manages focus when opening and closing settings modal with keyboard',
    {tag: ['@accessibility', '@settings']},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const globalHeader = channelsPage.globalHeader;
        const settingsModal = channelsPage.settingsModal;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await pw.toBeFocusedWithFocusVisible(settingsModal.container);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(settingsModal.closeButton);
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).not.toBeVisible();
        await pw.toBeFocusedWithFocusVisible(globalHeader.settingsButton);
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(settingsModal.container).not.toBeVisible();
        await pw.toBeFocusedWithFocusVisible(globalHeader.settingsButton);
    },
);
test('navigates between settings tabs using arrow keys', {tag: ['@accessibility', '@settings']}, async ({pw}) => {
    const {user} = await pw.initSetup();
    const {page, channelsPage} = await pw.testBrowser.login(user);
    const settingsModal = channelsPage.settingsModal;
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.globalHeader.settingsButton.focus();
    await page.keyboard.press('Enter');
    await expect(settingsModal.container).toBeVisible();
    await pw.toBeFocusedWithFocusVisible(settingsModal.container);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(settingsModal.notificationsTab).toBeVisible();
    await pw.toBeFocusedWithFocusVisible(settingsModal.notificationsTab);
    await expect(settingsModal.notificationsSettings.container).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await pw.toBeFocusedWithFocusVisible(settingsModal.displayTab);
    await expect(settingsModal.displaySettings.container).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(settingsModal.sidebarTab).toBeVisible();
    await pw.toBeFocusedWithFocusVisible(settingsModal.sidebarTab);
    await expect(settingsModal.sidebarSettings.container).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await pw.toBeFocusedWithFocusVisible(settingsModal.advancedTab);
    await expect(settingsModal.advancedSettings.container).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(settingsModal.notificationsTab).toBeVisible();
    await pw.toBeFocusedWithFocusVisible(settingsModal.notificationsTab);
    await expect(settingsModal.notificationsSettings.container).toBeVisible();
    await page.keyboard.press('ArrowUp');
    await expect(settingsModal.advancedTab).toBeVisible();
    await pw.toBeFocusedWithFocusVisible(settingsModal.advancedTab);
    await expect(settingsModal.advancedSettings.container).toBeVisible();
});
test(
    'passes accessibility scan on notifications settings panel',
    {tag: ['@accessibility', '@settings']},
    async ({pw, axe}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const settingsModal = channelsPage.settingsModal;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await expect(settingsModal.notificationsSettings.container).toBeVisible();
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .disableRules([
                'color-contrast',
                'aria-required-children',
                'aria-required-parent',
            ])
            .include(settingsModal.getContainerId())
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'passes accessibility scan on display settings panel',
    {tag: ['@accessibility', '@settings']},
    async ({pw, axe}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const settingsModal = channelsPage.settingsModal;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await settingsModal.openDisplayTab();
        await expect(settingsModal.displaySettings.container).toBeVisible();
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .disableRules([
                'color-contrast',
                'aria-required-children',
                'aria-required-parent',
            ])
            .include(settingsModal.getContainerId())
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'passes accessibility scan on sidebar settings panel',
    {tag: ['@accessibility', '@settings']},
    async ({pw, axe}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const settingsModal = channelsPage.settingsModal;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await settingsModal.openSidebarTab();
        await expect(settingsModal.sidebarSettings.container).toBeVisible();
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .disableRules([
                'color-contrast',
                'aria-required-children',
                'aria-required-parent',
            ])
            .include(settingsModal.getContainerId())
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'passes accessibility scan on advanced settings panel',
    {tag: ['@accessibility', '@settings']},
    async ({pw, axe}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const settingsModal = channelsPage.settingsModal;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await settingsModal.openAdvancedTab();
        await expect(settingsModal.advancedSettings.container).toBeVisible();
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .disableRules([
                'color-contrast',
                'aria-required-children',
                'aria-required-parent',
            ])
            .include(settingsModal.getContainerId())
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);