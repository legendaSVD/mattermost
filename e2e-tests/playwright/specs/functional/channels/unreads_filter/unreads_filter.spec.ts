import {expect, test} from '@mattermost/playwright-lib';
test('unreads filter will show and hide unread channels', {tag: ['@smoke', '@filters']}, async ({pw}) => {
    const {adminClient, user, team} = await pw.initSetup();
    const channelPromises = [];
    for (let i = 0; i < 10; i++) {
        channelPromises.push(
            adminClient.createChannel(
                pw.random.channel({
                    teamId: team.id,
                    name: `test-channel-${i}`,
                    displayName: `Test Channel ${i}`,
                }),
            ),
        );
    }
    const channels = await Promise.all(channelPromises);
    const addUserPromises = [];
    for (let i = 0; i < channels.length; i++) {
        addUserPromises.push(adminClient.addToChannel(user.id, channels[i].id));
    }
    await Promise.all(addUserPromises);
    const postPromises = [];
    for (let i = 0; i < channels.length; i++) {
        postPromises.push(
            adminClient.createPost({
                channel_id: channels[i].id,
                message: `Test message in channel ${i}`,
            }),
        );
    }
    await Promise.all(postPromises);
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name);
    await channelsPage.toBeVisible();
    expect(await channelsPage.sidebarLeft.isUnreadsFilterActive()).toBe(false);
    const initialUnreadChannels = channelsPage.sidebarLeft.getUnreadChannels();
    await expect(initialUnreadChannels).toHaveCount(10);
    for (let i = 0; i < 5; i++) {
        await channelsPage.sidebarLeft.goToItem(channels[i].name);
    }
    await channelsPage.sidebarLeft.toggleUnreadsFilter();
    expect(await channelsPage.sidebarLeft.isUnreadsFilterActive()).toBe(true);
    const unreadChannels = channelsPage.sidebarLeft.getUnreadChannels();
    await expect(unreadChannels).toHaveCount(5);
    for (let i = 0; i < 4; i++) {
        const channelLink = channelsPage.sidebarLeft.container.locator(`#sidebarItem_${channels[i].name}`);
        await expect(channelLink).not.toBeVisible();
    }
});