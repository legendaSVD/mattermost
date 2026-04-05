import {
    expect,
    test,
    enableABAC,
    navigateToABACPage,
    runSyncJob,
    verifyUserInChannel,
} from '@mattermost/playwright-lib';
import {
    CustomProfileAttribute,
    setupCustomProfileAttributeFields,
} from '../../../channels/custom_profile_attributes/helpers';
import {
    createUserForABAC,
    testAccessRule,
    createPrivateChannelForABAC,
    createBasicPolicy,
    activatePolicy,
    waitForLatestSyncJob,
    getJobDetailsFromRecentJobs,
    enableUserManagedAttributes,
} from '../support';
test.describe('ABAC Policies - Create Policies', () => {
    test('MM-T5783 Create and test policy with auto-add disabled', async ({pw}) => {
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        const departmentAttribute: CustomProfileAttribute[] = [{name: 'Department', type: 'text', value: ''}];
        const attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, departmentAttribute);
        const satisfyingUserNotInChannel = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
        ]);
        const satisfyingUserInChannel = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
        ]);
        const nonSatisfyingUserInChannel = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Sales'},
        ]);
        await adminClient.addToTeam(team.id, satisfyingUserNotInChannel.id);
        await adminClient.addToTeam(team.id, satisfyingUserInChannel.id);
        await adminClient.addToTeam(team.id, nonSatisfyingUserInChannel.id);
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(satisfyingUserInChannel.id, privateChannel.id);
        await adminClient.addToChannel(nonSatisfyingUserInChannel.id, privateChannel.id);
        const initialUser1InChannel = await verifyUserInChannel(
            adminClient,
            satisfyingUserNotInChannel.id,
            privateChannel.id,
        );
        const initialUser2InChannel = await verifyUserInChannel(
            adminClient,
            satisfyingUserInChannel.id,
            privateChannel.id,
        );
        const initialUser3InChannel = await verifyUserInChannel(
            adminClient,
            nonSatisfyingUserInChannel.id,
            privateChannel.id,
        );
        expect(initialUser1InChannel).toBe(false);
        expect(initialUser2InChannel).toBe(true);
        expect(initialUser3InChannel).toBe(true);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policyName = `Engineering Policy ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: false,
            channels: [privateChannel.display_name],
        });
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRowForTest = systemConsolePage.page.locator('.policy-name').filter({hasText: policyName}).first();
        if (await policyRowForTest.isVisible({timeout: 3000})) {
            await policyRowForTest.click();
            await systemConsolePage.page.waitForLoadState('networkidle');
            const testResult = await testAccessRule(systemConsolePage.page, {
                expectedMatchingUsers: [satisfyingUserNotInChannel.username, satisfyingUserInChannel.username],
                expectedNonMatchingUsers: [nonSatisfyingUserInChannel.username],
            });
            expect(testResult.expectedUsersMatch).toBe(true);
            expect(testResult.unexpectedUsersMatch).toBe(false);
            await navigateToABACPage(systemConsolePage.page);
        }
        await waitForLatestSyncJob(systemConsolePage.page);
        const user1AfterSync = await verifyUserInChannel(adminClient, satisfyingUserNotInChannel.id, privateChannel.id);
        expect(user1AfterSync).toBe(false);
        const user2AfterSync = await verifyUserInChannel(adminClient, satisfyingUserInChannel.id, privateChannel.id);
        expect(user2AfterSync).toBe(true);
        const user3AfterSync = await verifyUserInChannel(adminClient, nonSatisfyingUserInChannel.id, privateChannel.id);
        expect(user3AfterSync).toBe(false);
        await adminClient.addToChannel(satisfyingUserNotInChannel.id, privateChannel.id);
        const user1AfterManualAdd = await verifyUserInChannel(
            adminClient,
            satisfyingUserNotInChannel.id,
            privateChannel.id,
        );
        expect(user1AfterManualAdd).toBe(true);
        try {
            await adminClient.addToChannel(nonSatisfyingUserInChannel.id, privateChannel.id);
        } catch {
        }
        const user3AfterAttempt = await verifyUserInChannel(
            adminClient,
            nonSatisfyingUserInChannel.id,
            privateChannel.id,
        );
        expect(user3AfterAttempt).toBe(false);
    });
    test('MM-T5784 Create and test policy with auto-add enabled', async ({pw}) => {
        test.setTimeout(120000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        const departmentAttribute: CustomProfileAttribute[] = [{name: 'Department', type: 'text', value: ''}];
        const attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, departmentAttribute);
        const satisfyingUserNotInChannel = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
        ]);
        const satisfyingUserInChannel = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
        ]);
        const nonSatisfyingUserInChannel = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Sales'},
        ]);
        await adminClient.addToTeam(team.id, satisfyingUserNotInChannel.id);
        await adminClient.addToTeam(team.id, satisfyingUserInChannel.id);
        await adminClient.addToTeam(team.id, nonSatisfyingUserInChannel.id);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(satisfyingUserInChannel.id, privateChannel.id);
        await adminClient.addToChannel(nonSatisfyingUserInChannel.id, privateChannel.id);
        const initialUser1InChannel = await verifyUserInChannel(
            adminClient,
            satisfyingUserNotInChannel.id,
            privateChannel.id,
        );
        const initialUser2InChannel = await verifyUserInChannel(
            adminClient,
            satisfyingUserInChannel.id,
            privateChannel.id,
        );
        const initialUser3InChannel = await verifyUserInChannel(
            adminClient,
            nonSatisfyingUserInChannel.id,
            privateChannel.id,
        );
        expect(initialUser1InChannel).toBe(false);
        expect(initialUser2InChannel).toBe(true);
        expect(initialUser3InChannel).toBe(true);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policyName = `Auto-Add Policy ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: true,
            channels: [privateChannel.display_name],
        });
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRowForTest = systemConsolePage.page.locator('.policy-name').filter({hasText: policyName}).first();
        if (await policyRowForTest.isVisible({timeout: 3000})) {
            await policyRowForTest.click();
            await systemConsolePage.page.waitForLoadState('networkidle');
            const testResult = await testAccessRule(systemConsolePage.page, {
                expectedMatchingUsers: [satisfyingUserNotInChannel.username, satisfyingUserInChannel.username],
                expectedNonMatchingUsers: [nonSatisfyingUserInChannel.username],
            });
            expect(testResult.expectedUsersMatch).toBe(true);
            expect(testResult.unexpectedUsersMatch).toBe(false);
            await navigateToABACPage(systemConsolePage.page);
        }
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput.waitFor({state: 'visible', timeout: 5000});
        const idMatch = policyName.match(/([a-z0-9]+)$/i);
        const uniqueId = idMatch ? idMatch[1] : policyName;
        await searchInput.fill(uniqueId);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow = systemConsolePage.page.locator('.policy-name').first();
        const policyElementId = await policyRow.getAttribute('id');
        const policyId = policyElementId?.replace('customDescription-', '');
        if (!policyId) {
            throw new Error('Could not get policy ID');
        }
        await searchInput.clear();
        await activatePolicy(adminClient, policyId);
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const jobDetails = await getJobDetailsFromRecentJobs(systemConsolePage.page, privateChannel.display_name);
        expect(jobDetails.added).toBe(1);
        expect(jobDetails.removed).toBeGreaterThanOrEqual(1);
        const user1AfterSync = await verifyUserInChannel(adminClient, satisfyingUserNotInChannel.id, privateChannel.id);
        expect(user1AfterSync).toBe(true);
        const user2AfterSync = await verifyUserInChannel(adminClient, satisfyingUserInChannel.id, privateChannel.id);
        expect(user2AfterSync).toBe(true);
        const user3AfterSync = await verifyUserInChannel(adminClient, nonSatisfyingUserInChannel.id, privateChannel.id);
        expect(user3AfterSync).toBe(false);
    });
    test('MM-63848 Should show error when creating policy with duplicate name', async ({pw}) => {
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        const departmentAttribute: CustomProfileAttribute[] = [{name: 'Department', type: 'text', value: ''}];
        await setupCustomProfileAttributeFields(adminClient, departmentAttribute);
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        const page = systemConsolePage.page;
        await navigateToABACPage(page);
        await enableABAC(page);
        const policyName = `Duplicate Test ${await pw.random.id()}`;
        await createBasicPolicy(page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: false,
            channels: [privateChannel.display_name],
        });
        await navigateToABACPage(page);
        await createBasicPolicy(page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Sales',
            autoSync: false,
            channels: [],
        });
        const errorMessage = page.locator('.EditPolicy__error');
        await expect(errorMessage).toBeVisible({timeout: 5000});
        const errorText = await errorMessage.textContent();
        expect(errorText).toContain('A policy with this name already exists');
    });
});