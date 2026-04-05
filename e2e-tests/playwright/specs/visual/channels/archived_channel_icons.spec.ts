import {expect, test} from '@mattermost/playwright-lib';
test(
    'displays archive icons for public and private channels in sidebar',
    {tag: ['@visual', '@archived_channels', '@snapshots']},
    async ({pw, browserName, viewport}, testInfo) => {
        const {team, user, adminClient} = await pw.initSetup();
        const publicChannel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: 'public-to-archive',
                displayName: 'Public Archive Test',
                type: 'O',
            }),
        );
        const privateChannel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: 'private-to-archive',
                displayName: 'Private Archive Test',
                type: 'P',
            }),
        );
        await adminClient.deleteChannel(publicChannel.id);
        await adminClient.deleteChannel(privateChannel.id);
        const {page, channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await page.keyboard.press('Control+K');
        await page.waitForTimeout(500);
        await page.keyboard.type('archive');
        await page.waitForTimeout(500);
        await pw.hideDynamicChannelsContent(page);
        const testArgs = {page, browserName, viewport};
        await pw.matchSnapshot(testInfo, testArgs);
    },
);
test(
    'displays archive icons in admin console channel list',
    {tag: ['@visual', '@archived_channels', '@admin_console', '@snapshots']},
    async ({pw, browserName, viewport}, testInfo) => {
        const {team, adminUser, adminClient} = await pw.initSetup();
        const publicChannel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: 'admin-public-archive',
                displayName: 'Admin Public Archive',
                type: 'O',
            }),
        );
        const privateChannel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: 'admin-private-archive',
                displayName: 'Admin Private Archive',
                type: 'P',
            }),
        );
        await adminClient.deleteChannel(publicChannel.id);
        await adminClient.deleteChannel(privateChannel.id);
        const {page} = await pw.testBrowser.login(adminUser);
        await page.goto('/admin_console/user_management/channels');
        await page.waitForTimeout(1000);
        await expect(page.locator('.DataGrid')).toBeVisible({timeout: 10000});
        await page.fill('[data-testid="searchInput"]', 'Admin');
        await page.waitForTimeout(500);
        const testArgs = {page, browserName, viewport};
        await pw.matchSnapshot(testInfo, testArgs);
    },
);
test(
    'displays archive icon in channel header for archived private channel',
    {tag: ['@visual', '@archived_channels', '@channel_header', '@snapshots']},
    async ({pw, browserName, viewport}, testInfo) => {
        const {team, adminUser, adminClient} = await pw.initSetup();
        const privateChannel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: 'private-header-test',
                displayName: 'Private Header Test',
                type: 'P',
            }),
        );
        await adminClient.deleteChannel(privateChannel.id);
        const {page, channelsPage} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, privateChannel.name);
        await expect(page.locator('.channel-header')).toBeVisible();
        await expect(page.locator('#channelArchivedMessage')).toBeVisible();
        await pw.hideDynamicChannelsContent(page);
        const headerElement = page.locator('.channel-header');
        await expect(headerElement).toBeVisible();
        const testArgs = {page, browserName, viewport};
        await pw.matchSnapshot(testInfo, testArgs);
    },
);