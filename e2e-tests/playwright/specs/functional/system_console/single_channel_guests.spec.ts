import {expect, test} from '@mattermost/playwright-lib';
test.beforeEach(async ({pw}) => {
    await pw.ensureLicense();
    await pw.skipIfNoLicense();
});
test(
    'displays single-channel guests card on site statistics page when guest accounts are enabled',
    {tag: '@system_console'},
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.GuestAccountsSettings.Enable = true;
        await adminClient.updateConfig(config);
        const guestUser = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.updateUserRoles(guestUser.id, 'system_guest');
        await adminClient.addToTeam(team.id, guestUser.id);
        const channel = await adminClient.createChannel(
            pw.random.channel({teamId: team.id, name: 'guest-channel', displayName: 'Guest Channel', unique: true}),
        );
        await adminClient.addToChannel(guestUser.id, channel.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.page.goto('/admin_console/reporting/system_analytics');
        await systemConsolePage.page.waitForLoadState('networkidle');
        const singleChannelGuestsCard = systemConsolePage.page.getByTestId('singleChannelGuests');
        await expect(singleChannelGuestsCard).toBeVisible();
        const countText = await singleChannelGuestsCard.textContent();
        const match = countText?.match(/(\d+)/);
        expect(match).toBeTruthy();
        expect(Number(match![1])).toBeGreaterThanOrEqual(1);
    },
);
test(
    'displays single-channel guests row on edition and license page when guest accounts are enabled',
    {tag: '@system_console'},
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.GuestAccountsSettings.Enable = true;
        await adminClient.updateConfig(config);
        const guestUser = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.updateUserRoles(guestUser.id, 'system_guest');
        await adminClient.addToTeam(team.id, guestUser.id);
        const channel = await adminClient.createChannel(
            pw.random.channel({teamId: team.id, name: 'guest-channel', displayName: 'Guest Channel', unique: true}),
        );
        await adminClient.addToChannel(guestUser.id, channel.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.page.goto('/admin_console/about/license');
        await systemConsolePage.page.waitForLoadState('networkidle');
        await expect(systemConsolePage.page.getByText('SINGLE-CHANNEL GUESTS:')).toBeVisible();
    },
);
test(
    'hides single-channel guests card on site statistics page when guest accounts are disabled',
    {tag: '@system_console'},
    async ({pw}) => {
        const {adminUser, adminClient} = await pw.initSetup();
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.GuestAccountsSettings.Enable = false;
        await adminClient.updateConfig(config);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.page.goto('/admin_console/reporting/system_analytics');
        await systemConsolePage.page.waitForLoadState('networkidle');
        await expect(systemConsolePage.page.getByTestId('singleChannelGuests')).not.toBeVisible();
    },
);
test(
    'returns single-channel guest data from server limits API for admin users',
    {tag: '@system_console'},
    async ({pw}) => {
        const {adminClient} = await pw.initSetup();
        const config = await adminClient.getConfig();
        config.GuestAccountsSettings.Enable = true;
        await adminClient.updateConfig(config);
        const {data: limits} = await adminClient.getServerLimits();
        expect(limits).toHaveProperty('singleChannelGuestCount');
        expect(limits).toHaveProperty('singleChannelGuestLimit');
        expect(typeof limits.singleChannelGuestCount).toBe('number');
        expect(typeof limits.singleChannelGuestLimit).toBe('number');
        expect(limits.singleChannelGuestCount).toBeGreaterThanOrEqual(0);
        expect(limits.singleChannelGuestLimit).toBeGreaterThanOrEqual(0);
    },
);
test(
    'shows no error styling on single-channel guests card when count is within limit',
    {tag: '@system_console'},
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.GuestAccountsSettings.Enable = true;
        await adminClient.updateConfig(config);
        const guestUser = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.updateUserRoles(guestUser.id, 'system_guest');
        await adminClient.addToTeam(team.id, guestUser.id);
        const channel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: 'guest-no-overage',
                displayName: 'Guest No Overage',
                unique: true,
            }),
        );
        await adminClient.addToChannel(guestUser.id, channel.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.page.goto('/admin_console/reporting/system_analytics');
        await systemConsolePage.page.waitForLoadState('networkidle');
        const cardTitle = systemConsolePage.page.getByTestId('singleChannelGuestsTitle');
        await expect(cardTitle).toBeVisible();
        await expect(cardTitle).not.toHaveClass(/team_statistics--error/);
    },
);
test('does not show guest limit banner when count is within limit', {tag: '@system_console'}, async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const config = await adminClient.getConfig();
    config.GuestAccountsSettings.Enable = true;
    await adminClient.updateConfig(config);
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await expect(systemConsolePage.page.getByTestId('single_channel_guest_limit_banner')).not.toBeVisible();
});
test(
    'shows error styling on guests card and banner when single-channel guest count exceeds limit',
    {tag: '@system_console'},
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.GuestAccountsSettings.Enable = true;
        await adminClient.updateConfig(config);
        for (let i = 0; i < 3; i++) {
            const guest = await adminClient.createUser(await pw.random.user(), '', '');
            await adminClient.updateUserRoles(guest.id, 'system_guest');
            await adminClient.addToTeam(team.id, guest.id);
            const ch = await adminClient.createChannel(
                pw.random.channel({
                    teamId: team.id,
                    name: `scg-overage-${i}`,
                    displayName: `SCG Overage ${i}`,
                    unique: true,
                }),
            );
            await adminClient.addToChannel(guest.id, ch.id);
        }
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.page.route('**/api/v4/limits/server', async (route) => {
            const response = await route.fetch();
            const json = await response.json();
            json.singleChannelGuestLimit = 1;
            await route.fulfill({response, json});
        });
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.page.goto('/admin_console/reporting/system_analytics');
        await systemConsolePage.page.waitForLoadState('networkidle');
        const cardTitle = systemConsolePage.page.getByTestId('singleChannelGuestsTitle');
        await expect(cardTitle).toBeVisible();
        await expect(cardTitle).toHaveClass(/team_statistics--error/);
        await expect(systemConsolePage.page.getByTestId('single_channel_guest_limit_banner')).toBeVisible();
    },
);
test(
    'does not count multi-channel guest as single-channel guest on site statistics page',
    {tag: '@system_console'},
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.GuestAccountsSettings.Enable = true;
        await adminClient.updateConfig(config);
        const multiChannelGuest = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.updateUserRoles(multiChannelGuest.id, 'system_guest');
        await adminClient.addToTeam(team.id, multiChannelGuest.id);
        const channelA = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: 'guest-channel-a',
                displayName: 'Guest Channel A',
                unique: true,
            }),
        );
        const channelB = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: 'guest-channel-b',
                displayName: 'Guest Channel B',
                unique: true,
            }),
        );
        await adminClient.addToChannel(multiChannelGuest.id, channelA.id);
        await adminClient.addToChannel(multiChannelGuest.id, channelB.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.page.goto('/admin_console/reporting/system_analytics');
        await systemConsolePage.page.waitForLoadState('networkidle');
        const singleChannelGuestsCard = systemConsolePage.page.getByTestId('singleChannelGuests');
        await expect(singleChannelGuestsCard).toBeVisible();
        const countText = await singleChannelGuestsCard.textContent();
        const match = countText?.match(/(\d+)/);
        expect(match).toBeTruthy();
        const singleChannelGuestCount = Number(match![1]);
        const singleChannelGuest = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.updateUserRoles(singleChannelGuest.id, 'system_guest');
        await adminClient.addToTeam(team.id, singleChannelGuest.id);
        await adminClient.addToChannel(singleChannelGuest.id, channelA.id);
        await systemConsolePage.page.reload();
        await systemConsolePage.page.waitForLoadState('networkidle');
        const updatedCountText = await singleChannelGuestsCard.textContent();
        const updatedMatch = updatedCountText?.match(/(\d+)/);
        expect(updatedMatch).toBeTruthy();
        expect(Number(updatedMatch![1])).toBe(singleChannelGuestCount + 1);
    },
);