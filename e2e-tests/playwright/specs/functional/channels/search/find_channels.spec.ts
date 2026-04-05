import {expect, test} from '@mattermost/playwright-lib';
test(
    'MM-T5424 Find channel search returns only 50 results when there are more than 50 channels with similar names',
    {tag: '@smoke'},
    async ({pw}) => {
        const {adminClient, user, team} = await pw.initSetup();
        const commonName = 'test_channel';
        const channelsRes = [];
        for (let i = 0; i < 100; i++) {
            let suffix = i.toString();
            if (i < 10) {
                suffix = `0${i}`;
            }
            const channel = pw.random.channel({
                teamId: team.id,
                name: `${commonName}_${suffix}`,
                displayName: `Test Channel ${suffix}`,
            });
            channelsRes.push(adminClient.createChannel(channel));
        }
        await Promise.all(channelsRes);
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.sidebarLeft.findChannelButton.click();
        await channelsPage.findChannelsModal.toBeVisible();
        await channelsPage.findChannelsModal.input.fill(commonName);
        const limitCount = 50;
        await expect(channelsPage.findChannelsModal.searchList).toHaveCount(limitCount);
        for (let i = 0; i < limitCount; i++) {
            let suffix = i.toString();
            if (i < 10) {
                suffix = `0${i}`;
            }
            await expect(channelsPage.findChannelsModal.container.getByTestId(`${commonName}_${suffix}`)).toBeVisible();
        }
    },
);