import {expect, test} from '@mattermost/playwright-lib';
test('MM-T5523-1 Sortable columns should sort the list when clicked', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    for (let i = 0; i < 10; i++) {
        await adminClient.createUser(await pw.random.user(), '', '');
    }
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    const emailColumnHeader = systemConsolePage.users.usersTable.getColumnHeader('Email');
    await expect(emailColumnHeader).toBeVisible();
    await expect(emailColumnHeader).toHaveAttribute('aria-sort');
    const sortDirection = await systemConsolePage.users.usersTable.sortByColumn('Email');
    await expect(async () => {
        const rowCount = await systemConsolePage.users.usersTable.bodyRows.count();
        const emails: string[] = [];
        for (let i = 0; i < rowCount; i++) {
            const row = systemConsolePage.users.usersTable.getRowByIndex(i);
            const email = await row.getEmail();
            emails.push(email);
        }
        const expectedOrder = [...emails].sort((a, b) => a.localeCompare(b));
        if (sortDirection === 'descending') {
            expectedOrder.reverse();
        }
        expect(emails).toEqual(expectedOrder);
    }).toPass();
    const reversedDirection = await systemConsolePage.users.usersTable.sortByColumn('Email');
    expect(reversedDirection).not.toEqual(sortDirection);
    await expect(async () => {
        const rowCount = await systemConsolePage.users.usersTable.bodyRows.count();
        const emails: string[] = [];
        for (let i = 0; i < rowCount; i++) {
            const row = systemConsolePage.users.usersTable.getRowByIndex(i);
            const email = await row.getEmail();
            emails.push(email);
        }
        const expectedOrder = [...emails].sort((a, b) => a.localeCompare(b));
        if (reversedDirection === 'descending') {
            expectedOrder.reverse();
        }
        expect(emails).toEqual(expectedOrder);
    }).toPass();
});
test('MM-T5523-2 Non sortable columns should not sort the list when clicked', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    for (let i = 0; i < 10; i++) {
        await adminClient.createUser(await pw.random.user(), '', '');
    }
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    const lastLoginColumnHeader = systemConsolePage.users.usersTable.getColumnHeader('Last login');
    await expect(lastLoginColumnHeader).toBeVisible();
    await expect(lastLoginColumnHeader).not.toHaveAttribute('aria-sort');
    const firstRowWithoutSort = systemConsolePage.users.usersTable.getRowByIndex(0);
    const firstRowEmailWithoutSort = await firstRowWithoutSort.container.getByText(pw.simpleEmailRe).allInnerTexts();
    await systemConsolePage.users.usersTable.clickSortOnColumn('Last login');
    const firstRowWithSort = systemConsolePage.users.usersTable.getRowByIndex(0);
    const firstRowEmailWithSort = await firstRowWithSort.container.getByText(pw.simpleEmailRe).allInnerTexts();
    expect(firstRowEmailWithoutSort).toEqual(firstRowEmailWithSort);
});