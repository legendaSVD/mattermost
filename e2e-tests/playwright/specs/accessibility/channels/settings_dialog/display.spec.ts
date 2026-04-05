import {expect, test} from '@mattermost/playwright-lib';
test(
    'navigate on keyboard tab between interactive elements',
    {tag: ['@accessibility', '@settings', '@display_settings']},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const globalHeader = channelsPage.globalHeader;
        const settingsModal = channelsPage.settingsModal;
        const displaySettings = settingsModal.displaySettings;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await pw.toBeFocusedWithFocusVisible(settingsModal.container);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(settingsModal.closeButton);
        await settingsModal.displayTab.click();
        await expect(displaySettings.container).toBeVisible();
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.themeEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.clockDisplayEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.teammateNameDisplayEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.availabilityStatusOnPostsEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.lastActiveTimeEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.timezoneEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.showLinkPreviewsEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.collapseImagePreviewsEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.messageDisplayEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.clickToReplyEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.channelDisplayModeEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.oneClickReactionsEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.emojiPickerEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(displaySettings.languageEditButton);
    },
);
test(
    'accessibility scan and aria-snapshot of Display settings panel',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        await expect(settingsModal.displaySettings.container).toBeVisible();
        await expect(settingsModal.displaySettings.container).toMatchAriaSnapshot(`
          - tabpanel "display":
            - heading "Display Settings" [level=3]
            - heading "Theme" [level=4]
            - button "Theme Edit": Edit
            - text: /.+/
            - heading "Clock Display" [level=4]
            - button "Clock Display Edit": Edit
            - text: /.+/
            - heading "Teammate Name Display" [level=4]
            - button "Teammate Name Display Edit": Edit
            - text: /.+/
            - heading "Show online availability on profile images" [level=4]
            - button "Show online availability on profile images Edit": Edit
            - text: /.+/
            - heading "Share last active time" [level=4]
            - button "Share last active time Edit": Edit
            - text: /.+/
            - heading "Timezone" [level=4]
            - button "Timezone Edit": Edit
            - text: /.+/
            - heading "Website Link Previews" [level=4]
            - button "Website Link Previews Edit": Edit
            - text: /.+/
            - heading "Default Appearance of Image Previews" [level=4]
            - button "Default Appearance of Image Previews Edit": Edit
            - text: /.+/
            - heading "Message Display" [level=4]
            - button "Message Display Edit": Edit
            - text: /.+/
            - heading "Click to open threads" [level=4]
            - button "Click to open threads Edit": Edit
            - text: /.+/
            - heading "Channel Display" [level=4]
            - button "Channel Display Edit": Edit
            - text: /.+/
            - heading "Quick reactions on messages" [level=4]
            - button "Quick reactions on messages Edit": Edit
            - text: /.+/
            - heading "Render emoticons as emojis" [level=4]
            - button "Render emoticons as emojis Edit": Edit
            - text: /.+/
            - heading "Language" [level=4]
            - button "Language Edit": Edit
            - text: /.+/
        `);
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .include(settingsModal.displaySettings.id)
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Theme section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.themeEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Theme" [level=4]
          - group "Theme":
            - text: Theme
            - radio "Premade Themes" [checked]
            - text: Premade Themes
            - radio "Custom Theme"
            - text: Custom Theme
            - button /.*/
            - button /.*/
            - button /.*/
            - button /.*/
            - button /.*/
            - link "See other themes"
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe
            .builder(page)
            .include(displaySettings.expandedSectionId)
            .disableRules(['color-contrast'])
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Timezone section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.timezoneEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Timezone" [level=4]
          - checkbox "Automatic" [checked]
          - text: Automatic
          - log
          - text: /.+ Select the timezone used for timestamps in the user interface and email notifications./
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Language section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.languageEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Language" [level=4]
          - text: /.+/
          - log
          - text: /.+/
          - combobox /.+/
          - text: Select which language Mattermost displays in the user interface.
          - paragraph
          - text: /.+/
          - link "Mattermost Translation Server"
          - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe
            .builder(page)
            .include(displaySettings.expandedSectionId)
            .disableRules(['color-contrast', 'link-in-text-block'])
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Clock Display section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.clockDisplayEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Clock Display" [level=4]
          - group "Clock Display":
            - text: Clock Display
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Teammate Name Display section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.teammateNameDisplayEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Teammate Name Display" [level=4]
          - group "Teammate Name Display":
            - text: Teammate Name Display
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Message Display section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.messageDisplayEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Message Display" [level=4]
          - group "Message Display":
            - text: Message Display
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Channel Display section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.channelDisplayModeEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Channel Display" [level=4]
          - group "Channel Display":
            - text: Channel Display
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Show online availability section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.availabilityStatusOnPostsEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Show online availability on profile images" [level=4]
          - group "Show online availability on profile images":
            - text: Show online availability on profile images
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Share last active time section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.lastActiveTimeEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Share last active time" [level=4]
          - group "Share last active time":
            - text: Share last active time
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Website Link Previews section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.showLinkPreviewsEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Website Link Previews" [level=4]
          - group "Website Link Previews":
            - text: Website Link Previews
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Default Appearance of Image Previews section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.collapseImagePreviewsEditButton.scrollIntoViewIfNeeded();
        await displaySettings.collapseImagePreviewsEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Default Appearance of Image Previews" [level=4]
          - group "Default Appearance of Image Previews":
            - text: Default Appearance of Image Previews
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Click to open threads section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.clickToReplyEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Click to open threads" [level=4]
          - group "Click to open threads":
            - text: Click to open threads
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Quick reactions on messages section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.oneClickReactionsEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Quick reactions on messages" [level=4]
          - group "Quick reactions on messages":
            - text: Quick reactions on messages
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Render emoticons as emojis section',
    {tag: ['@accessibility', '@settings', '@display_settings', '@snapshots']},
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
        await settingsModal.displayTab.click();
        const displaySettings = settingsModal.displaySettings;
        await displaySettings.emojiPickerEditButton.click();
        await displaySettings.expandedSection.waitFor();
        await expect(displaySettings.expandedSection).toMatchAriaSnapshot(`
          - heading "Render emoticons as emojis" [level=4]
          - group "Render emoticons as emojis":
            - text: Render emoticons as emojis
            - radio /.+/ [checked]
            - text: /.+/
            - radio /.+/
            - text: /.+/
          - separator
          - alert
          - button "Save"
          - button "Cancel"
        `);
        const accessibilityScanResults = await axe.builder(page).include(displaySettings.expandedSectionId).analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);