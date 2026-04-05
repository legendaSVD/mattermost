import {expect, test} from '@mattermost/playwright-lib';
let keywords: string[];
const highlightWithoutNotificationClass = 'non-notification-highlight';
test.beforeEach(async ({pw}) => {
    keywords = [
        `AB${await pw.random.id()}`,
        `CD${await pw.random.id()}`,
        `EF${await pw.random.id()}`,
        `Highlight me ${await pw.random.id()}`,
    ];
});
test('MM-T5465-1 Should add the keyword when enter, comma or tab is pressed on the textbox', async ({pw}) => {
    await pw.skipIfNoLicense();
    const {user} = await pw.initSetup();
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.postMessage('Hello World');
    const settingsModal = await channelsPage.globalHeader.openSettings();
    const notificationsSettings = await settingsModal.openNotificationsTab();
    await notificationsSettings.expandSection('keysWithHighlight');
    const keywordsInput = await notificationsSettings.getKeywordsInput();
    await keywordsInput.fill(keywords[0]);
    await keywordsInput.press(',');
    await keywordsInput.fill(keywords[1]);
    await keywordsInput.press('Tab');
    await keywordsInput.fill(keywords[2]);
    await keywordsInput.press('Enter');
    const keysWithHighlightDesc = notificationsSettings.keysWithHighlightDesc;
    await keysWithHighlightDesc.waitFor();
    for (const keyword of keywords.slice(0, 3)) {
        expect(await keysWithHighlightDesc).toContainText(keyword);
    }
});
test('MM-T5465-2 Should highlight the keywords when a message is sent with the keyword in center', async ({pw}) => {
    await pw.skipIfNoLicense();
    const {user} = await pw.initSetup();
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    const settingsModal = await channelsPage.globalHeader.openSettings();
    const notificationsSettings = await settingsModal.openNotificationsTab();
    await notificationsSettings.expandSection('keysWithHighlight');
    const keywordsInput = await notificationsSettings.getKeywordsInput();
    await keywordsInput.fill(keywords[3]);
    await keywordsInput.press('Tab');
    await notificationsSettings.save();
    await settingsModal.close();
    const messageWithoutKeyword = 'This message does not contain the keyword';
    await channelsPage.postMessage(messageWithoutKeyword);
    const lastPostWithoutHighlight = await channelsPage.getLastPost();
    await expect(lastPostWithoutHighlight.container.getByText(messageWithoutKeyword)).toBeVisible();
    await expect(lastPostWithoutHighlight.container.getByText(messageWithoutKeyword)).not.toHaveClass(
        highlightWithoutNotificationClass,
    );
    const messageWithKeyword = `This message contains the keyword ${keywords[3]}`;
    await channelsPage.postMessage(messageWithKeyword);
    const lastPostWithHighlight = await channelsPage.getLastPost();
    await expect(lastPostWithHighlight.container.getByText(messageWithKeyword)).toBeVisible();
    await expect(lastPostWithHighlight.container.getByText(keywords[3])).toHaveClass(highlightWithoutNotificationClass);
});
test('MM-T5465-3 Should highlight the keywords when a message is sent with the keyword in rhs', async ({pw}) => {
    await pw.skipIfNoLicense();
    const {user} = await pw.initSetup();
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    const settingsModal = await channelsPage.globalHeader.openSettings();
    const notificationsSettings = await settingsModal.openNotificationsTab();
    await notificationsSettings.expandSection('keysWithHighlight');
    const keywordsInput = await notificationsSettings.getKeywordsInput();
    await keywordsInput.fill(keywords[3]);
    await keywordsInput.press('Tab');
    await notificationsSettings.save();
    await settingsModal.close();
    const messageWithoutKeyword = 'This message does not contain the keyword';
    await channelsPage.postMessage(messageWithoutKeyword);
    const lastPostWithoutHighlight = await channelsPage.getLastPost();
    await lastPostWithoutHighlight.hover();
    await lastPostWithoutHighlight.postMenu.toBeVisible();
    await lastPostWithoutHighlight.postMenu.reply();
    await channelsPage.sidebarRight.toBeVisible();
    const messageWithKeyword = `This message contains the keyword ${keywords[3]}`;
    await channelsPage.sidebarRight.postMessage(messageWithKeyword);
    const lastPostWithHighlightInRHS = await channelsPage.sidebarRight.getLastPost();
    await expect(lastPostWithHighlightInRHS.container.getByText(messageWithKeyword)).toBeVisible();
    await expect(lastPostWithHighlightInRHS.container.getByText(keywords[3])).toHaveClass(
        highlightWithoutNotificationClass,
    );
});
test('MM-T5465-4 Highlighted keywords should not appear in the Recent Mentions', async ({pw}) => {
    await pw.skipIfNoLicense();
    const {user} = await pw.initSetup();
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    const settingsModal = await channelsPage.globalHeader.openSettings();
    const notificationsSettings = await settingsModal.openNotificationsTab();
    await notificationsSettings.expandSection('keysWithHighlight');
    const keywordsInput = await notificationsSettings.getKeywordsInput();
    await keywordsInput.fill(keywords[0]);
    await keywordsInput.press('Tab');
    await notificationsSettings.save();
    await settingsModal.close();
    await channelsPage.globalHeader.openRecentMentions();
    await channelsPage.sidebarRight.toBeVisible();
    await expect(channelsPage.sidebarRight.container.getByText('No mentions yet')).toBeVisible();
});
test('MM-T5465-5 Should highlight keywords in message sent from another user', async ({pw}) => {
    await pw.skipIfNoLicense();
    const {adminClient, team, adminUser, user} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const channel = await adminClient.getChannelByName(team.id, 'town-square');
    const highlightKeyword = keywords[0];
    const messageWithKeyword = `This received message contains the ${highlightKeyword} keyword `;
    await adminClient.createPost(
        pw.random.post({
            message: messageWithKeyword,
            channel_id: channel.id,
            user_id: adminUser.id,
        }),
    );
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    const settingsModal = await channelsPage.globalHeader.openSettings();
    const notificationsSettings = await settingsModal.openNotificationsTab();
    await notificationsSettings.expandSection('keysWithHighlight');
    const keywordsInput = await notificationsSettings.getKeywordsInput();
    await keywordsInput.fill(keywords[0]);
    await keywordsInput.press('Tab');
    await notificationsSettings.save();
    await settingsModal.close();
    const lastPostWithHighlight = await channelsPage.getLastPost();
    await expect(lastPostWithHighlight.container.getByText(messageWithKeyword)).toBeVisible();
    await expect(lastPostWithHighlight.container.getByText(highlightKeyword)).toHaveClass(
        highlightWithoutNotificationClass,
    );
});