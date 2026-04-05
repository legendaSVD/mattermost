import {expect, test} from '@mattermost/playwright-lib';
test(
    'navigate on keyboard tab between interactive elements',
    {tag: ['@accessibility', '@settings', '@sidebar_settings']},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const globalHeader = channelsPage.globalHeader;
        const settingsModal = channelsPage.settingsModal;
        const sidebarSettings = settingsModal.sidebarSettings;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await pw.toBeFocusedWithFocusVisible(settingsModal.container);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(settingsModal.closeButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(settingsModal.notificationsTab);
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(settingsModal.displayTab);
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(settingsModal.sidebarTab);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(sidebarSettings.groupUnreadEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(sidebarSettings.limitVisibleDMsEditButton);
    },
);
test(
    'accessibility scan and aria-snapshot of Sidebar settings panel',
    {tag: ['@accessibility', '@settings', '@sidebar_settings', '@snapshots']},
    async ({pw, axe}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const globalHeader = channelsPage.globalHeader;
        const settingsModal = channelsPage.settingsModal;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await settingsModal.openSidebarTab();
        await expect(settingsModal.sidebarSettings.container).toMatchAriaSnapshot(`
          - tabpanel "sidebar":
            - heading "Sidebar Settings" [level=3]
            - heading "Group unread channels separately" [level=4]
            - button "Group unread channels separately Edit": Edit
            - text: "Off"
            - heading "Number of direct messages to show" [level=4]
            - button "Number of direct messages to show Edit": Edit
            - text: "40"
        `);
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .include(settingsModal.sidebarSettings.id)
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Group unread channels separately section',
    {tag: ['@accessibility', '@settings', '@sidebar_settings', '@snapshots']},
    async ({pw, axe}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const globalHeader = channelsPage.globalHeader;
        const settingsModal = channelsPage.settingsModal;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await settingsModal.openSidebarTab();
        const sidebarSettings = settingsModal.sidebarSettings;
        await sidebarSettings.groupUnreadEditButton.click();
        await sidebarSettings.expandedSection.waitFor();
        await expect(sidebarSettings.expandedSection).toMatchAriaSnapshot({
            name: 'group_unread_channels_section.yml',
        });
        const accessibilityScanResults = await axe.builder(page).include(sidebarSettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Number of direct messages to show section',
    {tag: ['@accessibility', '@settings', '@sidebar_settings', '@snapshots']},
    async ({pw, axe}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const globalHeader = channelsPage.globalHeader;
        const settingsModal = channelsPage.settingsModal;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await settingsModal.openSidebarTab();
        const sidebarSettings = settingsModal.sidebarSettings;
        await sidebarSettings.limitVisibleDMsEditButton.click();
        await sidebarSettings.expandedSection.waitFor();
        await expect(sidebarSettings.expandedSection).toMatchAriaSnapshot({
            name: 'number_of_direct_messages_section.yml',
        });
        const accessibilityScanResults = await axe
            .builder(page)
            .include(sidebarSettings.expandedSectionId)
            .exclude('#react-select-2-input')
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);