import {expect, test} from '@mattermost/playwright-lib';
test(
    'navigate on keyboard tab between interactive elements',
    {tag: ['@accessibility', '@settings', '@advanced_settings']},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const globalHeader = channelsPage.globalHeader;
        const settingsModal = channelsPage.settingsModal;
        const advancedSettings = settingsModal.advancedSettings;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await pw.toBeFocusedWithFocusVisible(settingsModal.container);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(settingsModal.closeButton);
        await settingsModal.advancedTab.click();
        await expect(advancedSettings.container).toBeVisible();
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(advancedSettings.ctrlEnterEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(advancedSettings.postFormattingEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(advancedSettings.joinLeaveEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(advancedSettings.scrollPositionEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(advancedSettings.syncDraftsEditButton);
    },
);
test(
    'accessibility scan and aria-snapshot of Advanced settings panel',
    {tag: ['@accessibility', '@settings', '@advanced_settings', '@snapshots']},
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
        await settingsModal.advancedTab.click();
        await expect(settingsModal.advancedSettings.container).toBeVisible();
        await expect(settingsModal.advancedSettings.container).toMatchAriaSnapshot(`
          - tabpanel "advanced":
            - heading "Advanced Settings" [level=3]
            - heading /Send Messages on (CTRL|⌘)\\+ENTER/ [level=4]
            - button /Send Messages on (CTRL|⌘)\\+ENTER Edit/
            - text: /(On for all messages|On only for code blocks starting with \`\`\`|Off)/
            - heading "Enable Post Formatting" [level=4]
            - button "Enable Post Formatting Edit"
            - text: /(On|Off)/
            - heading "Enable Join/Leave Messages" [level=4]
            - button "Enable Join/Leave Messages Edit"
            - text: /(On|Off)/
            - heading "Scroll position when viewing an unread channel" [level=4]
            - button "Scroll position when viewing an unread channel Edit"
            - text: /(Start me where I left off|Start me at the newest message)/
            - heading "Allow message drafts to sync with the server" [level=4]
            - button "Allow message drafts to sync with the server Edit"
            - text: /(On|Off)/
        `);
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .include(settingsModal.advancedSettings.id)
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Send Messages on CTRL+ENTER section',
    {tag: ['@accessibility', '@settings', '@advanced_settings', '@snapshots']},
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
        await settingsModal.advancedTab.click();
        const advancedSettings = settingsModal.advancedSettings;
        await advancedSettings.ctrlEnterEditButton.click();
        await advancedSettings.expandedSection.waitFor();
        await expect(advancedSettings.expandedSection).toMatchAriaSnapshot(`
          - heading /Send Messages on (CTRL|⌘)\\+ENTER/ [level=4]
          - group /Send Messages on (CTRL|⌘)\\+ENTER/:
            - text: /Send Messages on (CTRL|⌘)\\+ENTER/
            - radio "On for all messages"
            - text: On for all messages
            - radio /(On only for code blocks starting with \`\`\`|On only for code blocks starting with \\\`\\\`\\\`)/ [checked]
            - text: /(On only for code blocks starting with \`\`\`|On only for code blocks starting with \\\`\\\`\\\`)/
            - radio "Off"
            - text: /Off When enabled, (CTRL|⌘) \\+ ENTER will send the message and ENTER inserts a new line\\./
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(advancedSettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Enable Post Formatting section',
    {tag: ['@accessibility', '@settings', '@advanced_settings', '@snapshots']},
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
        await settingsModal.advancedTab.click();
        const advancedSettings = settingsModal.advancedSettings;
        await advancedSettings.postFormattingEditButton.click();
        await advancedSettings.expandedSection.waitFor();
        await expect(advancedSettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Enable Post Formatting" [level=4]
          - group "Enable Post Formatting":
            - radio /(On|Off)/ [checked]
            - text: /(On|Off)/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(advancedSettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Enable Join/Leave Messages section',
    {tag: ['@accessibility', '@settings', '@advanced_settings', '@snapshots']},
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
        await settingsModal.advancedTab.click();
        const advancedSettings = settingsModal.advancedSettings;
        await advancedSettings.joinLeaveEditButton.click();
        await advancedSettings.expandedSection.waitFor();
        await expect(advancedSettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Enable Join/Leave Messages" [level=4]
          - group "Enable Join/Leave Messages":
            - text: Enable Join/Leave Messages
            - radio "On" [checked]
            - text: "On"
            - radio "Off"
            - text: /Off When "On", System Messages saying a user has joined or left a channel will be visible\\./
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(advancedSettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Scroll position section',
    {tag: ['@accessibility', '@settings', '@advanced_settings', '@snapshots']},
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
        await settingsModal.advancedTab.click();
        const advancedSettings = settingsModal.advancedSettings;
        await advancedSettings.scrollPositionEditButton.click();
        await advancedSettings.expandedSection.waitFor();
        await expect(advancedSettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Scroll position when viewing an unread channel" [level=4]
          - group "Scroll position when viewing an unread channel":
            - text: Scroll position when viewing an unread channel
            - radio "Start me where I left off" [checked]
            - text: Start me where I left off
            - radio "Start me at the newest message"
            - text: /Start me at the newest message Choose your scroll position when you view an unread channel\\./
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(advancedSettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Allow message drafts to sync section',
    {tag: ['@accessibility', '@settings', '@advanced_settings', '@snapshots']},
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
        await settingsModal.advancedTab.click();
        const advancedSettings = settingsModal.advancedSettings;
        await advancedSettings.syncDraftsEditButton.click();
        await advancedSettings.expandedSection.waitFor();
        await expect(advancedSettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Allow message drafts to sync with the server" [level=4]
          - group "Allow message drafts to sync with the server":
            - text: Allow message drafts to sync with the server
            - radio "On" [checked]
            - text: "On"
            - radio "Off"
            - text: /Off When enabled, message drafts are synced with the server/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(advancedSettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);