import {type PlaywrightExtended, expect, test} from '@mattermost/playwright-lib';
test('MM-T5520-1 should activate and deactivate users', async ({pw}) => {
    const {getUser, systemConsolePage} = await setupAndGetRandomUser(pw);
    const userRow = systemConsolePage.users.usersTable.getRowByIndex(0);
    const actionMenu = await userRow.openActionMenu();
    await actionMenu.clickDeactivate();
    await systemConsolePage.users.confirmModal.confirm();
    await expect(userRow.container.getByText('Deactivated')).toBeVisible();
    expect((await getUser()).delete_at).toBeGreaterThan(0);
    const actionMenu2 = await userRow.openActionMenu();
    await actionMenu2.clickActivate();
    await expect(userRow.container.getByText('Member')).toBeVisible();
});
test('MM-T5520-2 should change user roles', async ({pw}) => {
    const {getUser, systemConsolePage} = await setupAndGetRandomUser(pw);
    const userRow = systemConsolePage.users.usersTable.getRowByIndex(0);
    const actionMenu = await userRow.openActionMenu();
    await actionMenu.clickManageRoles();
    const systemAdmin = systemConsolePage.page.locator('input[name="systemadmin"]');
    await systemAdmin.waitFor();
    await systemAdmin.click();
    await systemConsolePage.users.manageRolesModal.save();
    await expect(userRow.container.getByText('System Admin')).toBeVisible();
    expect((await getUser()).roles).toContain('system_admin');
    const actionMenu2 = await userRow.openActionMenu();
    await actionMenu2.clickManageRoles();
    const systemMember = systemConsolePage.page.locator('input[name="systemmember"]');
    await systemMember.waitFor();
    await systemMember.click();
    await systemConsolePage.users.manageRolesModal.save();
    await expect(userRow.container.getByText('Member')).toBeVisible();
    expect((await getUser()).roles).toContain('system_user');
});
test('MM-T5520-3 should be able to manage teams', async ({pw}) => {
    const {systemConsolePage} = await setupAndGetRandomUser(pw);
    const userRow = systemConsolePage.users.usersTable.getRowByIndex(0);
    const actionMenu = await userRow.openActionMenu();
    await actionMenu.clickManageTeams();
    const team = systemConsolePage.page.locator('div.manage-teams__team');
    const teamDropdown = team.locator('div.MenuWrapper');
    await teamDropdown.click();
    const makeTeamAdmin = teamDropdown.getByText('Make Team Admin');
    await makeTeamAdmin.click();
    await expect(team.getByText('Team Admin')).toBeVisible();
    await teamDropdown.click();
    const makeTeamMember = teamDropdown.getByText('Make Team Member');
    await makeTeamMember.click();
    await expect(team.getByText('Team Member')).toBeVisible();
    await teamDropdown.click();
    const removeFromTeam = teamDropdown.getByText('Remove From Team');
    await removeFromTeam.click();
    await team.waitFor({state: 'detached'});
    await expect(team).not.toBeVisible();
});
test('MM-T5520-4 should reset the users password', async ({pw}) => {
    const {systemConsolePage} = await setupAndGetRandomUser(pw);
    const userRow = systemConsolePage.users.usersTable.getRowByIndex(0);
    const actionMenu = await userRow.openActionMenu();
    await actionMenu.clickResetPassword();
    await systemConsolePage.users.resetPasswordModal.fillPassword(await pw.random.id());
    await systemConsolePage.users.resetPasswordModal.reset();
});
test('MM-T5520-5 should change the users email', async ({pw}) => {
    const {getUser, systemConsolePage} = await setupAndGetRandomUser(pw);
    const newEmail = `${await pw.random.id()}@example.com`;
    const userRow = systemConsolePage.users.usersTable.getRowByIndex(0);
    const actionMenu = await userRow.openActionMenu();
    await actionMenu.clickUpdateEmail();
    await systemConsolePage.users.updateEmailModal.fillEmail(newEmail);
    await systemConsolePage.users.updateEmailModal.update();
    await expect(userRow.container.getByText(newEmail)).toBeVisible();
    expect((await getUser()).email).toEqual(newEmail);
});
test('MM-T5520-6 should revoke sessions', async ({pw}) => {
    const {systemConsolePage} = await setupAndGetRandomUser(pw);
    const userRow = systemConsolePage.users.usersTable.getRowByIndex(0);
    const actionMenu = await userRow.openActionMenu();
    await actionMenu.clickRevokeSessions();
    await systemConsolePage.users.confirmModal.confirm();
    await expect(userRow.container.locator('.error')).not.toBeVisible();
});
async function setupAndGetRandomUser(pw: PlaywrightExtended) {
    const {adminUser, adminClient} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const user = await adminClient.createUser(await pw.random.user(), '', '');
    const team = await adminClient.createTeam(await pw.random.team());
    await adminClient.addToTeam(team.id, user.id);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.users.searchUsers(user.email);
    const userRow = systemConsolePage.users.usersTable.getRowByIndex(0);
    await expect(userRow.container.getByText(user.email)).toBeVisible();
    return {getUser: () => adminClient.getUser(user.id), systemConsolePage};
}