import {
    expect,
    test,
    enableABAC,
    navigateToABACPage,
    runSyncJob,
    verifyUserInChannel,
    updateUserAttributes,
    createUserWithAttributes,
} from '@mattermost/playwright-lib';
import {
    ensureUserAttributes,
    createPrivateChannelForABAC,
    createBasicPolicy,
    createAdvancedPolicy,
    activatePolicy,
    waitForLatestSyncJob,
} from '../support';
test.describe('ABAC LDAP Integration - Sync', () => {
    test('MM-T5797 LDAP sync - User auto-added when attribute syncs (auto-add true)', async ({pw}) => {
        test.setTimeout(180000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await ensureUserAttributes(adminClient, ['Department']);
        const user1 = await createUserWithAttributes(adminClient, {Department: 'Sales'});
        await adminClient.addToTeam(team.id, user1.id);
        const channel1 = await createPrivateChannelForABAC(adminClient, team.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policy1Name = `LDAP AutoAdd Single ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policy1Name,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: true,
            channels: [channel1.display_name],
        });
        await systemConsolePage.page.waitForTimeout(2000);
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput.waitFor({state: 'visible', timeout: 5000});
        await searchInput.fill(policy1Name.match(/([a-z0-9]+)$/i)?.[1] || policy1Name);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow1 = systemConsolePage.page.locator('.policy-name').first();
        const policyId1 = (await policyRow1.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId1) {
            await activatePolicy(adminClient, policyId1);
        }
        await searchInput.clear();
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user1InitialCheck = await verifyUserInChannel(adminClient, user1.id, channel1.id);
        expect(user1InitialCheck).toBe(false);
        await updateUserAttributes(adminClient, user1.id, {Department: 'Engineering'});
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user1AfterSync = await verifyUserInChannel(adminClient, user1.id, channel1.id);
        expect(user1AfterSync).toBe(true);
        const posts1 = await adminClient.getPosts(channel1.id, 0, 10);
        const postList1 = posts1.order.map((postId: string) => posts1.posts[postId]);
        const addMessage1 = postList1.find((post: any) => {
            return post.type === 'system_add_to_channel' && post.props?.addedUserId === user1.id;
        });
        if (addMessage1) {
        } else {
        }
        const user2 = await createUserWithAttributes(adminClient, {
            Department: 'Sales',
        });
        await adminClient.addToTeam(team.id, user2.id);
        const channel2 = await createPrivateChannelForABAC(adminClient, team.id);
        await navigateToABACPage(systemConsolePage.page);
        const policy2Name = `LDAP AutoAdd Contains ${await pw.random.id()}`;
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policy2Name,
            celExpression: 'user.attributes.Department.contains("Eng")',
            autoSync: true,
            channels: [channel2.display_name],
        });
        await waitForLatestSyncJob(systemConsolePage.page);
        await searchInput.fill(policy2Name.match(/([a-z0-9]+)$/i)?.[1] || policy2Name);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow2 = systemConsolePage.page.locator('.policy-name').first();
        const policyId2 = (await policyRow2.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId2) {
            await activatePolicy(adminClient, policyId2);
        }
        await searchInput.clear();
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user2InitialCheck = await verifyUserInChannel(adminClient, user2.id, channel2.id);
        expect(user2InitialCheck).toBe(false);
        await updateUserAttributes(adminClient, user2.id, {Department: 'Engineering'});
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user2AfterSync = await verifyUserInChannel(adminClient, user2.id, channel2.id);
        expect(user2AfterSync).toBe(true);
        const posts2 = await adminClient.getPosts(channel2.id, 0, 10);
        const postList2 = posts2.order.map((postId: string) => posts2.posts[postId]);
        const addMessage2 = postList2.find((post: any) => {
            return post.type === 'system_add_to_channel' && post.props?.addedUserId === user2.id;
        });
        if (addMessage2) {
        } else {
        }
    });
    test('MM-T5798 User added by admin after LDAP attribute sync (auto-add false)', async ({pw}) => {
        test.setTimeout(180000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await ensureUserAttributes(adminClient);
        const user1 = await createUserWithAttributes(adminClient, {Department: 'Sales'});
        await adminClient.addToTeam(team.id, user1.id);
        const channel1 = await createPrivateChannelForABAC(adminClient, team.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policy1Name = `LDAP Sync Equals ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policy1Name,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: false,
            channels: [channel1.display_name],
        });
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput.waitFor({state: 'visible', timeout: 5000});
        await searchInput.fill(policy1Name.match(/([a-z0-9]+)$/i)?.[1] || policy1Name);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow1 = systemConsolePage.page.locator('.policy-name').first();
        const policyId1 = (await policyRow1.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId1) {
            await activatePolicy(adminClient, policyId1);
        }
        await searchInput.clear();
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user1InitialCheck = await verifyUserInChannel(adminClient, user1.id, channel1.id);
        expect(user1InitialCheck).toBe(false);
        await updateUserAttributes(adminClient, user1.id, {Department: 'Engineering'});
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user1AfterSync = await verifyUserInChannel(adminClient, user1.id, channel1.id);
        if (user1AfterSync) {
        } else {
            await adminClient.addToChannel(user1.id, channel1.id);
            const user1AfterAdminAdd = await verifyUserInChannel(adminClient, user1.id, channel1.id);
            expect(user1AfterAdminAdd).toBe(true);
        }
        const user1Final = await verifyUserInChannel(adminClient, user1.id, channel1.id);
        expect(user1Final).toBe(true);
        const user2 = await createUserWithAttributes(adminClient, {Department: 'Marketing'});
        await adminClient.addToTeam(team.id, user2.id);
        const channel2 = await createPrivateChannelForABAC(adminClient, team.id);
        await navigateToABACPage(systemConsolePage.page);
        const policy2Name = `LDAP Sync In ${await pw.random.id()}`;
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policy2Name,
            celExpression: 'user.attributes.Department in ["Engineering", "Product"]',
            autoSync: false,
            channels: [channel2.display_name],
        });
        await waitForLatestSyncJob(systemConsolePage.page);
        await searchInput.fill(policy2Name.match(/([a-z0-9]+)$/i)?.[1] || policy2Name);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow2 = systemConsolePage.page.locator('.policy-name').first();
        const policyId2 = (await policyRow2.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId2) {
            await activatePolicy(adminClient, policyId2);
        }
        await searchInput.clear();
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user2InitialCheck = await verifyUserInChannel(adminClient, user2.id, channel2.id);
        expect(user2InitialCheck).toBe(false);
        await updateUserAttributes(adminClient, user2.id, {Department: 'Product'});
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user2AfterSync = await verifyUserInChannel(adminClient, user2.id, channel2.id);
        if (user2AfterSync) {
        } else {
            await adminClient.addToChannel(user2.id, channel2.id);
            const user2AfterAdminAdd = await verifyUserInChannel(adminClient, user2.id, channel2.id);
            expect(user2AfterAdminAdd).toBe(true);
        }
        const user2Final = await verifyUserInChannel(adminClient, user2.id, channel2.id);
        expect(user2Final).toBe(true);
    });
    test('MM-T5799 LDAP sync - User removed after attribute removed', async ({pw}) => {
        test.setTimeout(180000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await ensureUserAttributes(adminClient, ['Department']);
        const user1 = await createUserWithAttributes(adminClient, {Department: 'Engineering'});
        await adminClient.addToTeam(team.id, user1.id);
        const channel1 = await createPrivateChannelForABAC(adminClient, team.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policy1Name = `LDAP Remove StartsWith ${await pw.random.id()}`;
        await createAdvancedPolicy(systemConsolePage.page, {
            name: policy1Name,
            celExpression: 'user.attributes.Department.startsWith("Eng")',
            autoSync: true,
            channels: [channel1.display_name],
        });
        await systemConsolePage.page.waitForTimeout(2000);
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput.waitFor({state: 'visible', timeout: 5000});
        await searchInput.fill(policy1Name.match(/([a-z0-9]+)$/i)?.[1] || policy1Name);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow1 = systemConsolePage.page.locator('.policy-name').first();
        const policyId1 = (await policyRow1.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId1) {
            await activatePolicy(adminClient, policyId1);
        }
        await searchInput.clear();
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user1InitialCheck = await verifyUserInChannel(adminClient, user1.id, channel1.id);
        expect(user1InitialCheck).toBe(true);
        await updateUserAttributes(adminClient, user1.id, {Department: 'Sales'});
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user1AfterSync = await verifyUserInChannel(adminClient, user1.id, channel1.id);
        expect(user1AfterSync).toBe(false);
        const posts1 = await adminClient.getPosts(channel1.id, 0, 10);
        const postList1 = posts1.order.map((postId: string) => posts1.posts[postId]);
        const removeMessage1 = postList1.find((post: any) => {
            return post.type === 'system_remove_from_channel' && post.props?.removedUserId === user1.id;
        });
        if (removeMessage1) {
        } else {
        }
        const user2 = await createUserWithAttributes(adminClient, {Department: 'Engineering'});
        await adminClient.addToTeam(team.id, user2.id);
        const channel2 = await createPrivateChannelForABAC(adminClient, team.id);
        await navigateToABACPage(systemConsolePage.page);
        const policy2Name = `LDAP Remove TwoAttr ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policy2Name,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: true,
            channels: [channel2.display_name],
        });
        await systemConsolePage.page.waitForTimeout(2000);
        await waitForLatestSyncJob(systemConsolePage.page);
        await searchInput.fill(policy2Name.match(/([a-z0-9]+)$/i)?.[1] || policy2Name);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow2 = systemConsolePage.page.locator('.policy-name').first();
        const policyId2 = (await policyRow2.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId2) {
            await activatePolicy(adminClient, policyId2);
        }
        await searchInput.clear();
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user2InitialCheck = await verifyUserInChannel(adminClient, user2.id, channel2.id);
        expect(user2InitialCheck).toBe(true);
        await updateUserAttributes(adminClient, user2.id, {Department: 'Sales'});
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const user2AfterSync = await verifyUserInChannel(adminClient, user2.id, channel2.id);
        expect(user2AfterSync).toBe(false);
        const posts2 = await adminClient.getPosts(channel2.id, 0, 10);
        const postList2 = posts2.order.map((postId: string) => posts2.posts[postId]);
        const removeMessage2 = postList2.find((post: any) => {
            return post.type === 'system_remove_from_channel' && post.props?.removedUserId === user2.id;
        });
        if (removeMessage2) {
        } else {
        }
    });
    test('MM-T5800 Policy enforcement after attribute change (bidirectional)', async ({pw}) => {
        test.setTimeout(120000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await ensureUserAttributes(adminClient);
        const user = await createUserWithAttributes(adminClient, {Department: 'Sales'});
        await adminClient.addToTeam(team.id, user.id);
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policyName = `Dynamic Policy ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: true,
            channels: [privateChannel.display_name],
        });
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput.waitFor({state: 'visible', timeout: 5000});
        const idMatch = policyName.match(/([a-z0-9]+)$/i);
        const uniqueId = idMatch ? idMatch[1] : policyName;
        await searchInput.fill(uniqueId);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow = systemConsolePage.page.locator('.policy-name').first();
        const policyId = (await policyRow.getAttribute('id'))?.replace('customDescription-', '');
        if (policyId) {
            await activatePolicy(adminClient, policyId);
        }
        await searchInput.clear();
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const phase1InChannel = await verifyUserInChannel(adminClient, user.id, privateChannel.id);
        expect(phase1InChannel).toBe(false);
        await updateUserAttributes(adminClient, user.id, {Department: 'Engineering'});
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const phase2InChannel = await verifyUserInChannel(adminClient, user.id, privateChannel.id);
        expect(phase2InChannel).toBe(true);
        await updateUserAttributes(adminClient, user.id, {Department: 'Marketing'});
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const phase3InChannel = await verifyUserInChannel(adminClient, user.id, privateChannel.id);
        expect(phase3InChannel).toBe(false);
    });
});