import {
    expect,
    test,
    enableABAC,
    navigateToABACPage,
    verifyUserInChannel,
    verifyUserNotInChannel,
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
    createAdvancedPolicy,
    waitForLatestSyncJob,
    enableUserManagedAttributes,
} from '../support';
test.describe('ABAC Policy Management - Edit Policies', () => {
    test('MM-T5790 Editing policy value applies access control without auto-add', async ({pw}) => {
        test.setTimeout(180000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        await enableUserManagedAttributes(adminClient);
        const attributeFields: CustomProfileAttribute[] = [{name: 'Department', type: 'text', value: ''}];
        const attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, attributeFields);
        const engineerUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', value: 'Engineering', type: 'text'},
        ]);
        const salesUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', value: 'Sales', type: 'text'},
        ]);
        await adminClient.addToTeam(team.id, engineerUser.id);
        await adminClient.addToTeam(team.id, salesUser.id);
        const channelName = `abac-edit-test-${await pw.random.id()}`;
        const privateChannel = await adminClient.createChannel({
            team_id: team.id,
            name: channelName.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            display_name: channelName,
            type: 'P',
        });
        await adminClient.addToChannel(engineerUser.id, privateChannel.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        const page = systemConsolePage.page;
        await navigateToABACPage(page);
        await enableABAC(page);
        await verifyUserInChannel(adminClient, engineerUser.id, privateChannel.id);
        try {
            await (adminClient as any).doFetch(
                `${adminClient.getBaseRoute()}/users/${engineerUser.id}/custom_profile_attributes`,
                {method: 'GET'},
            );
        } catch {
        }
        const policyName = `ABAC-Edit-Test-${await pw.random.id()}`;
        await createBasicPolicy(page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: false,
            channels: [privateChannel.display_name],
        });
        await verifyUserInChannel(adminClient, engineerUser.id, privateChannel.id);
        await page.waitForTimeout(3000);
        const engineerAfterSync = await verifyUserInChannel(adminClient, engineerUser.id, privateChannel.id);
        const salesAfterSync = await verifyUserInChannel(adminClient, salesUser.id, privateChannel.id);
        try {
            await (adminClient as any).doFetch(
                `${adminClient.getBaseRoute()}/users/${engineerUser.id}/custom_profile_attributes`,
                {method: 'GET'},
            );
        } catch {
        }
        expect(engineerAfterSync).toBe(true);
        expect(salesAfterSync).toBe(false);
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
        const autoAddCheckbox = page.locator('#auto-add-header-checkbox');
        if (await autoAddCheckbox.isVisible({timeout: 3000})) {
            const isChecked = await autoAddCheckbox.isChecked();
            if (isChecked) {
                await autoAddCheckbox.click();
                await page.waitForTimeout(500);
            }
        } else {
        }
        const simpleValueInput = page.locator('.values-editor__simple-input').first();
        if (await simpleValueInput.isVisible({timeout: 3000})) {
            await simpleValueInput.click();
            await simpleValueInput.fill('');
            await simpleValueInput.fill('Sales');
            await page.keyboard.press('Tab');
            await page.waitForTimeout(500);
        } else {
            const valueButton = page.locator('[data-testid="valueSelectorMenuButton"]').first();
            if (await valueButton.isVisible({timeout: 3000})) {
                await valueButton.click();
                await page.waitForTimeout(500);
                const menuInput = page
                    .locator('#value-selector-menu input[type="text"], .value-selector-menu input')
                    .first();
                if (await menuInput.isVisible({timeout: 2000})) {
                    await menuInput.fill('Sales');
                    await page.waitForTimeout(500);
                    const salesOption = page.locator('#value-selector-menu').getByText('Sales', {exact: true}).first();
                    if (await salesOption.isVisible({timeout: 2000})) {
                        await salesOption.click();
                    } else {
                        await page.keyboard.press('Enter');
                    }
                    await page.waitForTimeout(500);
                }
            } else {
                const advancedModeButton = page.getByRole('button', {name: /advanced|switch to advanced/i});
                if (await advancedModeButton.isVisible({timeout: 3000})) {
                    await advancedModeButton.click();
                    await page.waitForTimeout(1000);
                    const monacoContainer = page.locator('.monaco-editor').first();
                    if (await monacoContainer.isVisible({timeout: 3000})) {
                        const editorLines = page.locator('.monaco-editor .view-lines').first();
                        await editorLines.click({force: true});
                        await page.waitForTimeout(300);
                        const isMac = process.platform === 'darwin';
                        await page.keyboard.press(isMac ? 'Meta+a' : 'Control+a');
                        await page.waitForTimeout(100);
                        await page.keyboard.type('user.attributes.Department == "Sales"', {delay: 10});
                        await page.waitForTimeout(500);
                    }
                }
            }
        }
        await testAccessRule(page);
        const saveButton = page.getByRole('button', {name: 'Save'});
        await saveButton.waitFor({state: 'visible', timeout: 5000});
        await saveButton.click();
        await page.waitForTimeout(1000);
        const applyPolicyButton = page.getByRole('button', {name: /apply policy/i});
        if (await applyPolicyButton.isVisible({timeout: 3000})) {
            await applyPolicyButton.click();
            await page.waitForTimeout(1000);
        }
        await navigateToABACPage(page);
        await waitForLatestSyncJob(page, 5);
        const salesInChannelAfterEdit = await verifyUserInChannel(adminClient, salesUser.id, privateChannel.id);
        const engineerInChannelAfterEdit = await verifyUserInChannel(adminClient, engineerUser.id, privateChannel.id);
        expect(salesInChannelAfterEdit).toBe(false);
        expect(engineerInChannelAfterEdit).toBe(false);
        try {
            await adminClient.addToChannel(salesUser.id, privateChannel.id);
            const salesInChannelAfterManualAdd = await verifyUserInChannel(
                adminClient,
                salesUser.id,
                privateChannel.id,
            );
            expect(salesInChannelAfterManualAdd).toBe(true);
        } catch (error) {
            throw new Error(`Step 7 FAILED: Admin should be able to manually add satisfying user. Error: ${error}`);
        }
    });
    test('MM-T5791 Editing policy to add attribute with auto-add enabled', async ({pw}) => {
        test.setTimeout(180000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        try {
            const existingFields = await adminClient.getCustomProfileAttributeFields();
            for (const field of existingFields) {
                try {
                    await adminClient.deleteCustomProfileAttributeField(field.id);
                } catch {
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch {
        }
        await enableUserManagedAttributes(adminClient);
        const attributeFieldsMap: Record<string, any> = {};
        const departmentField = await adminClient.createCustomProfileAttributeField({
            name: 'Department',
            type: 'text',
            attrs: {managed: 'admin', visibility: 'when_set', sort_order: 0},
        } as any);
        attributeFieldsMap[departmentField.id] = departmentField;
        const officeField = await adminClient.createCustomProfileAttributeField({
            name: 'Office',
            type: 'text',
            attrs: {managed: 'admin', visibility: 'when_set', sort_order: 1},
        } as any);
        attributeFieldsMap[officeField.id] = officeField;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const engineerRemoteUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
            {name: 'Office', type: 'text', value: 'Remote'},
        ]);
        const engineerOfficeUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
            {name: 'Office', type: 'text', value: 'HQ'},
        ]);
        const salesUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Sales'},
        ]);
        await adminClient.addToTeam(team.id, engineerRemoteUser.id);
        await adminClient.addToTeam(team.id, engineerOfficeUser.id);
        await adminClient.addToTeam(team.id, salesUser.id);
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(engineerOfficeUser.id, privateChannel.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        const page = systemConsolePage.page;
        await navigateToABACPage(page);
        await enableABAC(page);
        const policyName = `ABAC-AddAttr-Test-${await pw.random.id()}`;
        await createBasicPolicy(page, {
            name: policyName,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: true,
            channels: [privateChannel.display_name],
        });
        await page.waitForTimeout(3000);
        await verifyUserInChannel(adminClient, engineerRemoteUser.id, privateChannel.id);
        await verifyUserInChannel(adminClient, engineerOfficeUser.id, privateChannel.id);
        await page.goto('/admin_console/system_attributes/attribute_based_access_control', {waitUntil: 'networkidle'});
        await page.waitForTimeout(2000);
        const addPolicyButton = page.getByRole('button', {name: 'Add policy'});
        await addPolicyButton.waitFor({state: 'visible', timeout: 10000});
        const policyRowLocator = page.locator('tr.clickable, .DataGrid_row').filter({hasText: policyName}).first();
        const isPolicyVisible = await policyRowLocator.isVisible({timeout: 3000}).catch(() => false);
        if (!isPolicyVisible) {
            const policySearchInput = page
                .locator('.DataGrid input[type="text"], input[placeholder*="Search policies" i]')
                .first();
            if (await policySearchInput.isVisible({timeout: 3000})) {
                await policySearchInput.click();
                await policySearchInput.fill(policyName);
                await page.waitForTimeout(1500);
            }
        }
        await policyRowLocator.waitFor({state: 'visible', timeout: 15000});
        await policyRowLocator.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const addAttributeButtonCheck = page.getByRole('button', {name: /add attribute/i});
        if (await addAttributeButtonCheck.isVisible({timeout: 2000})) {
            const isDisabled = await addAttributeButtonCheck.isDisabled();
            if (isDisabled) {
                await page.reload();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);
            }
        }
        const addAttributeButton = page.getByRole('button', {name: /add attribute/i});
        await addAttributeButton.waitFor({state: 'visible', timeout: 5000});
        await addAttributeButton.click();
        await page.waitForTimeout(1000);
        const attributeMenu = page.locator('[id^="attribute-selector-menu"]');
        await attributeMenu.waitFor({state: 'visible', timeout: 5000});
        const officeOption = attributeMenu.locator('li:has-text("Office")').first();
        await officeOption.waitFor({state: 'visible', timeout: 5000});
        await officeOption.click({force: true});
        await page.waitForTimeout(500);
        const operatorButton = page.locator('[data-testid="operatorSelectorMenuButton"]').last();
        await operatorButton.waitFor({state: 'visible', timeout: 5000});
        await operatorButton.click({force: true});
        await page.waitForTimeout(500);
        const operatorOption = page.locator('[id^="operator-selector-menu"] li:has-text("is")').first();
        await operatorOption.click({force: true});
        await page.waitForTimeout(500);
        const valueInput = page.locator('.values-editor__simple-input').last();
        await valueInput.waitFor({state: 'visible', timeout: 5000});
        await valueInput.fill('Remote');
        await page.waitForTimeout(500);
        await testAccessRule(page);
        const saveButton = page.getByRole('button', {name: 'Save'});
        await saveButton.waitFor({state: 'visible', timeout: 5000});
        await saveButton.click();
        await page.waitForTimeout(1000);
        const applyPolicyButton = page.getByRole('button', {name: /apply policy/i});
        if (await applyPolicyButton.isVisible({timeout: 3000})) {
            await applyPolicyButton.click();
            await page.waitForTimeout(1000);
        }
        await navigateToABACPage(page);
        await page.waitForTimeout(2000);
        await waitForLatestSyncJob(page);
        await page.waitForTimeout(5000);
        const engineerRemoteAfterEdit = await verifyUserInChannel(
            adminClient,
            engineerRemoteUser.id,
            privateChannel.id,
        );
        const engineerOfficeAfterEdit = await verifyUserInChannel(
            adminClient,
            engineerOfficeUser.id,
            privateChannel.id,
        );
        const salesAfterEdit = await verifyUserInChannel(adminClient, salesUser.id, privateChannel.id);
        expect(engineerRemoteAfterEdit).toBe(true);
        expect(engineerOfficeAfterEdit).toBe(false);
        expect(salesAfterEdit).toBe(false);
    });
    test('MM-T5792 Editing policy to remove attribute rule with auto-add enabled', async ({pw}) => {
        test.setTimeout(180000);
        await pw.skipIfNoLicense();
        const {adminUser, adminClient, team} = await pw.initSetup();
        try {
            const existingFields = await adminClient.getCustomProfileAttributeFields();
            for (const field of existingFields) {
                try {
                    await adminClient.deleteCustomProfileAttributeField(field.id);
                } catch {
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch {
        }
        await enableUserManagedAttributes(adminClient);
        const attributeFieldsMap: Record<string, any> = {};
        const departmentField = await adminClient.createCustomProfileAttributeField({
            name: 'Department',
            type: 'text',
            attrs: {managed: 'admin', visibility: 'when_set', sort_order: 0},
        } as any);
        attributeFieldsMap[departmentField.id] = departmentField;
        const officeField = await adminClient.createCustomProfileAttributeField({
            name: 'Office',
            type: 'text',
            attrs: {managed: 'admin', visibility: 'when_set', sort_order: 1},
        } as any);
        attributeFieldsMap[officeField.id] = officeField;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const engineerRemoteUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
            {name: 'Office', type: 'text', value: 'Remote'},
        ]);
        const engineerOfficeUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Engineering'},
            {name: 'Office', type: 'text', value: 'HQ'},
        ]);
        const salesRemoteUser = await createUserForABAC(adminClient, attributeFieldsMap, [
            {name: 'Department', type: 'text', value: 'Sales'},
            {name: 'Office', type: 'text', value: 'Remote'},
        ]);
        await adminClient.addToTeam(team.id, engineerRemoteUser.id);
        await adminClient.addToTeam(team.id, engineerOfficeUser.id);
        await adminClient.addToTeam(team.id, salesRemoteUser.id);
        const privateChannel = await createPrivateChannelForABAC(adminClient, team.id);
        await adminClient.addToChannel(salesRemoteUser.id, privateChannel.id);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        const page = systemConsolePage.page;
        await navigateToABACPage(page);
        await enableABAC(page);
        const policyName = `ABAC-RemoveRule-${await pw.random.id()}`;
        await createAdvancedPolicy(page, {
            name: policyName,
            celExpression: 'user.attributes.Department == "Engineering" && user.attributes.Office == "Remote"',
            autoSync: true,
            channels: [privateChannel.display_name],
        });
        await page.waitForTimeout(3000);
        await verifyUserInChannel(adminClient, engineerRemoteUser.id, privateChannel.id);
        await verifyUserNotInChannel(adminClient, engineerOfficeUser.id, privateChannel.id);
        await verifyUserNotInChannel(adminClient, salesRemoteUser.id, privateChannel.id);
        await page.goto('/admin_console/system_attributes/attribute_based_access_control', {waitUntil: 'networkidle'});
        await page.waitForTimeout(2000);
        const addPolicyButton = page.getByRole('button', {name: 'Add policy'});
        await addPolicyButton.waitFor({state: 'visible', timeout: 10000});
        const policyRowLocator = page.locator('tr.clickable, .DataGrid_row').filter({hasText: policyName}).first();
        const isPolicyVisible = await policyRowLocator.isVisible({timeout: 3000}).catch(() => false);
        if (!isPolicyVisible) {
            const policySearchInput = page
                .locator('.DataGrid input[type="text"], input[placeholder*="Search policies" i]')
                .first();
            if (await policySearchInput.isVisible({timeout: 3000})) {
                await policySearchInput.click();
                await policySearchInput.fill(policyName);
                await page.waitForTimeout(1500);
            }
        }
        await policyRowLocator.waitFor({state: 'visible', timeout: 15000});
        await policyRowLocator.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const autoAddCheckbox = page.locator('#auto-add-header-checkbox');
        if (await autoAddCheckbox.isVisible({timeout: 3000})) {
            const isChecked = await autoAddCheckbox.isChecked();
            if (!isChecked) {
                await autoAddCheckbox.click();
                await page.waitForTimeout(500);
            }
        }
        let monacoContainer = page.locator('.monaco-editor').first();
        const isMonacoVisible = await monacoContainer.isVisible({timeout: 2000}).catch(() => false);
        if (!isMonacoVisible) {
            const advancedModeButton = page.getByRole('button', {name: /advanced|switch to advanced/i});
            if (await advancedModeButton.isVisible({timeout: 5000})) {
                await advancedModeButton.click();
                await page.waitForTimeout(2000);
            }
        }
        monacoContainer = page.locator('.monaco-editor').first();
        await monacoContainer.waitFor({state: 'visible', timeout: 10000});
        const editorLines = page.locator('.monaco-editor .view-lines').first();
        await editorLines.waitFor({state: 'visible', timeout: 5000});
        await page.waitForTimeout(500);
        await editorLines.click({force: true});
        await page.waitForTimeout(300);
        const isMac = process.platform === 'darwin';
        await page.keyboard.press(isMac ? 'Meta+a' : 'Control+a');
        await page.waitForTimeout(200);
        const newExpression = 'user.attributes.Department == "Engineering"';
        await page.keyboard.type(newExpression, {delay: 10});
        await page.waitForTimeout(1000);
        const validIndicator = page.locator('text=Valid').first();
        try {
            await validIndicator.waitFor({state: 'visible', timeout: 10000});
        } catch {
        }
        await testAccessRule(page);
        const saveButton = page.getByRole('button', {name: 'Save'});
        await saveButton.waitFor({state: 'visible', timeout: 5000});
        await saveButton.click();
        await page.waitForTimeout(1000);
        const applyPolicyButton = page.getByRole('button', {name: /apply policy/i});
        if (await applyPolicyButton.isVisible({timeout: 3000})) {
            await applyPolicyButton.click();
            await page.waitForTimeout(1000);
        }
        await navigateToABACPage(page);
        await waitForLatestSyncJob(page);
        const engineerRemoteAfterEdit = await verifyUserInChannel(
            adminClient,
            engineerRemoteUser.id,
            privateChannel.id,
        );
        const engineerOfficeAfterEdit = await verifyUserInChannel(
            adminClient,
            engineerOfficeUser.id,
            privateChannel.id,
        );
        const salesRemoteAfterEdit = await verifyUserInChannel(adminClient, salesRemoteUser.id, privateChannel.id);
        expect(engineerOfficeAfterEdit).toBe(true);
        expect(engineerRemoteAfterEdit).toBe(true);
        expect(salesRemoteAfterEdit).toBe(false);
    });
    test('MM-63848 Should show error when renaming policy to an existing name', async ({pw}) => {
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
        const policyName1 = `Edit Dup Test A ${await pw.random.id()}`;
        await createBasicPolicy(page, {
            name: policyName1,
            attribute: 'Department',
            operator: '==',
            value: 'Engineering',
            autoSync: false,
            channels: [privateChannel.display_name],
        });
        await navigateToABACPage(page);
        const privateChannel2 = await createPrivateChannelForABAC(adminClient, team.id);
        const policyName2 = `Edit Dup Test B ${await pw.random.id()}`;
        await createBasicPolicy(page, {
            name: policyName2,
            attribute: 'Department',
            operator: '==',
            value: 'Sales',
            autoSync: false,
            channels: [privateChannel2.display_name],
        });
        await navigateToABACPage(page);
        await page.waitForTimeout(1000);
        const policySearchInput = page.locator('input[placeholder*="Search" i]').first();
        if (await policySearchInput.isVisible({timeout: 3000})) {
            await policySearchInput.fill(policyName2);
            await page.waitForTimeout(1000);
        }
        const policyRow = page.locator('tr.clickable, .DataGrid_row').filter({hasText: policyName2}).first();
        await policyRow.waitFor({state: 'visible', timeout: 10000});
        await policyRow.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const nameInput = page.locator('#admin\\.access_control\\.policy\\.edit_policy\\.policyName');
        await nameInput.waitFor({state: 'visible', timeout: 10000});
        await nameInput.fill('');
        await nameInput.fill(policyName1);
        const saveButton = page.getByRole('button', {name: 'Save'});
        await saveButton.click();
        await page.waitForTimeout(2000);
        const applyPolicyButton = page.getByRole('button', {name: /apply policy/i});
        if (await applyPolicyButton.isVisible({timeout: 3000}).catch(() => false)) {
            await applyPolicyButton.click();
            await page.waitForTimeout(2000);
        }
        const errorMessage = page.locator('.EditPolicy__error');
        await expect(errorMessage).toBeVisible({timeout: 5000});
        const errorText = await errorMessage.textContent();
        expect(errorText).toContain('A policy with this name already exists');
    });
});