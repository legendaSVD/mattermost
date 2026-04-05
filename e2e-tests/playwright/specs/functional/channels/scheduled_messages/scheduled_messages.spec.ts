import {expect, test, ScheduledPostIndicator} from '@mattermost/playwright-lib';
import type {ChannelsPage, ScheduledPostsPage} from '@mattermost/playwright-lib';
test.beforeEach(async ({pw}) => {
    await pw.ensureLicense();
    await pw.skipIfNoLicense();
});
test.fixme(
    'MM-T5643_1 creates scheduled message from channel and posts at scheduled time',
    {tag: '@scheduled_messages'},
    async ({pw}) => {
        test.setTimeout(pw.duration.four_min);
        const draftMessage = `Scheduled Draft ${pw.random.id()}`;
        const {user} = await pw.initSetup();
        const {page, channelsPage, scheduledPostsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        const {selectedDate, selectedTime} = await channelsPage.scheduleMessage(draftMessage, 0, 1);
        await verifyScheduledPostIndicator(channelsPage.centerView.scheduledPostIndicator, selectedDate, selectedTime);
        await verifyScheduledPostBadgeOnLeftSidebar(channelsPage, 1);
        await channelsPage.centerView.scheduledPostIndicator.seeAllLink.click();
        await verifyScheduledPost(scheduledPostsPage, {draftMessage, selectedDate, selectedTime, badgeCountOnTab: 1});
        await page.goBack();
        await pw.waitUntil(
            async () => {
                const post = await channelsPage.getLastPost();
                const content = await post.container.textContent();
                return content?.includes(draftMessage);
            },
            {timeout: pw.duration.two_min},
        );
        await channelsPage.centerView.scheduledPostIndicator.toBeNotVisible();
        await expect(scheduledPostsPage.badge).not.toBeVisible();
        await expect(channelsPage.sidebarLeft.scheduledPostBadge).not.toBeVisible();
    },
);
test(
    'MM-T5643_6 creates scheduled message in thread and posts in thread conversation',
    {tag: '@scheduled_messages'},
    async ({pw}) => {
        const draftMessage = `Scheduled Threaded Message ${pw.random.id()}`;
        const {user} = await pw.initSetup();
        const {channelsPage, scheduledPostsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.postMessage('Root Message');
        const {sidebarRight} = await channelsPage.replyToLastPost('Replying to a thread');
        const {selectedDate, selectedTime} = await channelsPage.scheduleMessageFromThread(draftMessage, 1);
        await verifyScheduledPostIndicator(sidebarRight.scheduledPostIndicator, selectedDate, selectedTime);
        await sidebarRight.scheduledPostIndicator.seeAllLink.click();
        const scheduledPost = await verifyScheduledPost(scheduledPostsPage, {
            draftMessage,
            selectedDate,
            selectedTime,
            badgeCountOnTab: 1,
        });
        await scheduledPost.hover();
        await scheduledPost.sendNowButton.click();
        await scheduledPostsPage.sendMessageNowModal.toBeVisible();
        await scheduledPostsPage.sendMessageNowModal.sendNowButton.click();
        await sidebarRight.toBeVisible();
        const lastPost = await sidebarRight.getLastPost();
        await expect(lastPost.body).toContainText(draftMessage);
        await sidebarRight.scheduledPostIndicator.toBeNotVisible();
        await expect(scheduledPostsPage.noScheduledDrafts).toBeVisible();
        await expect(scheduledPostsPage.badge).not.toBeVisible();
        await expect(channelsPage.sidebarLeft.scheduledPostBadge).not.toBeVisible();
    },
);
test(
    'MM-T5644_2 reschedules message to a future date from scheduled posts page',
    {tag: '@scheduled_messages'},
    async ({pw}) => {
        const draftMessage = `Scheduled Draft ${pw.random.id()}`;
        const {user} = await pw.initSetup();
        const {channelsPage, scheduledPostsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        const {selectedDate, selectedTime} = await channelsPage.scheduleMessage(draftMessage, 1);
        await verifyScheduledPostIndicator(channelsPage.centerView.scheduledPostIndicator, selectedDate, selectedTime);
        await verifyScheduledPostBadgeOnLeftSidebar(channelsPage, 1);
        await channelsPage.centerView.scheduledPostIndicator.seeAllLink.click();
        const scheduledPost = await verifyScheduledPost(scheduledPostsPage, {
            draftMessage,
            selectedDate,
            selectedTime,
            badgeCountOnTab: 1,
        });
        const {selectedDate: newSelectedDate, selectedTime: newSelectedTime} =
            await scheduledPostsPage.rescheduleMessage(scheduledPost, 2);
        await channelsPage.goto();
        await verifyScheduledPostIndicator(
            channelsPage.centerView.scheduledPostIndicator,
            newSelectedDate,
            newSelectedTime,
        );
    },
);
test(
    'MM-T5645 deletes scheduled message from scheduled posts page and removes all indicators',
    {tag: '@scheduled_messages'},
    async ({pw}) => {
        const draftMessage = `Scheduled Draft ${pw.random.id()}`;
        const {user} = await pw.initSetup();
        const {channelsPage, scheduledPostsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        const {selectedDate, selectedTime} = await channelsPage.scheduleMessage(draftMessage, 1);
        await verifyScheduledPostIndicator(channelsPage.centerView.scheduledPostIndicator, selectedDate, selectedTime);
        await channelsPage.centerView.scheduledPostIndicator.seeAllLink.click();
        const scheduledPost = await verifyScheduledPost(scheduledPostsPage, {
            draftMessage,
            selectedDate,
            selectedTime,
            badgeCountOnTab: 1,
        });
        await scheduledPost.hover();
        await scheduledPost.deleteButton.click();
        await scheduledPostsPage.deleteScheduledPostModal.toBeVisible();
        await scheduledPostsPage.deleteScheduledPostModal.deleteButton.click();
        await expect(scheduledPostsPage.noScheduledDrafts).toBeVisible();
        await expect(scheduledPostsPage.badge).not.toBeVisible();
        await expect(channelsPage.sidebarLeft.scheduledPostBadge).not.toBeVisible();
    },
);
test(
    'MM-T5643_9 sends scheduled message immediately from scheduled posts page',
    {tag: '@scheduled_messages'},
    async ({pw}) => {
        const draftMessage = `Scheduled Draft ${pw.random.id()}`;
        const {user, townSquareUrl} = await pw.initSetup();
        const {channelsPage, scheduledPostsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        const {selectedDate, selectedTime} = await channelsPage.scheduleMessage(draftMessage, 1);
        await verifyScheduledPostIndicator(channelsPage.centerView.scheduledPostIndicator, selectedDate, selectedTime);
        await channelsPage.centerView.scheduledPostIndicator.seeAllLink.click();
        const scheduledPost = await verifyScheduledPost(scheduledPostsPage, {
            draftMessage,
            selectedDate,
            selectedTime,
            badgeCountOnTab: 1,
        });
        await scheduledPost.hover();
        await scheduledPost.sendNowButton.click();
        await scheduledPostsPage.sendMessageNowModal.toBeVisible();
        await scheduledPostsPage.sendMessageNowModal.sendNowButton.click();
        await expect(channelsPage.page).toHaveURL(townSquareUrl);
        await channelsPage.centerView.scheduledPostIndicator.toBeNotVisible();
        await expect(channelsPage.sidebarLeft.scheduledPostBadge).not.toBeVisible();
        const lastPost = await channelsPage.getLastPost();
        await expect(lastPost.body).toContainText(draftMessage);
    },
);
test(
    'MM-T5643_3 creates scheduled message from DM channel and posts at scheduled time',
    {tag: '@scheduled_messages'},
    async ({pw}) => {
        const draftMessage = `Scheduled Draft ${pw.random.id()}`;
        const {user, team, adminClient} = await pw.initSetup();
        const otherUser = await adminClient.createUser(await pw.random.user(), '', '');
        const {channelsPage, scheduledPostsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, `@${otherUser.username}`);
        await channelsPage.toBeVisible();
        const {selectedDate, selectedTime} = await channelsPage.scheduleMessage(draftMessage, 1);
        await channelsPage.centerView.scheduledPostIndicator.toBeVisible();
        if (pw.isOutsideRemoteUserHour(otherUser.timezone)) {
            await expect(channelsPage.centerView.scheduledPostIndicator.messageText).toContainText(
                'You have one scheduled message.',
            );
        } else {
            await verifyScheduledPostIndicator(
                channelsPage.centerView.scheduledPostIndicator,
                selectedDate,
                selectedTime,
            );
        }
        if (pw.isOutsideRemoteUserHour(otherUser.timezone)) {
            await channelsPage.centerView.scheduledPostIndicator.scheduledMessageLink.click();
        } else {
            await channelsPage.centerView.scheduledPostIndicator.seeAllLink.click();
        }
        const scheduledPost = await verifyScheduledPost(scheduledPostsPage, {
            draftMessage,
            selectedDate,
            selectedTime,
            badgeCountOnTab: 1,
        });
        await scheduledPost.hover();
        await scheduledPost.sendNowButton.click();
        await scheduledPostsPage.sendMessageNowModal.toBeVisible();
        await scheduledPostsPage.sendMessageNowModal.sendNowButton.click();
        await expect(channelsPage.page).toHaveURL(`/${team.name}/messages/@${otherUser.username}`);
        await channelsPage.centerView.scheduledPostIndicator.toBeNotVisible();
        await expect(channelsPage.sidebarLeft.scheduledPostBadge).not.toBeVisible();
        const lastPost = await channelsPage.getLastPost();
        await expect(lastPost.body).toContainText(draftMessage);
    },
);
test(
    'MM-T5648 converts draft message to scheduled message from drafts page',
    {tag: '@scheduled_messages'},
    async ({pw}) => {
        const draftMessage = `Scheduled Draft ${pw.random.id()}`;
        const {user, team} = await pw.initSetup();
        const {channelsPage, draftsPage, scheduledPostsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.centerView.postCreate.input.fill(draftMessage);
        await draftsPage.goto(team.name);
        await draftsPage.toBeVisible();
        expect(await draftsPage.getBadgeCountOnTab()).toBe('1');
        const draftedPost = await draftsPage.getLastPost();
        await expect(draftedPost.panelBody).toContainText(draftMessage);
        await draftedPost.hover();
        await draftedPost.scheduleButton.click();
        await draftsPage.scheduleMessageModal.toBeVisible();
        const {selectedDate, selectedTime} = await draftsPage.scheduleMessageModal.scheduleMessage(2);
        await scheduledPostsPage.goto(team.name);
        await verifyScheduledPost(scheduledPostsPage, {draftMessage, selectedDate, selectedTime, badgeCountOnTab: 1});
    },
);
test(
    'MM-T5644_1 edits scheduled message content while preserving scheduled time',
    {tag: '@scheduled_messages'},
    async ({pw}) => {
        const draftMessage = `Scheduled Draft ${pw.random.id()}`;
        const {user, townSquareUrl} = await pw.initSetup();
        const {channelsPage, scheduledPostsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        const {selectedDate, selectedTime} = await channelsPage.scheduleMessage(draftMessage, 2);
        await verifyScheduledPostIndicator(channelsPage.centerView.scheduledPostIndicator, selectedDate, selectedTime);
        await verifyScheduledPostBadgeOnLeftSidebar(channelsPage, 1);
        await channelsPage.centerView.scheduledPostIndicator.seeAllLink.click();
        const scheduledPost = await verifyScheduledPost(scheduledPostsPage, {
            draftMessage,
            selectedDate,
            selectedTime,
            badgeCountOnTab: 1,
        });
        await scheduledPost.hover();
        await scheduledPost.editButton.click();
        const updatedText = 'updated text';
        await scheduledPost.editTextBox.fill(updatedText);
        await scheduledPost.saveButton.click();
        await expect(scheduledPost.panelBody).toContainText(updatedText);
        await expect(scheduledPost.panelHeader).toContainText(selectedTime);
        await scheduledPost.hover();
        await scheduledPost.sendNowButton.click();
        await scheduledPostsPage.sendMessageNowModal.toBeVisible();
        await scheduledPostsPage.sendMessageNowModal.sendNowButton.click();
        await expect(channelsPage.page).toHaveURL(townSquareUrl);
        await channelsPage.centerView.scheduledPostIndicator.toBeNotVisible();
        await expect(channelsPage.sidebarLeft.scheduledPostBadge).not.toBeVisible();
        const lastPost = await channelsPage.getLastPost();
        await expect(lastPost.body).toHaveText(updatedText);
    },
);
test(
    'MM-T5650 copies scheduled message text to clipboard for reuse',
    {tag: '@scheduled_messages'},
    async ({pw, browserName}) => {
        test.skip(browserName === 'firefox', 'Test not supported in Firefox');
        const draftMessage = `Scheduled Draft ${pw.random.id()}`;
        const {user} = await pw.initSetup();
        const {page, channelsPage, scheduledPostsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        const {selectedDate, selectedTime} = await channelsPage.scheduleMessage(draftMessage, 1);
        await verifyScheduledPostBadgeOnLeftSidebar(channelsPage, 1);
        await channelsPage.centerView.scheduledPostIndicator.seeAllLink.click();
        const scheduledPost = await verifyScheduledPost(scheduledPostsPage, {
            draftMessage,
            selectedDate,
            selectedTime,
            badgeCountOnTab: 1,
        });
        await scheduledPost.hover();
        await scheduledPost.copyTextButton.click();
        await page.goBack();
        await channelsPage.centerView.postCreate.input.focus();
        await page.keyboard.down('ControlOrMeta');
        await page.keyboard.press('V');
        await page.keyboard.up('ControlOrMeta');
        await expect(channelsPage.centerView.postCreate.input).toHaveText(draftMessage);
    },
);
async function verifyScheduledPostIndicator(
    scheduledPostIndicator: ScheduledPostIndicator,
    selectedDate: string,
    selectedTime: string | null,
) {
    await scheduledPostIndicator.toBeVisible();
    await expect(scheduledPostIndicator.icon).toBeVisible();
    if (!selectedTime) {
        throw new Error('selectedTime is required');
    }
    const messageText = await scheduledPostIndicator.messageText.textContent();
    await expect(scheduledPostIndicator.messageText).toContainText(selectedTime);
    const datePatterns = [
        selectedDate,
        'Today',
        'Tomorrow',
    ];
    const hasValidDate = datePatterns.some((pattern) => messageText?.toLowerCase().includes(pattern.toLowerCase()));
    if (!hasValidDate) {
        throw new Error(
            `Indicator text "${messageText}" does not contain any expected date pattern: ${datePatterns.join(', ')}`,
        );
    }
}
async function verifyScheduledPostBadgeOnLeftSidebar(channelsPage: ChannelsPage, count: number) {
    await channelsPage.sidebarLeft.scheduledPostBadge.isVisible();
    await expect(channelsPage.sidebarLeft.scheduledPostBadge).toHaveText(count.toString());
}
async function verifyScheduledPost(
    scheduledPostsPage: ScheduledPostsPage,
    {
        draftMessage,
        selectedDate,
        selectedTime,
        badgeCountOnTab,
    }: {draftMessage: string; selectedDate: string; selectedTime: string | null; badgeCountOnTab: number},
) {
    await scheduledPostsPage.toBeVisible();
    expect(await scheduledPostsPage.getBadgeCountOnTab()).toBe(badgeCountOnTab.toString());
    const scheduledPost = await scheduledPostsPage.getLastPost();
    await expect(scheduledPost.panelBody).toContainText(draftMessage);
    if (!selectedTime) {
        throw new Error('selectedTime is required');
    }
    const headerText = await scheduledPost.panelHeader.textContent();
    await expect(scheduledPost.panelHeader).toContainText(selectedTime);
    const datePatterns = [
        selectedDate,
        'Today',
        'Tomorrow',
    ];
    const hasValidDate = datePatterns.some((pattern) => headerText?.toLowerCase().includes(pattern.toLowerCase()));
    if (!hasValidDate) {
        throw new Error(
            `Header "${headerText}" does not contain any expected date pattern: ${datePatterns.join(', ')}`,
        );
    }
    return scheduledPost;
}