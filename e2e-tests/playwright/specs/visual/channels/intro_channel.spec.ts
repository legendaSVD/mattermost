import {expect, test} from '@mattermost/playwright-lib';
test(
    'displays intro to channel view for regular user',
    {tag: ['@visual', '@channel_page', '@snapshots']},
    async ({pw, browserName, viewport}, testInfo) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await expect(channelsPage.appBar.playbooksIcon).toBeVisible();
        await pw.hideDynamicChannelsContent(page);
        const testArgs = {page: page, browserName, viewport};
        await pw.matchSnapshot(testInfo, testArgs);
    },
);