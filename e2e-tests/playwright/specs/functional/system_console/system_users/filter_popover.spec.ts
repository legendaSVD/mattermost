import {expect, test} from '@mattermost/playwright-lib';
test('MM-T5521-7 Should be able to filter users with team filter', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const team1 = await adminClient.createTeam(await pw.random.team());
    const user1 = await adminClient.createUser(await pw.random.user(), '', '');
    await adminClient.addToTeam(team1.id, user1.id);
    const team2 = await adminClient.createTeam(await pw.random.team());
    const user2 = await adminClient.createUser(await pw.random.user(), '', '');
    await adminClient.addToTeam(team2.id, user2.id);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    const filterPopover = await systemConsolePage.users.openFilterPopover();
    await filterPopover.filterByTeam(team1.display_name);
    await filterPopover.save();
    await filterPopover.close();
    await systemConsolePage.users.isLoadingComplete();
    await expect(systemConsolePage.users.container.getByText(user1.email)).toBeVisible();
    await expect(systemConsolePage.users.container.getByText(user2.email)).not.toBeVisible();
});
test('MM-T5521-8 Should be able to filter users with role filter', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const guestUser = await adminClient.createUser(await pw.random.user(), '', '');
    await adminClient.updateUserRoles(guestUser.id, 'system_guest');
    const regularUser = await adminClient.createUser(await pw.random.user(), '', '');
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    const filterPopover = await systemConsolePage.users.openFilterPopover();
    await filterPopover.filterByRole('Guests (all)');
    await filterPopover.save();
    await filterPopover.close();
    await systemConsolePage.users.isLoadingComplete();
    await systemConsolePage.users.searchUsers(guestUser.email);
    await expect(systemConsolePage.users.container.getByText(guestUser.email)).toBeVisible();
    await systemConsolePage.users.searchUsers(regularUser.email);
    await expect(systemConsolePage.users.container.getByText('No data')).toBeVisible();
});
test('MM-T5521-9 Should be able to filter users with status filter', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const deactivatedUser = await adminClient.createUser(await pw.random.user(), '', '');
    await adminClient.updateUserActive(deactivatedUser.id, false);
    const regularUser = await adminClient.createUser(await pw.random.user(), '', '');
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    const filterPopover = await systemConsolePage.users.openFilterPopover();
    await filterPopover.filterByStatus('Deactivated users');
    await filterPopover.save();
    await filterPopover.close();
    await systemConsolePage.users.searchUsers(deactivatedUser.email);
    await expect(systemConsolePage.users.container.getByText(deactivatedUser.email)).toBeVisible();
    await systemConsolePage.users.searchUsers(regularUser.email);
    await expect(systemConsolePage.users.container.getByText('No data')).toBeVisible();
});
test('displays all guest filter variants in the role filter dropdown', {tag: '@system_users'}, async ({pw}) => {
    const {adminUser} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    const filterPopover = await systemConsolePage.users.openFilterPopover();
    await filterPopover.openRoleMenu();
    const roleOptions = filterPopover.container.getByRole('option');
    const roleTexts = await roleOptions.allInnerTexts();
    expect(roleTexts).toEqual([
        'Any',
        'System Admin',
        'Member',
        'Guests (all)',
        'Guests in a single channel',
        'Guests in multiple channels',
    ]);
});
test(
    'filters users by single-channel guest filter and shows only single-channel guests',
    {tag: '@system_users'},
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const channelName = `guest-ch-${await pw.random.id()}`;
        const channel = await adminClient.createChannel({
            team_id: team.id,
            name: channelName.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            display_name: channelName,
            type: 'O',
        });
        const guestUser = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.updateUserRoles(guestUser.id, 'system_guest');
        await adminClient.addToTeam(team.id, guestUser.id);
        await adminClient.addToChannel(guestUser.id, channel.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.users.click();
        await systemConsolePage.users.toBeVisible();
        const filterPopover = await systemConsolePage.users.openFilterPopover();
        await filterPopover.filterByRole('Guests in a single channel');
        await filterPopover.save();
        await systemConsolePage.users.isLoadingComplete();
        await systemConsolePage.users.searchUsers(guestUser.email);
        await expect(systemConsolePage.users.container.getByText(guestUser.email)).toBeVisible();
    },
);
test(
    'filters users by multi-channel guest filter and excludes single-channel guests',
    {tag: '@system_users'},
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const ch1Name = `guest-multi-1-${await pw.random.id()}`;
        const channel1 = await adminClient.createChannel({
            team_id: team.id,
            name: ch1Name.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            display_name: ch1Name,
            type: 'O',
        });
        const ch2Name = `guest-multi-2-${await pw.random.id()}`;
        const channel2 = await adminClient.createChannel({
            team_id: team.id,
            name: ch2Name.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            display_name: ch2Name,
            type: 'O',
        });
        const multiChannelGuest = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.updateUserRoles(multiChannelGuest.id, 'system_guest');
        await adminClient.addToTeam(team.id, multiChannelGuest.id);
        await adminClient.addToChannel(multiChannelGuest.id, channel1.id);
        await adminClient.addToChannel(multiChannelGuest.id, channel2.id);
        const singleChannelGuest = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.updateUserRoles(singleChannelGuest.id, 'system_guest');
        await adminClient.addToTeam(team.id, singleChannelGuest.id);
        await adminClient.addToChannel(singleChannelGuest.id, channel1.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.users.click();
        await systemConsolePage.users.toBeVisible();
        const filterPopover = await systemConsolePage.users.openFilterPopover();
        await filterPopover.filterByRole('Guests in multiple channels');
        await filterPopover.save();
        await systemConsolePage.users.isLoadingComplete();
        await systemConsolePage.users.searchUsers(multiChannelGuest.email);
        await expect(systemConsolePage.users.container.getByText(multiChannelGuest.email)).toBeVisible();
        await systemConsolePage.users.searchUsers(singleChannelGuest.email);
        await expect(systemConsolePage.users.container.getByText('No data')).toBeVisible();
    },
);