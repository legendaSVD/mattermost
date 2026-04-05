import {UserProfile} from '@mattermost/types/users';
import {expect, test, SystemConsolePage} from '@mattermost/playwright-lib';
test('displays and allows editing of authentication data field', {tag: '@user_management'}, async ({pw}) => {
    const {user, adminUser, adminClient} = await pw.initSetup();
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    const originalAuthData = `auth-data-${await pw.random.id()}`;
    const newAuthData = `auth-data-${await pw.random.id()}`;
    await adminClient.updateUserAuth(user.id, {
        auth_service: 'saml',
        auth_data: originalAuthData,
    });
    await navigateToUserDetail(systemConsolePage, user);
    const {userDetail} = systemConsolePage.users;
    const {authDataInput} = userDetail.userCard;
    await expect(authDataInput).toBeVisible();
    await expect(authDataInput).toHaveValue(originalAuthData);
    await authDataInput.clear();
    await authDataInput.fill(newAuthData);
    await expect(userDetail.saveButton).toBeEnabled();
    await userDetail.save();
    await userDetail.saveChangesModal.confirm();
    await expect(authDataInput).toHaveValue(newAuthData);
    const updatedUser = await adminClient.getUser(user.id);
    expect(updatedUser.auth_data).toBe(newAuthData);
});
test('disables email and username fields for users with auth service', {tag: '@user_management'}, async ({pw}) => {
    const {user, adminUser, adminClient} = await pw.initSetup();
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await adminClient.updateUserAuth(user.id, {
        auth_service: 'ldap',
        auth_data: `ldap-user-data-${await pw.random.id()}`,
    });
    await navigateToUserDetail(systemConsolePage, user);
    const {userDetail} = systemConsolePage.users;
    const {emailInput, usernameInput} = userDetail.userCard;
    await expect(emailInput).toBeDisabled();
    await expect(emailInput).toHaveAttribute('readonly', '');
    await expect(usernameInput).toBeDisabled();
    await expect(usernameInput).toHaveAttribute('readonly', '');
    await emailInput.hover();
    const emailTooltip = systemConsolePage.page.getByText('This email is managed by the LDAP login provider');
    await expect(emailTooltip).toBeVisible();
    await usernameInput.hover();
    const usernameTooltip = systemConsolePage.page.getByText('This username is managed by the LDAP login provider');
    await expect(usernameTooltip).toBeVisible();
});
test('allows editing email and username fields for regular users', {tag: '@user_management'}, async ({pw}) => {
    const {user, adminUser, adminClient} = await pw.initSetup();
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await navigateToUserDetail(systemConsolePage, user);
    const {userDetail} = systemConsolePage.users;
    const {userCard} = userDetail;
    await expect(userCard.emailInput).toBeEnabled();
    await expect(userCard.usernameInput).toBeEnabled();
    const newEmail = `updated-${await pw.random.id()}@example.com`;
    const newUsername = `updated-${await pw.random.id()}`;
    await userCard.emailInput.clear();
    await userCard.emailInput.fill(newEmail);
    await userCard.usernameInput.clear();
    await userCard.usernameInput.fill(newUsername);
    await expect(userDetail.saveButton).toBeEnabled();
    await userDetail.save();
    await userDetail.saveChangesModal.confirm();
    await expect(userCard.emailInput).toHaveValue(newEmail);
    await expect(userCard.usernameInput).toHaveValue(newUsername);
    const updatedUser = await adminClient.getUser(user.id);
    expect(updatedUser.email).toBe(newEmail);
    expect(updatedUser.username).toBe(newUsername);
});
test('displays inline validation errors for invalid email', {tag: '@user_management'}, async ({pw}) => {
    const {user, adminUser} = await pw.initSetup();
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await navigateToUserDetail(systemConsolePage, user);
    const {userDetail} = systemConsolePage.users;
    const {userCard} = userDetail;
    await userCard.emailInput.clear();
    await userCard.emailInput.fill('invalid-email');
    const emailError = userCard.getFieldError('Email');
    await expect(emailError).toBeVisible();
    await expect(userDetail.saveButton).toBeDisabled();
    await userCard.emailInput.clear();
    await userCard.emailInput.fill('valid@example.com');
    await expect(emailError).not.toBeVisible();
    await expect(userDetail.saveButton).toBeEnabled();
});
test('allows cancelling save confirmation dialog', {tag: '@user_management'}, async ({pw}) => {
    const {user, adminUser} = await pw.initSetup();
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await navigateToUserDetail(systemConsolePage, user);
    const {userDetail} = systemConsolePage.users;
    const newEmail = `cancelled-${await pw.random.id()}@example.com`;
    await userDetail.userCard.emailInput.clear();
    await userDetail.userCard.emailInput.fill(newEmail);
    await userDetail.save();
    await userDetail.saveChangesModal.toBeVisible();
    await userDetail.saveChangesModal.cancel();
    await expect(userDetail.userCard.emailInput).toHaveValue(newEmail);
    await expect(userDetail.saveButton).toBeEnabled();
});
async function navigateToUserDetail(systemConsolePage: SystemConsolePage, user: UserProfile) {
    await systemConsolePage.goto();
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.users.searchUsers(user.email);
    const userRow = systemConsolePage.users.usersTable.getRowByIndex(0);
    await expect(userRow.container.getByText(user.email)).toBeVisible();
    await userRow.container.getByText(user.email).click();
    await systemConsolePage.users.userDetail.toBeVisible();
}