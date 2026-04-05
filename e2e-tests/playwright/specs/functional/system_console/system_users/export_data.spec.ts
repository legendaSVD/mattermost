import {expect, test} from '@mattermost/playwright-lib';
test.fixme('MM-T5522 Should begin export of data when export button is pressed', async ({pw}) => {
    test.slow();
    await pw.skipIfNoLicense();
    const {adminUser} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {page, channelsPage, systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    const dateRangeMenu = await systemConsolePage.users.openDateRangeSelectorMenu();
    await dateRangeMenu.clickMenuItem('All time');
    await systemConsolePage.users.clickExport();
    await systemConsolePage.users.confirmModal.confirm();
    const dateRangeMenu2 = await systemConsolePage.users.openDateRangeSelectorMenu();
    await dateRangeMenu2.clickMenuItem('Last 30 days');
    await systemConsolePage.users.clickExport();
    await systemConsolePage.users.confirmModal.confirm();
    await systemConsolePage.users.clickExport();
    await systemConsolePage.users.confirmModal.confirm();
    expect(page.getByText('Export is in progress')).toBeVisible();
    channelsPage.goto('ad-1/messages', '@system-bot');
    await channelsPage.centerView.toBeVisible();
    const lastPost = await channelsPage.getLastPost();
    await lastPost.toContain('export of user data for the last 30 days');
    await channelsPage.centerView.waitUntilLastPostContains('contains user data for all time', pw.duration.half_min);
    await channelsPage.centerView.waitUntilLastPostContains(
        'contains user data for the last 30 days',
        pw.duration.half_min,
    );
});