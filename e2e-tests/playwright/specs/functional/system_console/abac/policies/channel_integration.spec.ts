import {
    expect,
    test,
    enableABAC,
    navigateToABACPage,
    runSyncJob,
    verifyUserInChannel,
} from '@mattermost/playwright-lib';
import {setupCustomProfileAttributeFields} from '../../../channels/custom_profile_attributes/helpers';
import {
    ensureUserAttributes,
    createUserForABAC,
    createPrivateChannelForABAC,
    createBasicPolicy,
    waitForLatestSyncJob,
} from '../support';
test.describe('ABAC Policies - Channel Integration', () => {
    test('MM-T5788 Add policy to channel from Channel Configuration page', async ({pw}) => {
        test.setTimeout(120000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await ensureUserAttributes(adminClient);
        const attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, [
            {name: 'Department', type: 'text'},
        ]);
        const satisfyingUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', value: 'Engineering', type: 'text'},
        ]);
        await adminClient.addToTeam(team.id, satisfyingUser.id);
        const nonSatisfyingUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', value: 'Sales', type: 'text'},
        ]);
        await adminClient.addToTeam(team.id, nonSatisfyingUser.id);
        const channel = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(nonSatisfyingUser.id, channel.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await navigateToABACPage(systemConsolePage.page);
        await enableABAC(systemConsolePage.page);
        const policyName = `Channel Config Policy ${await pw.random.id()}`;
        await createBasicPolicy(systemConsolePage.page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
        });
        const policyIdMatch = policyName.match(/([a-z0-9]+)$/i);
        const searchTerm = policyIdMatch ? policyIdMatch[1] : policyName;
        await systemConsolePage.page.goto('/admin_console/user_management/channels');
        await systemConsolePage.page.waitForLoadState('networkidle');
        const channelSearchInput = systemConsolePage.page.locator('input[placeholder*="Search" i]').first();
        await channelSearchInput.fill(channel.display_name);
        await systemConsolePage.page.waitForTimeout(1000);
        const channelRow = systemConsolePage.page
            .locator('.DataGrid_row')
            .filter({hasText: channel.display_name})
            .first();
        await channelRow.getByText('Edit').click();
        await systemConsolePage.page.waitForLoadState('networkidle');
        const abacToggle = systemConsolePage.page.locator('[data-testid="policy-enforce-toggle-button"]');
        await abacToggle.waitFor({state: 'visible', timeout: 5000});
        const isEnabled = await abacToggle.getAttribute('aria-pressed');
        if (isEnabled !== 'true') {
            await abacToggle.click();
        }
        await systemConsolePage.page.waitForTimeout(500);
        const linkButton = systemConsolePage.page.locator('[data-testid="link-to-a-policy"]');
        await linkButton.waitFor({state: 'visible', timeout: 5000});
        await linkButton.click();
        await systemConsolePage.page.waitForTimeout(500);
        const modal = systemConsolePage.page
            .locator('[role="dialog"]')
            .filter({hasText: 'Select an Access Control Policy'});
        await modal.waitFor({state: 'visible', timeout: 5000});
        const modalSearch = modal.locator('[data-testid="searchInput"]');
        await modalSearch.fill(searchTerm);
        await systemConsolePage.page.waitForTimeout(1000);
        const policyOption = modal.locator('.DataGrid_row').filter({hasText: policyName}).first();
        await policyOption.click();
        await systemConsolePage.page.waitForTimeout(500);
        await systemConsolePage.page.getByRole('button', {name: 'Save'}).click();
        await systemConsolePage.page.waitForLoadState('networkidle');
        await systemConsolePage.page.waitForTimeout(2000);
        await navigateToABACPage(systemConsolePage.page);
        await runSyncJob(systemConsolePage.page);
        await waitForLatestSyncJob(systemConsolePage.page);
        const nonSatisfyingInChannel = await verifyUserInChannel(adminClient, nonSatisfyingUser.id, channel.id);
        expect(nonSatisfyingInChannel).toBe(false);
        const satisfyingInChannel = await verifyUserInChannel(adminClient, satisfyingUser.id, channel.id);
        expect(satisfyingInChannel).toBe(false);
        await adminClient.addToChannel(satisfyingUser.id, channel.id);
        const afterManualAdd = await verifyUserInChannel(adminClient, satisfyingUser.id, channel.id);
        expect(afterManualAdd).toBe(true);
        let blocked = false;
        try {
            await adminClient.addToChannel(nonSatisfyingUser.id, channel.id);
        } catch {
            blocked = true;
        }
        expect(blocked).toBe(true);
    });
    test('MM-T5789 Channel with LDAP group sync cannot use ABAC', async ({pw}) => {
        test.setTimeout(120000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await ensureUserAttributes(adminClient);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        const page = systemConsolePage.page;
        await navigateToABACPage(page);
        await enableABAC(page);
        const policyName = `ABAC-GroupSync-Test-${await pw.random.id()}`;
        await createBasicPolicy(page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: false,
        });
        const groupSyncChannelName = `ABAC-GroupSync-${await pw.random.id()}`;
        const groupSyncChannel = await adminClient.createChannel({
            team_id: team.id,
            name: groupSyncChannelName.toLowerCase().replace(/[^a-z0-9]/g, ''),
            display_name: groupSyncChannelName,
            type: 'P',
        });
        await adminClient.patchChannel(groupSyncChannel.id, {
            group_constrained: true,
        } as any);
        await page.goto('/admin_console/user_management/channels');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const searchInput = page.locator('input[placeholder*="Search" i]').first();
        if (await searchInput.isVisible({timeout: 3000})) {
            await searchInput.fill(groupSyncChannelName);
            await page.waitForTimeout(1000);
        }
        const channelRow = page.locator('.DataGrid_row').filter({hasText: groupSyncChannelName}).first();
        await channelRow.waitFor({state: 'visible', timeout: 10000});
        const rowText = await channelRow.textContent();
        expect(rowText).toContain('Group Sync');
        await channelRow.getByText('Edit').click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const abacToggle = page.locator('[data-testid="policy-enforce-toggle-button"]');
        const abacVisibleWithGroupSync = await abacToggle.isVisible({timeout: 5000}).catch(() => false);
        expect(abacVisibleWithGroupSync).toBe(false);
        await adminClient.patchChannel(groupSyncChannel.id, {
            group_constrained: false,
        } as any);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const abacToggleAfter = page.locator('[data-testid="policy-enforce-toggle-button"]');
        const abacVisibleAfterDisable = await abacToggleAfter.isVisible({timeout: 5000}).catch(() => false);
        expect(abacVisibleAfterDisable).toBe(true);
        await adminClient.patchChannel(groupSyncChannel.id, {
            group_constrained: true,
        } as any);
        await navigateToABACPage(page);
        await page.waitForTimeout(1000);
        const policySearchInput = page.locator('input[placeholder*="Search" i]').first();
        if (await policySearchInput.isVisible({timeout: 3000})) {
            await policySearchInput.fill(policyName);
            await page.waitForTimeout(1000);
        }
        const policyRowLocator = page.locator('tr.clickable, .DataGrid_row').filter({hasText: policyName}).first();
        await policyRowLocator.waitFor({state: 'visible', timeout: 10000});
        await policyRowLocator.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const addChannelsButton = page.getByRole('button', {name: /add channel/i});
        await addChannelsButton.waitFor({state: 'visible', timeout: 10000});
        await addChannelsButton.click();
        await page.waitForTimeout(1000);
        const channelModal = page.locator('[role="dialog"]').filter({hasText: /channel/i});
        await channelModal.waitFor({state: 'visible', timeout: 5000});
        const modalSearchInput = channelModal.locator('[data-testid="searchInput"], input[type="text"]').first();
        if (await modalSearchInput.isVisible({timeout: 3000})) {
            await modalSearchInput.fill(groupSyncChannelName);
            await page.waitForTimeout(1000);
        }
        const channelRows = channelModal.locator('.DataGrid_row, .more-modal__row');
        const rowCount = await channelRows.count();
        if (rowCount === 0) {
        } else {
            const channelRowToSelect = channelRows.first();
            await channelRowToSelect.textContent();
            await channelRowToSelect.click({timeout: 5000}).catch(() => {
            });
            await page.waitForTimeout(500);
            const addButton = channelModal.getByRole('button', {name: 'Add'});
            if (await addButton.isVisible({timeout: 3000})) {
                const addButtonDisabled = await addButton.isDisabled();
                if (addButtonDisabled) {
                } else {
                    await addButton.click();
                    await page.waitForTimeout(1000);
                }
            }
            const closeButton = channelModal.getByRole('button', {name: /close|cancel|×/i});
            if (await closeButton.isVisible({timeout: 2000})) {
                await closeButton.click();
                await page.waitForTimeout(500);
            }
            const saveButton = page.getByRole('button', {name: 'Save'});
            if (await saveButton.isVisible({timeout: 3000})) {
                const saveEnabled = await saveButton.isEnabled();
                if (saveEnabled) {
                    await saveButton.click();
                    await page.waitForTimeout(2000);
                    const errorMessage = page.locator('.error-message, [class*="error"], .alert-danger');
                    const hasError = await errorMessage.isVisible({timeout: 3000}).catch(() => false);
                    if (hasError) {
                        await errorMessage.textContent();
                    } else {
                    }
                }
            }
        }
    });
});