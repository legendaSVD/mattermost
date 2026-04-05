import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {Client4} from '@mattermost/client';
import {UserPropertyField} from '@mattermost/types/properties';
import {expect, test, SystemConsolePage} from '@mattermost/playwright-lib';
import {
    CustomProfileAttribute,
    setupCustomProfileAttributeFields,
    setupCustomProfileAttributeValuesForUser,
    deleteCustomProfileAttributes,
} from '../../channels/custom_profile_attributes/helpers';
const testUserAttributes: CustomProfileAttribute[] = [
    {
        name: 'Department',
        value: 'Engineering',
        type: 'text',
        attrs: {
            visibility: 'when_set',
        },
    },
    {
        name: 'Work Email',
        value: 'work@company.com',
        type: 'text',
        attrs: {
            value_type: 'email',
            visibility: 'when_set',
        },
    },
    {
        name: 'Personal Website',
        value: 'https://johndoe.com',
        type: 'text',
        attrs: {
            value_type: 'url',
            visibility: 'when_set',
        },
    },
    {
        name: 'Location',
        type: 'select',
        attrs: {
            visibility: 'when_set',
        },
        options: [
            {name: 'Remote', color: '#00FFFF'},
            {name: 'Office', color: '#FF00FF'},
            {name: 'Hybrid', color: '#FFFF00'},
        ],
    },
    {
        name: 'Skills',
        type: 'multiselect',
        attrs: {
            visibility: 'when_set',
        },
        options: [
            {name: 'JavaScript', color: '#F0DB4F'},
            {name: 'React', color: '#61DAFB'},
            {name: 'Python', color: '#3776AB'},
            {name: 'Go', color: '#00ADD8'},
        ],
    },
];
let team: Team;
let adminUser: UserProfile;
let testUser: UserProfile;
let attributeFieldsMap: Record<string, UserPropertyField>;
let adminClient: Client4;
let systemConsolePage: SystemConsolePage;
test.describe('System Console - Admin User Profile Editing', () => {
    test.beforeEach(async ({pw}) => {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
        ({team, adminUser, adminClient} = await pw.initSetup());
        testUser = await pw.createNewUserProfile(adminClient, {prefix: 'admin-edit-target-'});
        await adminClient.addToTeam(team.id, testUser.id);
        attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, testUserAttributes);
        await setupCustomProfileAttributeValuesForUser(
            adminClient,
            testUserAttributes,
            attributeFieldsMap,
            testUser.id,
        );
        ({systemConsolePage} = await pw.testBrowser.login(adminUser));
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.users.click();
        await systemConsolePage.users.toBeVisible();
        await systemConsolePage.users.searchUsers(testUser.email);
        const userRow = systemConsolePage.users.usersTable.getRowByIndex(0);
        await userRow.container.getByText(testUser.email).click();
        await systemConsolePage.page.waitForURL(`**/admin_console/user_management/user/${testUser.id}`);
    });
    test.afterEach(async ({pw}) => {
        const {adminClient: cleanupClient} = await pw.getAdminClient();
        await deleteCustomProfileAttributes(cleanupClient, attributeFieldsMap);
    });
    test('MM-65126 Should edit custom user attributes from system console', async () => {
        const {userDetail} = systemConsolePage.users;
        const {userCard} = userDetail;
        const departmentInput = userCard.getFieldInputByExactLabel('Department');
        await departmentInput.clear();
        await departmentInput.fill('Marketing');
        await userDetail.save();
        await userDetail.saveChangesModal.confirm();
        await expect(userDetail.errorMessage).not.toBeVisible();
        await expect(departmentInput).toHaveValue('Marketing');
        await userDetail.waitForSaveComplete();
    });
    test('Should display user attributes in two-column layout', async () => {
        const {userCard} = systemConsolePage.users.userDetail;
        await expect(userCard.twoColumnLayout).toBeVisible();
        await expect(userCard.usernameInput).toBeVisible();
        await expect(userCard.emailInput).toBeVisible();
        await expect(userCard.authenticationMethod).toBeVisible();
        for (const field of testUserAttributes) {
            await expect(
                systemConsolePage.page.locator('label').filter({hasText: new RegExp(field.name)}),
            ).toBeVisible();
        }
        const inputElements = systemConsolePage.page.locator('input, select');
        const inputCount = await inputElements.count();
        expect(inputCount).toBeGreaterThan(4);
        const rowCount = await userCard.fieldRows.count();
        expect(rowCount).toBeGreaterThan(0);
    });
    test('Should edit system email attribute and save', async () => {
        const {userDetail} = systemConsolePage.users;
        const {emailInput} = userDetail.userCard;
        const newEmail = `updated-${testUser.email}`;
        await emailInput.clear();
        await emailInput.fill(newEmail);
        await userDetail.save();
        await userDetail.saveChangesModal.confirm();
        await expect(userDetail.errorMessage).not.toBeVisible();
        await expect(emailInput).toHaveValue(newEmail);
        await userDetail.waitForSaveComplete();
    });
    test('Should edit custom select attribute and save', async () => {
        const {userDetail} = systemConsolePage.users;
        const {userCard} = userDetail;
        const locationSelect = userCard.getSelectByExactLabel('Location');
        const firstOption = await locationSelect.locator('option').nth(1);
        const firstOptionValue = await firstOption.getAttribute('value');
        await locationSelect.selectOption(firstOptionValue || '');
        await userDetail.save();
        await userDetail.saveChangesModal.confirm();
        await expect(userDetail.errorMessage).not.toBeVisible();
        const selectedValue = await locationSelect.inputValue();
        expect(selectedValue).toBeTruthy();
        await userDetail.waitForSaveComplete();
    });
    test('Should display custom multiselect attribute and save form', async () => {
        const {userDetail} = systemConsolePage.users;
        const {userCard} = userDetail;
        const skillsColumn = userCard.getFieldInputByExactLabel('Skills');
        await expect(skillsColumn).toBeVisible();
        const departmentInput = userCard.getFieldInputByExactLabel('Department');
        await departmentInput.fill('Engineering Updated');
        await expect(userDetail.saveButton).toBeEnabled();
        await userDetail.save();
        await userDetail.saveChangesModal.confirm();
        await expect(userDetail.errorMessage).not.toBeVisible();
        await userDetail.waitForSaveComplete();
        await expect(departmentInput).toHaveValue('Engineering Updated');
    });
    test('Should validate invalid email and show error with cancel option', async () => {
        const {userDetail} = systemConsolePage.users;
        const {userCard} = userDetail;
        const workEmailInput = userCard.getFieldInputByExactLabel('Work Email');
        const originalEmail = await workEmailInput.inputValue();
        await workEmailInput.clear();
        await workEmailInput.fill('not-an-email');
        const fieldError = userCard.getFieldError('Work Email');
        await expect(fieldError).toBeVisible();
        await expect(fieldError).toContainText('Invalid email address');
        await expect(userDetail.saveButton).toBeDisabled();
        await expect(userDetail.cancelButton).toBeVisible();
        await expect(userDetail.cancelButton).toBeEnabled();
        await userDetail.cancel();
        await expect(workEmailInput).toHaveValue(originalEmail);
        await expect(fieldError).not.toBeVisible();
        await expect(userDetail.cancelButton).not.toBeVisible();
        await expect(userDetail.saveButton).toBeDisabled();
    });
    test('Should validate invalid URL and show error with cancel option', async () => {
        const {userDetail} = systemConsolePage.users;
        const {userCard} = userDetail;
        const urlInput = userCard.getFieldInputByExactLabel('Personal Website');
        const originalUrl = await urlInput.inputValue();
        await urlInput.clear();
        await urlInput.fill('<%>');
        const fieldError = userCard.getFieldError('Personal Website');
        await expect(fieldError).toBeVisible();
        await expect(fieldError).toContainText('Invalid URL');
        await expect(userDetail.saveButton).toBeDisabled();
        await expect(userDetail.cancelButton).toBeVisible();
        await expect(userDetail.cancelButton).toBeEnabled();
        await userDetail.cancel();
        await expect(urlInput).toHaveValue(originalUrl);
        await expect(fieldError).not.toBeVisible();
        await expect(userDetail.cancelButton).not.toBeVisible();
    });
    test('Should validate invalid email in custom email attribute', async () => {
        const {userDetail} = systemConsolePage.users;
        const {userCard} = userDetail;
        const workEmailInput = userCard.getFieldInputByExactLabel('Work Email');
        await workEmailInput.clear();
        await workEmailInput.fill('not-an-email-either');
        const fieldError = userCard.getFieldError('Work Email');
        await expect(fieldError).toBeVisible();
        await expect(fieldError).toContainText('Invalid email address');
        await expect(userDetail.saveButton).toBeDisabled();
        await expect(userDetail.cancelButton).toBeVisible();
    });
    test('Should show save/cancel buttons when changes are made', async () => {
        const {userDetail} = systemConsolePage.users;
        const {userCard} = userDetail;
        await expect(userDetail.saveButton).toBeDisabled();
        await expect(userDetail.cancelButton).not.toBeVisible();
        const departmentInput = userCard.getFieldInputByExactLabel('Department');
        const originalValue = await departmentInput.inputValue();
        await departmentInput.clear();
        await departmentInput.fill('Changed Value');
        await expect(userDetail.saveButton).toBeEnabled();
        await expect(userDetail.cancelButton).toBeVisible();
        await expect(userDetail.cancelButton).toBeEnabled();
        await userDetail.cancel();
        await expect(departmentInput).toHaveValue(originalValue);
        await expect(userDetail.cancelButton).not.toBeVisible();
        await expect(userDetail.saveButton).toBeDisabled();
    });
    test('Should save all user attribute changes atomically', async () => {
        const {userDetail} = systemConsolePage.users;
        const {userCard} = userDetail;
        const newEmail = `atomic-test-${testUser.email}`;
        await userCard.emailInput.clear();
        await userCard.emailInput.fill(newEmail);
        const departmentInput = userCard.getFieldInputByExactLabel('Department');
        await departmentInput.clear();
        await departmentInput.fill('Sales');
        await userDetail.save();
        await userDetail.saveChangesModal.confirm();
        await expect(userDetail.errorMessage).not.toBeVisible();
        await expect(userCard.emailInput).toHaveValue(newEmail);
        await expect(departmentInput).toHaveValue('Sales');
        await userDetail.waitForSaveComplete();
    });
});