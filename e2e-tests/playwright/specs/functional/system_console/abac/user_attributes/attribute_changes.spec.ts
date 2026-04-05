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
    CustomProfileAttribute,
    setupCustomProfileAttributeFields,
} from '../../../channels/custom_profile_attributes/helpers';
import {
    ensureUserAttributes,
    createUserForABAC,
    createPrivateChannelForABAC,
    createBasicPolicy,
    activatePolicy,
    waitForLatestSyncJob,
    enableUserManagedAttributes,
} from '../support';
test.describe('ABAC User Attributes - Attribute Changes', () => {
    test('MM-T5794 User auto-added when qualifying attribute is added to profile', async ({pw}) => {
        test.setTimeout(120000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await ensureUserAttributes(adminClient);
        const testUser = await createUserWithAttributes(adminClient, {Department: 'Sales'});
        await adminClient.addToTeam(team.id, testUser.id);
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policyName = `Engineering Access ${await pw.random.id()}`;
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
        const initialInChannel = await verifyUserInChannel(adminClient, testUser.id, privateChannel.id);
        expect(initialInChannel).toBe(false);
        await updateUserAttributes(adminClient, testUser.id, {Department: 'Engineering'});
        await adminClient.getUserCustomProfileAttributesValues(testUser.id);
        await adminClient.getCustomProfileAttributeFields();
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        await adminClient.getChannelMembers(privateChannel.id);
        const finalInChannel = await verifyUserInChannel(adminClient, testUser.id, privateChannel.id);
        if (!finalInChannel) {
        }
        expect(finalInChannel).toBe(true);
        const posts = await adminClient.getPosts(privateChannel.id, 0, 10);
        const postList = posts.order.map((postId: string) => posts.posts[postId]);
        const userAddedMessage = postList.find((post: any) => {
            return (
                post.type === 'system_add_to_channel' &&
                post.props?.addedUserId === testUser.id &&
                post.user_id === 'system'
            );
        });
        if (userAddedMessage) {
        } else {
        }
        expect(finalInChannel).toBe(true);
    });
    test('MM-T5795 User can be added by admin after attribute added (auto-add false)', async ({pw}) => {
        test.setTimeout(120000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        const attributeFields: CustomProfileAttribute[] = [{name: 'Department', type: 'text', value: ''}];
        const attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, attributeFields);
        const testUser = await createUserForABAC(adminClient, attributeFieldsMap, []);
        await adminClient.addToTeam(team.id, testUser.id);
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policyName = `Engineering Manual Add ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: false,
            channels: [privateChannel.display_name],
        });
        await updateUserAttributes(adminClient, testUser.id, {Department: 'Engineering'});
        await adminClient.addToChannel(testUser.id, privateChannel.id);
        const userInChannel = await verifyUserInChannel(adminClient, testUser.id, privateChannel.id);
        expect(userInChannel).toBe(true);
        const posts = await adminClient.getPosts(privateChannel.id, 0, 10);
        const postList = posts.order.map((postId: string) => posts.posts[postId]);
        const userAddedMessage = postList.find((post: any) => {
            return post.type === 'system_add_to_channel' && post.props?.addedUserId === testUser.id;
        });
        if (userAddedMessage) {
        } else {
        }
    });
    test('MM-T5796 User auto-removed when required attribute is removed', async ({pw}) => {
        test.setTimeout(180000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        const attributeFields: CustomProfileAttribute[] = [{name: 'Department', type: 'text', value: ''}];
        const attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, attributeFields);
        const testUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
        ]);
        await adminClient.addToTeam(team.id, testUser.id);
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policy1Name = `Engineering Access NoAutoAdd ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policy1Name,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: false,
            channels: [privateChannel.display_name],
        });
        await adminClient.addToChannel(testUser.id, privateChannel.id);
        const initialInChannel = await verifyUserInChannel(adminClient, testUser.id, privateChannel.id);
        expect(initialInChannel).toBe(true);
        await waitForLatestSyncJob(systemConsolePage.page);
        const searchInput = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await searchInput.waitFor({state: 'visible', timeout: 5000});
        const idMatch = policy1Name.match(/([a-z0-9]+)$/i);
        const uniqueId = idMatch ? idMatch[1] : policy1Name;
        await searchInput.fill(uniqueId);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyRow = systemConsolePage.page.locator('.policy-name').first();
        const policyElementId = await policyRow.getAttribute('id');
        const policyId = policyElementId?.replace('customDescription-', '');
        if (policyId) {
            await activatePolicy(adminClient, policyId);
        }
        await searchInput.clear();
        await updateUserAttributes(adminClient, testUser.id, {Department: 'Sales'});
        await systemConsolePage.page.waitForTimeout(1000);
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        await systemConsolePage.page.waitForTimeout(1000);
        const userInChannelAfterRemoval = await verifyUserInChannel(adminClient, testUser.id, privateChannel.id);
        expect(userInChannelAfterRemoval).toBe(false);
        const posts = await adminClient.getPosts(privateChannel.id, 0, 10);
        const postList = posts.order.map((postId: string) => posts.posts[postId]);
        const userRemovedMessage = postList.find((post: any) => {
            return (
                (post.type === 'system_remove_from_channel' || post.type === 'system_leave_channel') &&
                (post.props?.removedUserId === testUser.id || post.user_id === testUser.id)
            );
        });
        if (userRemovedMessage) {
        } else {
        }
        await updateUserAttributes(adminClient, testUser.id, {Department: 'Engineering'});
        const channel2 = await createPrivateChannelForABAC(adminClient, team.id);
        await navigateToABACPage(systemConsolePage.page);
        const policy2Name = `Engineering Access WithAutoAdd ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policy2Name,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
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
        const userAutoAdded = await verifyUserInChannel(adminClient, testUser.id, channel2.id);
        expect(userAutoAdded).toBe(true);
        await updateUserAttributes(adminClient, testUser.id, {Department: 'Marketing'});
        await systemConsolePage.page.waitForTimeout(1000);
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        await systemConsolePage.page.waitForTimeout(1000);
        const userRemovedFromChannel2 = await verifyUserInChannel(adminClient, testUser.id, channel2.id);
        expect(userRemovedFromChannel2).toBe(false);
    });
});