import {expect, test} from '@mattermost/playwright-lib';
test(
    'settings modal visual check',
    {tag: ['@visual', '@settings', '@snapshots']},
    async ({pw, browserName, viewport}, testInfo) => {
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
        const testArgs = {page, browserName, viewport};
        await pw.hideDynamicChannelsContent(page);
        await pw.matchSnapshot(
            {...testInfo, title: `${testInfo.title}`},
            {...testArgs, locator: settingsModal.content},
        );
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(settingsModal.closeButton);
        await pw.matchSnapshot(
            {...testInfo, title: `${testInfo.title} close button`},
            {...testArgs, locator: settingsModal.content},
        );
        await page.keyboard.press('Tab');
        await pw.toBeFocusedWithFocusVisible(settingsModal.notificationsTab);
        await pw.matchSnapshot(
            {...testInfo, title: `${testInfo.title} notifications tab`},
            {...testArgs, locator: settingsModal.content},
        );
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(settingsModal.displayTab);
        await pw.matchSnapshot(
            {...testInfo, title: `${testInfo.title} display tab`},
            {...testArgs, locator: settingsModal.content},
        );
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(settingsModal.sidebarTab);
        await pw.matchSnapshot(
            {...testInfo, title: `${testInfo.title} sidebar tab`},
            {...testArgs, locator: settingsModal.content},
        );
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(settingsModal.advancedTab);
        await pw.matchSnapshot(
            {...testInfo, title: `${testInfo.title} advanced tab`},
            {...testArgs, locator: settingsModal.content},
        );
    },
);