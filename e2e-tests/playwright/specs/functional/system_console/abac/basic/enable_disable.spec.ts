import {expect, test} from '@mattermost/playwright-lib';
import {ensureUserAttributes} from '../support';
test.describe('ABAC Basic Operations - Enable/Disable', () => {
    test('MM-T5782 System admin can enable or disable system-wide ABAC', async ({pw}) => {
        await pw.skipIfNoLicense();
        const {adminUser, adminClient} = await pw.initSetup();
        await ensureUserAttributes(adminClient);
        const {systemConsolePage} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.systemAttributes.attributeBasedAccess.click();
        const abacSection = systemConsolePage.page.getByTestId('sysconsole_section_AttributeBasedAccessControl');
        await expect(abacSection).toBeVisible();
        const enableRadio = systemConsolePage.page.locator(
            '#AccessControlSettings\\.EnableAttributeBasedAccessControltrue',
        );
        const disableRadio = systemConsolePage.page.locator(
            '#AccessControlSettings\\.EnableAttributeBasedAccessControlfalse',
        );
        const saveButton = systemConsolePage.page.getByRole('button', {name: 'Save'});
        await enableRadio.click();
        await expect(enableRadio).toBeChecked();
        await saveButton.click();
        await systemConsolePage.page.waitForLoadState('networkidle');
        const addPolicyButton = systemConsolePage.page.getByRole('button', {name: 'Add policy'});
        const runSyncJobButton = systemConsolePage.page.getByRole('button', {name: 'Run Sync Job'});
        await expect(addPolicyButton).toBeVisible();
        await expect(runSyncJobButton).toBeVisible();
        await disableRadio.click();
        await expect(disableRadio).toBeChecked();
        await saveButton.click();
        await systemConsolePage.page.waitForLoadState('networkidle');
        await expect(addPolicyButton).not.toBeVisible();
        await expect(runSyncJobButton).not.toBeVisible();
        await enableRadio.click();
        await saveButton.click();
        await systemConsolePage.page.waitForLoadState('networkidle');
    });
});