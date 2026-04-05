import {expect, test} from '@mattermost/playwright-lib';
test(
    'navigate on keyboard tab between interactive elements',
    {tag: ['@accessibility', '@settings', '@notification_settings']},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const globalHeader = channelsPage.globalHeader;
        const settingsModal = channelsPage.settingsModal;
        const notificationsSettings = settingsModal.notificationsSettings;
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
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(notificationsSettings.learnMoreText);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(notificationsSettings.desktopAndMobileEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(notificationsSettings.desktopNotificationSoundEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(notificationsSettings.emailEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(notificationsSettings.keywordsTriggerNotificationsEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(notificationsSettings.keywordsGetHighlightedEditButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(notificationsSettings.testNotificationButton);
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(notificationsSettings.troubleshootingDocsButton);
    },
);
test(
    'accessibility scan and aria-snapshot of Notifications settings panel',
    {tag: ['@accessibility', '@settings', '@notification_settings', '@snapshots']},
    async ({pw, axe}) => {
        const {user, adminClient} = await pw.initSetup();
        const clientConfig = await adminClient.getClientConfig();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const globalHeader = channelsPage.globalHeader;
        const settingsModal = channelsPage.settingsModal;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await globalHeader.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(settingsModal.container).toBeVisible();
        await expect(settingsModal.notificationsSettings.container).toMatchAriaSnapshot(`
          - tabpanel "notifications":
            - heading "Notifications" [level=3]
            - link "Learn more about notifications":
              - /url: https:
              - img
            - heading "Desktop and mobile notifications Permission required" [level=4]:
              - img
            - button "Desktop and mobile notifications Permission required Edit"
            - text: Mentions, direct messages, and group messages
            - heading "Desktop notification sounds" [level=4]
            - button "Desktop notification sounds Edit"
            - text: "\\"Bing\\" for messages"
            - heading "Email notifications" [level=4]
            - button "Email notifications Edit"
            - heading "Keywords that trigger notifications" [level=4]
            - button "Keywords that trigger notifications Edit"
            - text: "\\"@${user.username}\\", \\"@channel\\", \\"@all\\", \\"@here\\""
            - heading "Keywords that get highlighted (without notifications)" [level=4]
            - button "Keywords that get highlighted (without notifications) Edit"
            - heading "Troubleshooting notifications" [level=4]
            - paragraph: Not receiving notifications? Start by sending a test notification to all your devices to check if they’re working as expected. If issues persist, explore ways to solve them with troubleshooting steps.
            - button "Send a test notification"
            - button "Troubleshooting docs 󰏌"
        `);
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .include(settingsModal.notificationsSettings.id)
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Desktop and mobile notifications section',
    {tag: ['@accessibility', '@settings', '@notification_settings', '@snapshots']},
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
        const notificationsSettings = settingsModal.notificationsSettings;
        await notificationsSettings.desktopAndMobileEditButton.click();
        await notificationsSettings.expandedSection.waitFor();
        await expect(notificationsSettings.expandedSection).toMatchAriaSnapshot({
            name: 'desktop_and_mobile_section.yml',
        });
        const accessibilityScanResults = await axe
            .builder(page)
            .include(notificationsSettings.expandedSectionId)
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Desktop notification sounds section',
    {tag: ['@accessibility', '@settings', '@notification_settings', '@snapshots']},
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
        const notificationsSettings = settingsModal.notificationsSettings;
        await notificationsSettings.desktopNotificationSoundEditButton.click();
        await notificationsSettings.expandedSection.waitFor();
        await expect(notificationsSettings.expandedSection).toMatchAriaSnapshot({
            name: 'desktop_notification_sounds_section.yml',
        });
        const accessibilityScanResults = await axe
            .builder(page)
            .include(notificationsSettings.expandedSectionId)
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Email notifications section',
    {tag: ['@accessibility', '@settings', '@notification_settings', '@snapshots']},
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
        const notificationsSettings = settingsModal.notificationsSettings;
        await notificationsSettings.emailEditButton.click();
        await notificationsSettings.expandedSection.waitFor();
        await expect(notificationsSettings.expandedSection).toMatchAriaSnapshot({
            name: 'email_notifications_section.yml',
        });
        const accessibilityScanResults = await axe
            .builder(page)
            .include(notificationsSettings.expandedSectionId)
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Keywords that trigger notifications section',
    {tag: ['@accessibility', '@settings', '@notification_settings', '@snapshots']},
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
        const notificationsSettings = settingsModal.notificationsSettings;
        await notificationsSettings.keywordsTriggerNotificationsEditButton.click();
        await notificationsSettings.expandedSection.waitFor();
        await expect(notificationsSettings.expandedSection).toMatchAriaSnapshot(`
      - heading "Keywords that trigger notifications" [level=4]
      - group "Keywords that trigger notifications":
        - checkbox "Your case-sensitive first name \\"${user.first_name}\\""
        - text: Your case-sensitive first name "${user.first_name}"
        - checkbox "Your non case-sensitive username \\"${user.username}\\""
        - text: Your non case-sensitive username "${user.username}"
        - checkbox "Channel-wide mentions \\"@channel\\", \\"@all\\", \\"@here\\"" [checked]
        - text: Channel-wide mentions "@channel", "@all", "@here"
        - checkbox "Other non case-sensitive words, press Tab or use commas to separate keywords:"
        - text: "Other non case-sensitive words, press Tab or use commas to separate keywords:"
        - log
        - combobox "Keywords that trigger notifications"
      - text: Notifications are triggered when someone sends a message that includes your username ("@${user.username}") or any of the options selected above.
      - separator
      - alert
      - button "Save"
      - button "Cancel"
    `);
        const accessibilityScanResults = await axe
            .builder(page)
            .include(notificationsSettings.expandedSectionId)
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'accessibility scan and aria-snapshot of Keywords that get highlighted (without notifications) section',
    {tag: ['@accessibility', '@settings', '@notification_settings', '@snapshots']},
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
        const notificationsSettings = settingsModal.notificationsSettings;
        await notificationsSettings.keywordsGetHighlightedEditButton.click();
        await notificationsSettings.expandedSection.waitFor();
        await expect(notificationsSettings.expandedSection).toMatchAriaSnapshot({
            name: 'keywords_that_get_highlighted_section.yml',
        });
        const accessibilityScanResults = await axe
            .builder(page)
            .include(notificationsSettings.expandedSectionId)
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);