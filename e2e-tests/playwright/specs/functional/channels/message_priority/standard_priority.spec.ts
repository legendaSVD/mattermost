import {expect, test} from '@mattermost/playwright-lib';
test(
    'MM-T5139 posts message with standard priority and verifies no priority labels appear',
    {tag: ['@smoke', '@message_priority']},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.centerView.postCreate.openPriorityMenu();
        await channelsPage.messagePriority.verifyPriorityDialog();
        await channelsPage.messagePriority.verifyStandardPrioritySelected();
        await channelsPage.messagePriority.closePriorityMenu();
        const testMessage = 'This is just a test message';
        await channelsPage.postMessage(testMessage);
        const lastPost = await channelsPage.getLastPost();
        await lastPost.toBeVisible();
        await lastPost.toContainText(testMessage);
        await expect(lastPost.container.locator('.post-priority')).not.toBeVisible();
        await lastPost.container.click();
        await channelsPage.sidebarRight.toBeVisible();
        const rhsPost = await channelsPage.sidebarRight.getLastPost();
        await rhsPost.toBeVisible();
        await rhsPost.toContainText(testMessage);
        await expect(rhsPost.container.locator('.post-priority')).not.toBeVisible();
        await expect(channelsPage.sidebarRight.postCreate.priorityButton).not.toBeVisible();
    },
);