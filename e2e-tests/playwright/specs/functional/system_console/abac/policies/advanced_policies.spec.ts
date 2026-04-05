import {
    expect,
    test,
    enableABAC,
    navigateToABACPage,
    runSyncJob,
    verifyUserInChannel,
    createUserWithAttributes,
} from '@mattermost/playwright-lib';
import {
    CustomProfileAttribute,
    setupCustomProfileAttributeFields,
} from '../../../channels/custom_profile_attributes/helpers';
import {
    ensureUserAttributes,
    createUserForABAC,
    testAccessRule,
    createPrivateChannelForABAC,
    createAdvancedPolicy,
    activatePolicy,
    waitForLatestSyncJob,
    getJobDetailsFromRecentJobs,
    enableUserManagedAttributes,
} from '../support';
test.describe('ABAC Policies - Advanced Policies', () => {
    test('MM-T5785 Test policy with all attribute types and auto-add', async ({pw}) => {
        test.setTimeout(180000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await ensureUserAttributes(adminClient);
        const satisfyingUserNotInChannel = await createUserWithAttributes(adminClient, {
            Department: 'Engineering',
        });
        const satisfyingUserInChannel = await createUserWithAttributes(adminClient, {
            Department: 'Engineering',
        });
        const partialSatisfyingUser = await createUserWithAttributes(adminClient, {
            Department: 'Sales',
        });
        await adminClient.addToTeam(team.id, satisfyingUserNotInChannel.id);
        await adminClient.addToTeam(team.id, satisfyingUserInChannel.id);
        await adminClient.addToTeam(team.id, partialSatisfyingUser.id);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(satisfyingUserInChannel.id, privateChannel.id);
        await adminClient.addToChannel(partialSatisfyingUser.id, privateChannel.id);
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
            partialSatisfyingUser.id,
            privateChannel.id,
        );
        expect(initialUser1InChannel).toBe(false);
        expect(initialUser2InChannel).toBe(true);
        expect(initialUser3InChannel).toBe(true);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policyName = `Multi-Attr Policy ${await pw.random.id()}`;
        const celExpression = 'user.attributes.Department == "Engineering"';
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policyName,
            celExpression: celExpression,
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
                expectedNonMatchingUsers: [partialSatisfyingUser.username],
            });
            expect(testResult.expectedUsersMatch).toBe(true);
            expect(testResult.unexpectedUsersMatch).toBe(false);
            await navigateToABACPage(systemConsolePage.page);
        }
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
        await waitForLatestSyncJob(systemConsolePage.page, 10);
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page, 10);
        await verifyUserInChannel(adminClient, satisfyingUserNotInChannel.id, privateChannel.id);
        await verifyUserInChannel(adminClient, satisfyingUserInChannel.id, privateChannel.id);
        await verifyUserInChannel(adminClient, partialSatisfyingUser.id, privateChannel.id);
        try {
            const jobDetails = await getJobDetailsFromRecentJobs(systemConsolePage.page, privateChannel.display_name);
            if (jobDetails.added >= 1) {
            } else {
            }
            if (jobDetails.removed >= 1) {
            } else {
            }
        } catch {
        }
        let user1AfterSync = await verifyUserInChannel(adminClient, satisfyingUserNotInChannel.id, privateChannel.id);
        if (!user1AfterSync) {
            await runSyncJob(systemConsolePage.page);
            await waitForLatestSyncJob(systemConsolePage.page, 10);
            await systemConsolePage.page.waitForTimeout(2000);
            user1AfterSync = await verifyUserInChannel(adminClient, satisfyingUserNotInChannel.id, privateChannel.id);
        }
        expect(user1AfterSync).toBe(true);
        const user2AfterSync = await verifyUserInChannel(adminClient, satisfyingUserInChannel.id, privateChannel.id);
        expect(user2AfterSync).toBe(true);
        const user3AfterSync = await verifyUserInChannel(adminClient, partialSatisfyingUser.id, privateChannel.id);
        expect(user3AfterSync).toBe(false);
    });
    test('MM-T5786 Test policy with various operators in Simple mode', async ({pw}) => {
        test.setTimeout(300000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        try {
            const existingFields = await adminClient.getCustomProfileAttributeFields();
            for (const field of existingFields || []) {
                await adminClient.deleteCustomProfileAttributeField(field.id).catch(() => {
                });
            }
        } catch {
        }
        const attributeFields: CustomProfileAttribute[] = [{name: 'Department', type: 'text', value: ''}];
        const attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, attributeFields);
        const engineerUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
        ]);
        const salesUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Sales'},
        ]);
        await adminClient.addToTeam(team.id, engineerUser.id);
        await adminClient.addToTeam(team.id, salesUser.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const channel1 = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(salesUser.id, channel1.id);
        const policy1Name = `IsNot Policy ${await pw.random.id()}`;
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policy1Name,
            celExpression: 'user.attributes.Department != "Sales"',
            autoSync: true,
            channels: [channel1.display_name],
        });
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRowForTest1 = systemConsolePage.page.locator('.policy-name').filter({hasText: policy1Name}).first();
        if (await policyRowForTest1.isVisible({timeout: 3000})) {
            await policyRowForTest1.click();
            await systemConsolePage.page.waitForLoadState('networkidle');
            await testAccessRule(systemConsolePage.page, {
                expectedMatchingUsers: [engineerUser.username],
                expectedNonMatchingUsers: [salesUser.username],
            });
            await navigateToABACPage(systemConsolePage.page);
        }
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput1 = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput1.fill('IsNot');
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow1 = systemConsolePage.page.locator('.policy-name').first();
        const policyId1 = (await policyRow1.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId1) {
            await activatePolicy(adminClient, policyId1);
            await runSyncJob(systemConsolePage.page);
            await waitForLatestSyncJob(systemConsolePage.page);
        }
        await searchInput1.clear();
        const eng1InChannel = await verifyUserInChannel(adminClient, engineerUser.id, channel1.id);
        const sales1InChannel = await verifyUserInChannel(adminClient, salesUser.id, channel1.id);
        expect(eng1InChannel).toBe(true);
        expect(sales1InChannel).toBe(false);
        await navigateToABACPage(systemConsolePage.page);
        const channel2 = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(salesUser.id, channel2.id);
        const policy2Name = `In Policy ${await pw.random.id()}`;
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policy2Name,
            celExpression: 'user.attributes.Department in ["Engineering", "DevOps"]',
            autoSync: true,
            channels: [channel2.display_name],
        });
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRowForTest2 = systemConsolePage.page.locator('.policy-name').filter({hasText: policy2Name}).first();
        if (await policyRowForTest2.isVisible({timeout: 3000})) {
            await policyRowForTest2.click();
            await systemConsolePage.page.waitForLoadState('networkidle');
            await testAccessRule(systemConsolePage.page, {
                expectedMatchingUsers: [engineerUser.username],
                expectedNonMatchingUsers: [salesUser.username],
            });
            await navigateToABACPage(systemConsolePage.page);
        }
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput2 = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput2.fill('In Policy');
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow2 = systemConsolePage.page.locator('.policy-name').first();
        const policyId2 = (await policyRow2.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId2) {
            await activatePolicy(adminClient, policyId2);
            await runSyncJob(systemConsolePage.page);
            await waitForLatestSyncJob(systemConsolePage.page);
        }
        await searchInput2.clear();
        const eng2InChannel = await verifyUserInChannel(adminClient, engineerUser.id, channel2.id);
        const sales2InChannel = await verifyUserInChannel(adminClient, salesUser.id, channel2.id);
        expect(eng2InChannel).toBe(true);
        expect(sales2InChannel).toBe(false);
        await navigateToABACPage(systemConsolePage.page);
        const channel3 = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(salesUser.id, channel3.id);
        const policy3Name = `StartsWith Policy ${await pw.random.id()}`;
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policy3Name,
            celExpression: 'user.attributes.Department.startsWith("Eng")',
            autoSync: true,
            channels: [channel3.display_name],
        });
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRowForTest3 = systemConsolePage.page.locator('.policy-name').filter({hasText: policy3Name}).first();
        if (await policyRowForTest3.isVisible({timeout: 3000})) {
            await policyRowForTest3.click();
            await systemConsolePage.page.waitForLoadState('networkidle');
            await testAccessRule(systemConsolePage.page, {
                expectedMatchingUsers: [engineerUser.username],
                expectedNonMatchingUsers: [salesUser.username],
            });
            await navigateToABACPage(systemConsolePage.page);
        }
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput3 = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput3.fill('StartsWith');
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow3 = systemConsolePage.page.locator('.policy-name').first();
        const policyId3 = (await policyRow3.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId3) {
            await activatePolicy(adminClient, policyId3);
            await runSyncJob(systemConsolePage.page);
            await waitForLatestSyncJob(systemConsolePage.page);
        }
        await searchInput3.clear();
        const eng3InChannel = await verifyUserInChannel(adminClient, engineerUser.id, channel3.id);
        const sales3InChannel = await verifyUserInChannel(adminClient, salesUser.id, channel3.id);
        expect(eng3InChannel).toBe(true);
        expect(sales3InChannel).toBe(false);
        await navigateToABACPage(systemConsolePage.page);
        const channel4 = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(salesUser.id, channel4.id);
        const policy4Name = `EndsWith Policy ${await pw.random.id()}`;
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policy4Name,
            celExpression: 'user.attributes.Department.endsWith("ing")',
            autoSync: true,
            channels: [channel4.display_name],
        });
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRowForTest4 = systemConsolePage.page.locator('.policy-name').filter({hasText: policy4Name}).first();
        if (await policyRowForTest4.isVisible({timeout: 3000})) {
            await policyRowForTest4.click();
            await systemConsolePage.page.waitForLoadState('networkidle');
            await testAccessRule(systemConsolePage.page, {
                expectedMatchingUsers: [engineerUser.username],
                expectedNonMatchingUsers: [salesUser.username],
            });
            await navigateToABACPage(systemConsolePage.page);
        }
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput4 = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput4.fill('EndsWith');
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow4 = systemConsolePage.page.locator('.policy-name').first();
        const policyId4 = (await policyRow4.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId4) {
            await activatePolicy(adminClient, policyId4);
            await runSyncJob(systemConsolePage.page);
            await waitForLatestSyncJob(systemConsolePage.page);
        }
        await searchInput4.clear();
        const eng4InChannel = await verifyUserInChannel(adminClient, engineerUser.id, channel4.id);
        const sales4InChannel = await verifyUserInChannel(adminClient, salesUser.id, channel4.id);
        expect(eng4InChannel).toBe(true);
        expect(sales4InChannel).toBe(false);
        await navigateToABACPage(systemConsolePage.page);
        const channel5 = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(salesUser.id, channel5.id);
        const policy5Name = `Contains Policy ${await pw.random.id()}`;
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policy5Name,
            celExpression: 'user.attributes.Department.contains("gineer")',
            autoSync: true,
            channels: [channel5.display_name],
        });
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRowForTest5 = systemConsolePage.page.locator('.policy-name').filter({hasText: policy5Name}).first();
        if (await policyRowForTest5.isVisible({timeout: 3000})) {
            await policyRowForTest5.click();
            await systemConsolePage.page.waitForLoadState('networkidle');
            await testAccessRule(systemConsolePage.page, {
                expectedMatchingUsers: [engineerUser.username],
                expectedNonMatchingUsers: [salesUser.username],
            });
            await navigateToABACPage(systemConsolePage.page);
        }
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput5 = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput5.fill('Contains');
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow5 = systemConsolePage.page.locator('.policy-name').first();
        const policyId5 = (await policyRow5.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId5) {
            await activatePolicy(adminClient, policyId5);
            await runSyncJob(systemConsolePage.page);
            await waitForLatestSyncJob(systemConsolePage.page);
        }
        await searchInput5.clear();
        const eng5InChannel = await verifyUserInChannel(adminClient, engineerUser.id, channel5.id);
        const sales5InChannel = await verifyUserInChannel(adminClient, salesUser.id, channel5.id);
        expect(eng5InChannel).toBe(true);
        expect(sales5InChannel).toBe(false);
    });
    test('MM-T5787 Test policy with complex rules in Advanced Mode', async ({pw}) => {
        test.setTimeout(120000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        try {
            const existingFields = await (adminClient as any).doFetch(
                `${adminClient.getBaseRoute()}/custom_profile_attributes/fields`,
                {method: 'GET'},
            );
            for (const field of existingFields || []) {
                try {
                    await adminClient.deleteCustomProfileAttributeField(field.id);
                } catch {
                }
            }
        } catch {
        }
        const attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, [
            {name: 'Department', type: 'text'},
            {name: 'Location', type: 'text'},
        ]);
        Object.keys(attributeFieldsMap);
        const engineerUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', value: 'Engineering', type: 'text'},
            {name: 'Location', value: 'Office', type: 'text'},
        ]);
        const salesRemoteUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', value: 'Sales', type: 'text'},
            {name: 'Location', value: 'Remote', type: 'text'},
        ]);
        const salesOfficeUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', value: 'Sales', type: 'text'},
            {name: 'Location', value: 'Office', type: 'text'},
        ]);
        await adminClient.addToTeam(team.id, engineerUser.id);
        await adminClient.addToTeam(team.id, salesRemoteUser.id);
        await adminClient.addToTeam(team.id, salesOfficeUser.id);
        const channel = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(salesOfficeUser.id, channel.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        await systemConsolePage.page.reload();
        await systemConsolePage.page.waitForLoadState('networkidle');
        const policyName = `Complex Policy ${await pw.random.id()}`;
        const complexExpression =
            'user.attributes.Department == "Engineering" || (user.attributes.Department == "Sales" && user.attributes.Location == "Remote")';
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policyName,
            celExpression: complexExpression,
            autoSync: true,
            channels: [channel.display_name],
        });
        await navigateToABACPage(systemConsolePage.page);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow = systemConsolePage.page.locator('.policy-name').filter({hasText: policyName}).first();
        if (await policyRow.isVisible({timeout: 5000})) {
            await policyRow.click();
            await systemConsolePage.page.waitForLoadState('networkidle');
            await testAccessRule(systemConsolePage.page, {
                expectedMatchingUsers: [engineerUser.username, salesRemoteUser.username],
                expectedNonMatchingUsers: [salesOfficeUser.username],
            });
            await navigateToABACPage(systemConsolePage.page);
        } else {
        }
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        const policyIdMatch = policyName.match(/([a-z0-9]+)$/i);
        const searchTerm = policyIdMatch ? policyIdMatch[1] : policyName;
        await searchInput.fill(searchTerm);
        await systemConsolePage.page.waitForTimeout(1000);
        const foundPolicy = systemConsolePage.page.locator('.policy-name').filter({hasText: policyName}).first();
        if (await foundPolicy.isVisible({timeout: 5000})) {
            const policyId = (await foundPolicy.getAttribute('id'))?.replace('customDescription-', '');
            if (policyId) {
                await activatePolicy(adminClient, policyId);
                await runSyncJob(systemConsolePage.page);
                await waitForLatestSyncJob(systemConsolePage.page);
            }
        } else {
            await systemConsolePage.page.locator('.policy-name').allTextContents();
        }
        await searchInput.clear();
        const engineerInChannel = await verifyUserInChannel(adminClient, engineerUser.id, channel.id);
        expect(engineerInChannel).toBe(true);
        const salesRemoteInChannel = await verifyUserInChannel(adminClient, salesRemoteUser.id, channel.id);
        expect(salesRemoteInChannel).toBe(true);
        const salesOfficeInChannel = await verifyUserInChannel(adminClient, salesOfficeUser.id, channel.id);
        expect(salesOfficeInChannel).toBe(false);
    });
});