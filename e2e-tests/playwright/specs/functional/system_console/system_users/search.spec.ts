import {expect, test} from '@mattermost/playwright-lib';
test('MM-T5521-1 Should be able to search users with their first names', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const user1 = await adminClient.createUser(await pw.random.user(), '', '');
    const user2 = await adminClient.createUser(await pw.random.user(), '', '');
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.users.searchUsers(user1.first_name);
    await expect(systemConsolePage.users.container.getByText(user1.email)).toBeVisible();
    await expect(systemConsolePage.users.container.getByText(user2.email)).not.toBeVisible();
});
test('MM-T5521-2 Should be able to search users with their last names', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const user1 = await adminClient.createUser(await pw.random.user(), '', '');
    const user2 = await adminClient.createUser(await pw.random.user(), '', '');
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.users.searchUsers(user1.last_name);
    await expect(systemConsolePage.users.container.getByText(user1.email)).toBeVisible();
    await expect(systemConsolePage.users.container.getByText(user2.email)).not.toBeVisible();
});
test('MM-T5521-3 Should be able to search users with their emails', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const user1 = await adminClient.createUser(await pw.random.user(), '', '');
    const user2 = await adminClient.createUser(await pw.random.user(), '', '');
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.users.searchUsers(user1.email);
    await expect(systemConsolePage.users.container.getByText(user1.email)).toBeVisible();
    await expect(systemConsolePage.users.container.getByText(user2.email)).not.toBeVisible();
});
test('MM-T5521-4 Should be able to search users with their usernames', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const user1 = await adminClient.createUser(await pw.random.user(), '', '');
    const user2 = await adminClient.createUser(await pw.random.user(), '', '');
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.users.searchUsers(user1.username);
    await expect(systemConsolePage.users.container.getByText(user1.email)).toBeVisible();
    await expect(systemConsolePage.users.container.getByText(user2.email)).not.toBeVisible();
});
test('MM-T5521-5 Should be able to search users with their nick names', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const user1 = await adminClient.createUser(await pw.random.user(), '', '');
    const user2 = await adminClient.createUser(await pw.random.user(), '', '');
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.searchUsers(user1.nickname);
    await expect(systemConsolePage.users.container.getByText(user1.email)).toBeVisible();
    await expect(systemConsolePage.users.container.getByText(user2.email)).not.toBeVisible();
});
test('MM-T5521-6 Should show no user is found when user doesnt exists', async ({pw}) => {
    const {adminUser} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.searchUsers(`!${pw.random.id(15)}_^^^_${pw.random.id(15)}!`);
    await expect(systemConsolePage.users.container.getByText('No data')).toBeVisible();
});