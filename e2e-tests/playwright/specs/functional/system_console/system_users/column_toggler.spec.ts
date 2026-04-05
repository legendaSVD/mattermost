import {expect, test} from '@mattermost/playwright-lib';
test('MM-T5523-3 Should list the column names with checkboxes in the correct order', async ({pw}) => {
    const {adminUser} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    const columnToggleMenu = await systemConsolePage.users.openColumnToggleMenu();
    const menuItems = columnToggleMenu.getAllMenuItems();
    const menuItemsTexts = await menuItems.allInnerTexts();
    expect(menuItemsTexts).toHaveLength(10);
    expect(menuItemsTexts).toEqual([
        'User details',
        'Email',
        'Member since',
        'Last login',
        'Last activity',
        'Last post',
        'Days active',
        'Messages posted',
        'Channel count',
        'Actions',
    ]);
});
test('MM-T5523-4 Should allow certain columns to be checked and others to be disabled', async ({pw}) => {
    const {adminUser} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    const columnToggleMenu = await systemConsolePage.users.openColumnToggleMenu();
    const displayNameMenuItem = await columnToggleMenu.getMenuItem('User details');
    expect(displayNameMenuItem).toBeDisabled();
    const actionsMenuItem = await columnToggleMenu.getMenuItem('Actions');
    expect(actionsMenuItem).toBeDisabled();
    const emailMenuItem = await columnToggleMenu.getMenuItem('Email');
    expect(emailMenuItem).not.toBeDisabled();
});
test('MM-T5523-5 Should show/hide the columns which are toggled on/off', async ({pw}) => {
    const {adminUser} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    let columnToggleMenu = await systemConsolePage.users.openColumnToggleMenu();
    await columnToggleMenu.clickMenuItem('Email');
    await columnToggleMenu.clickMenuItem('Last login');
    await columnToggleMenu.close();
    await expect(systemConsolePage.users.container.getByRole('columnheader', {name: 'Email'})).not.toBeVisible();
    await expect(systemConsolePage.users.container.getByRole('columnheader', {name: 'Last login'})).not.toBeVisible();
    columnToggleMenu = await systemConsolePage.users.openColumnToggleMenu();
    await columnToggleMenu.clickMenuItem('Email');
    await columnToggleMenu.close();
    await expect(systemConsolePage.users.container.getByRole('columnheader', {name: 'Email'})).toBeVisible();
    await expect(systemConsolePage.users.container.getByRole('columnheader', {name: 'Last login'})).not.toBeVisible();
});
test(
    'displays numeric channel count value when Channel count column is enabled',
    {tag: '@system_users'},
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const ch1Name = `count-ch1-${await pw.random.id()}`;
        const channel1 = await adminClient.createChannel({
            team_id: team.id,
            name: ch1Name.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            display_name: ch1Name,
            type: 'O',
        });
        const ch2Name = `count-ch2-${await pw.random.id()}`;
        const channel2 = await adminClient.createChannel({
            team_id: team.id,
            name: ch2Name.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            display_name: ch2Name,
            type: 'O',
        });
        const guestUser = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.updateUserRoles(guestUser.id, 'system_guest');
        await adminClient.addToTeam(team.id, guestUser.id);
        await adminClient.addToChannel(guestUser.id, channel1.id);
        await adminClient.addToChannel(guestUser.id, channel2.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.users.click();
        await systemConsolePage.users.toBeVisible();
        const columnToggleMenu = await systemConsolePage.users.openColumnToggleMenu();
        await columnToggleMenu.clickMenuItem('Channel count');
        await columnToggleMenu.close();
        await expect(
            systemConsolePage.users.container.getByRole('columnheader', {name: 'Channel count'}),
        ).toBeVisible();
        await systemConsolePage.users.searchUsers(guestUser.email);
        await systemConsolePage.users.isLoadingComplete();
        const firstRow = systemConsolePage.users.container.locator('tbody tr').first();
        const channelCountCell = firstRow.locator('.channelCountColumn');
        await expect(channelCountCell).toHaveText('2');
    },
);
test('toggles Channel count column visibility on and off', {tag: '@system_users'}, async ({pw}) => {
    const {adminUser} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    let columnToggleMenu = await systemConsolePage.users.openColumnToggleMenu();
    await columnToggleMenu.clickMenuItem('Channel count');
    await columnToggleMenu.close();
    await expect(systemConsolePage.users.container.getByRole('columnheader', {name: 'Channel count'})).toBeVisible();
    columnToggleMenu = await systemConsolePage.users.openColumnToggleMenu();
    await columnToggleMenu.clickMenuItem('Channel count');
    await columnToggleMenu.close();
    await expect(
        systemConsolePage.users.container.getByRole('columnheader', {name: 'Channel count'}),
    ).not.toBeVisible();
});