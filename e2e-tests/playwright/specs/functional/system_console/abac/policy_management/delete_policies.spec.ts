import {expect, test, enableABAC, navigateToABACPage} from '@mattermost/playwright-lib';
import {
    CustomProfileAttribute,
    setupCustomProfileAttributeFields,
} from '../../../channels/custom_profile_attributes/helpers';
import {createPrivateChannelForABAC, createBasicPolicy, enableUserManagedAttributes} from '../support';
test.describe('ABAC Policy Management - Delete Policies', () => {
    test('MM-T5793 Policy with channels cannot be deleted, policy without channels can be deleted', async ({pw}) => {
        test.setTimeout(120000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        const attributeFields: CustomProfileAttribute[] = [{name: 'Department', type: 'text', value: ''}];
        await setupCustomProfileAttributeFields(adminClient, attributeFields);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        const page = systemConsolePage.page;
        await navigateToABACPage(page);
        await enableABAC(page);
        const uniqueId = await pw.random.id();
        const policyWithChannelName = `ABAC-WithChannel-${uniqueId}`;
        const policyWithoutChannelName = `ABAC-NoChannel-${uniqueId}`;
        const team = (await adminClient.getMyTeams())[0];
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        await createBasicPolicy(page, {
            name: policyWithChannelName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: false,
            channels: [privateChannel.display_name],
        });
        await navigateToABACPage(page);
        await page.waitForTimeout(1000);
        const addPolicyButton = page.getByRole('button', {name: 'Add policy'});
        await addPolicyButton.click();
        await page.waitForLoadState('networkidle');
        const nameInput = page.locator('#admin\\.access_control\\.policy\\.edit_policy\\.policyName');
        await nameInput.waitFor({state: 'visible', timeout: 10000});
        await nameInput.fill(policyWithoutChannelName);
        const advancedModeButton = page.getByRole('button', {name: /advanced/i});
        if (await advancedModeButton.isVisible({timeout: 2000})) {
            await advancedModeButton.click();
            await page.waitForTimeout(1000);
        }
        const monacoContainer = page.locator('.monaco-editor').first();
        await monacoContainer.waitFor({state: 'visible', timeout: 5000});
        const editorLines = page.locator('.monaco-editor .view-lines').first();
        await editorLines.click({force: true});
        await page.waitForTimeout(300);
        const isMac = process.platform === 'darwin';
        await page.keyboard.press(isMac ? 'Meta+a' : 'Control+a');
        await page.waitForTimeout(100);
        await page.keyboard.type('user.attributes.Department == "Sales"', {delay: 10});
        await page.waitForTimeout(1000);
        const saveButton = page.getByRole('button', {name: 'Save'});
        await saveButton.click();
        await page.waitForURL('**/attribute_based_access_control', {timeout: 10000});
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        const searchInput = page.locator('input[placeholder*="Search" i]').first();
        await searchInput.waitFor({state: 'visible', timeout: 5000});
        await searchInput.clear();
        await page.waitForTimeout(500);
        await page.locator('.policy-name, tr.clickable').count();
        await searchInput.fill(policyWithChannelName);
        await page.waitForTimeout(1000);
        const policyWithChannelRow = page
            .locator('tr.clickable, .DataGrid_row')
            .filter({hasText: policyWithChannelName})
            .first();
        await policyWithChannelRow.waitFor({state: 'visible', timeout: 10000});
        const menuButtonWithChannel = policyWithChannelRow
            .locator('button[id*="policy-menu"], button[aria-label*="menu" i], .menu-button, button:has(svg)')
            .first();
        await menuButtonWithChannel.click();
        await page.waitForTimeout(500);
        const deleteMenuItemWithChannel = page.getByRole('menuitem', {name: /delete/i});
        const isDeleteDisabled = await deleteMenuItemWithChannel.isDisabled();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        expect(isDeleteDisabled).toBe(true);
        await searchInput.clear();
        await page.waitForTimeout(500);
        const policyWithoutChannelExists = await page.locator('text=' + policyWithoutChannelName).count();
        if (policyWithoutChannelExists === 0) {
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
        }
        await searchInput.fill(policyWithoutChannelName);
        await page.waitForTimeout(1000);
        const policyWithoutChannelRow = page
            .locator('tr.clickable, .DataGrid_row')
            .filter({hasText: policyWithoutChannelName})
            .first();
        await policyWithoutChannelRow.waitFor({state: 'visible', timeout: 10000});
        const menuButtonWithoutChannel = policyWithoutChannelRow
            .locator('button[id*="policy-menu"], button[aria-label*="menu" i], .menu-button, button:has(svg)')
            .first();
        await menuButtonWithoutChannel.click();
        await page.waitForTimeout(500);
        const deleteMenuItemWithoutChannel = page.getByRole('menuitem', {name: /delete/i});
        const isDeleteEnabled = !(await deleteMenuItemWithoutChannel.isDisabled());
        expect(isDeleteEnabled).toBe(true);
        await deleteMenuItemWithoutChannel.click();
        await page.waitForTimeout(500);
        const confirmDeleteButton = page.getByRole('button', {name: /delete|confirm/i});
        if (await confirmDeleteButton.isVisible({timeout: 2000})) {
            await confirmDeleteButton.click();
            await page.waitForTimeout(1000);
        }
        await page.waitForLoadState('networkidle');
        await searchInput.clear();
        await searchInput.fill(policyWithoutChannelName);
        await page.waitForTimeout(1000);
        const policyStillExists = await page
            .locator('tr.clickable, .DataGrid_row')
            .filter({hasText: policyWithoutChannelName})
            .isVisible({timeout: 3000});
        expect(policyStillExists).toBe(false);
    });
});