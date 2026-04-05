import type {Page} from '@playwright/test';
import type {Client4} from '@mattermost/client';
import type {UserProfile} from '@mattermost/types/users';
import type {Channel} from '@mattermost/types/channels';
import type {UserPropertyField} from '@mattermost/types/properties';
import {
    CustomProfileAttribute,
    setupCustomProfileAttributeValuesForUser,
} from '../../channels/custom_profile_attributes/helpers';
export async function verifyPolicyExists(page: Page, policyName: string): Promise<boolean> {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    for (let attempt = 0; attempt < 3; attempt++) {
        const policyElement = page.locator('.policy-name').filter({hasText: policyName});
        const isVisible = await policyElement.isVisible({timeout: 3000});
        if (isVisible) {
            return true;
        }
        if (attempt < 2) {
            await page.waitForTimeout(2000);
            await page.reload();
            await page.waitForLoadState('networkidle');
        }
    }
    return false;
}
export async function verifyPolicyNotExists(page: Page, policyName: string): Promise<boolean> {
    return !(await verifyPolicyExists(page, policyName));
}
export async function createUserAttributeField(client: Client4, name: string, type: string = 'text'): Promise<any> {
    const url = `${client.getBaseRoute()}/custom_profile_attributes/fields`;
    const field = {
        name: name,
        type: type,
        attrs: {
            managed: 'admin',
            visibility: 'when_set',
        },
    };
    const response = await (client as any).doFetch(url, {
        method: 'POST',
        body: JSON.stringify(field),
    });
    return response;
}
export async function enableUserManagedAttributes(client: Client4): Promise<void> {
    try {
        const config = await client.getConfig();
        if (config.AccessControlSettings?.EnableUserManagedAttributes !== true) {
            config.AccessControlSettings = config.AccessControlSettings || {};
            config.AccessControlSettings.EnableUserManagedAttributes = true;
            await client.updateConfig(config);
        }
    } catch {
    }
}
export async function ensureUserAttributes(client: Client4, attributeNames?: string[]): Promise<void> {
    const attributesToCreate = attributeNames || ['Department'];
    await enableUserManagedAttributes(client);
    let existingAttributes: any[] = [];
    try {
        existingAttributes = await (client as any).doFetch(
            `${client.getBaseRoute()}/custom_profile_attributes/fields`,
            {method: 'GET'},
        );
    } catch {
    }
    for (const attrName of attributesToCreate) {
        const exists = existingAttributes.some((attr: any) => attr.name === attrName);
        if (!exists) {
            try {
                await createUserAttributeField(client, attrName);
            } catch {
                throw new Error(`Cannot proceed: Attribute "${attrName}" does not exist and could not be created`);
            }
        }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
}
export async function setupUserAttributesViaUI(page: Page, attributes: string[]): Promise<void> {
    await page.goto('/admin_console/system_attributes/user_attributes');
    await page.waitForLoadState('networkidle');
    for (const attrName of attributes) {
        const addButton = page.getByRole('button', {name: /add.*attribute/i});
        if (await addButton.isVisible({timeout: 2000})) {
            await addButton.click();
            await page.waitForTimeout(500);
            const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]').last();
            await nameInput.fill(attrName);
            const saveButton = page.getByRole('button', {name: /save/i});
            if (await saveButton.isVisible({timeout: 1000})) {
                await saveButton.click();
                await page.waitForTimeout(500);
            }
        }
    }
    const savePageButton = page.getByRole('button', {name: 'Save'}).first();
    if (await savePageButton.isVisible({timeout: 2000})) {
        await savePageButton.click();
        await page.waitForLoadState('networkidle');
    }
}
export async function createUserForABAC(
    adminClient: Client4,
    attributeFieldsMap: Record<string, UserPropertyField>,
    attributes: CustomProfileAttribute[],
): Promise<UserProfile> {
    const randomId = Math.random().toString(36).substring(2, 9);
    const username = `user${randomId}`.toLowerCase();
    const user = await adminClient.createUser(
        {
            email: `${username}@example.com`,
            username: username,
            password: 'Password123!',
        } as any,
        '',
        '',
    );
    await setupCustomProfileAttributeValuesForUser(adminClient, attributes, attributeFieldsMap, user.id);
    return user;
}
export interface TestAccessRuleResult {
    totalMatches: number;
    matchingUsernames: string[];
    expectedUsersMatch: boolean;
    unexpectedUsersMatch: boolean;
}
export async function testAccessRule(
    page: Page,
    options: {
        expectedMatchingUsers?: string[];
        expectedNonMatchingUsers?: string[];
        searchForUser?: string;
    } = {},
): Promise<TestAccessRuleResult> {
    const testButton = page.locator('button').filter({hasText: 'Test access rule'});
    await testButton.waitFor({state: 'visible', timeout: 5000});
    await testButton.click();
    const modal = page.locator('[role="dialog"], .modal').filter({hasText: 'Access Rule Test Results'});
    await modal.waitFor({state: 'visible', timeout: 5000});
    await page.waitForTimeout(1000);
    let totalMatches = 0;
    const countText = await modal
        .locator('text=/\\d+.*(?:members|total|match)/i')
        .first()
        .textContent({timeout: 5000})
        .catch(() => null);
    if (countText) {
        const totalMatch = countText.match(/of\s*(\d+)\s*total/i);
        if (totalMatch) {
            totalMatches = parseInt(totalMatch[1]);
        } else {
            const matchesMatch = countText.match(/(\d+)\s*match/i);
            if (matchesMatch) {
                totalMatches = parseInt(matchesMatch[1]);
            }
        }
    }
    const matchingUsernames: string[] = [];
    const userButtons = modal.locator('.more-modal__name button, [class*="more-modal__name"] button');
    const count = await userButtons.count();
    for (let i = 0; i < count; i++) {
        const username = await userButtons.nth(i).textContent();
        if (username) {
            const cleanUsername = username.replace('@', '').trim();
            matchingUsernames.push(cleanUsername);
        }
    }
    if (options.searchForUser) {
        const searchInput = modal.locator('input[placeholder*="Search" i]').first();
        if (await searchInput.isVisible({timeout: 2000})) {
            await searchInput.fill(options.searchForUser);
            await page.waitForTimeout(500);
        }
    }
    let expectedUsersMatch = true;
    if (options.expectedMatchingUsers && options.expectedMatchingUsers.length > 0) {
        for (const expectedUser of options.expectedMatchingUsers) {
            const searchInput = modal.locator('input[placeholder*="Search" i]').first();
            if (await searchInput.isVisible({timeout: 2000})) {
                await searchInput.fill(expectedUser);
                await page.waitForTimeout(1000);
                const userInResults = modal.locator(`text=@${expectedUser}`).first();
                const isVisible = await userInResults.isVisible({timeout: 5000});
                if (!isVisible) {
                    expectedUsersMatch = false;
                }
                await searchInput.fill('');
                await page.waitForTimeout(500);
            }
        }
    }
    let unexpectedUsersMatch = false;
    if (options.expectedNonMatchingUsers && options.expectedNonMatchingUsers.length > 0) {
        for (const unexpectedUser of options.expectedNonMatchingUsers) {
            const searchInput = modal.locator('input[placeholder*="Search" i]').first();
            if (await searchInput.isVisible({timeout: 2000})) {
                await searchInput.fill(unexpectedUser);
                await page.waitForTimeout(500);
                const userInResults = modal.locator(`text=@${unexpectedUser}`).first();
                const isVisible = await userInResults.isVisible({timeout: 2000});
                if (isVisible) {
                    unexpectedUsersMatch = true;
                }
                await searchInput.fill('');
                await page.waitForTimeout(300);
            }
        }
    }
    const closeButton = modal.locator('button[aria-label*="Close" i], button:has-text("×"), .close').first();
    if (await closeButton.isVisible({timeout: 1000})) {
        await closeButton.click();
        await page.waitForTimeout(500);
    } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    }
    return {
        totalMatches,
        matchingUsernames,
        expectedUsersMatch,
        unexpectedUsersMatch,
    };
}
export async function createPrivateChannelForABAC(client: Client4, teamId: string): Promise<Channel> {
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const channel = await client.createChannel({
        team_id: teamId,
        name: `abac${uniqueId}`,
        display_name: `ABAC-${uniqueId}`,
        type: 'P',
    });
    return channel;
}
export async function createBasicPolicy(
    page: Page,
    options: {
        name: string;
        attribute: string;
        operator: string;
        value: string;
        autoSync?: boolean;
        channels?: string[];
    },
): Promise<void> {
    const addPolicyButton = page.getByRole('button', {name: 'Add policy'});
    await addPolicyButton.click();
    await page.waitForLoadState('networkidle');
    const nameInput = page.locator('#admin\\.access_control\\.policy\\.edit_policy\\.policyName');
    await nameInput.waitFor({state: 'visible', timeout: 10000});
    await nameInput.fill(options.name);
    const addAttributeButton = page.getByRole('button', {name: /add attribute/i});
    if (await addAttributeButton.isVisible({timeout: 2000})) {
        const isDisabled = await addAttributeButton.isDisabled();
        if (isDisabled) {
            await page.reload();
            await page.waitForLoadState('networkidle');
            const nameInputAfterReload = page.locator('#admin\\.access_control\\.policy\\.edit_policy\\.policyName');
            await nameInputAfterReload.waitFor({state: 'visible', timeout: 10000});
            await nameInputAfterReload.fill(options.name);
        }
    }
    if (await addAttributeButton.isVisible({timeout: 2000})) {
        const isDisabled = await addAttributeButton.isDisabled();
        if (!isDisabled) {
            await addAttributeButton.click();
            await page.waitForTimeout(1000);
        }
    }
    const attributeMenu = page.locator('[id^="attribute-selector-menu"]');
    const menuIsOpen = await attributeMenu.isVisible({timeout: 2000});
    if (!menuIsOpen) {
        const attributeButton = page.locator('[data-testid="attributeSelectorMenuButton"]').first();
        await attributeButton.click();
        await page.waitForTimeout(500);
    }
    const attributeOption = page.locator(`[id^="attribute-selector-menu"] li:has-text("${options.attribute}")`).first();
    await attributeOption.click({force: true});
    await page.waitForTimeout(500);
    const operatorButton = page.locator('[data-testid="operatorSelectorMenuButton"]').first();
    await operatorButton.waitFor({state: 'visible', timeout: 5000});
    await operatorButton.click({force: true});
    await page.waitForTimeout(500);
    const operatorMap: Record<string, string> = {
        '==': 'is',
        '!=': 'is not',
        in: 'is one of',
        contains: 'contains',
        startsWith: 'starts with',
        endsWith: 'ends with',
    };
    const operatorText = operatorMap[options.operator] || options.operator;
    const operatorOption = page.locator(`[id^="operator-selector-menu"] li:has-text("${operatorText}")`).first();
    await operatorOption.click({force: true});
    await page.waitForTimeout(500);
    if (options.operator === 'in') {
        const valueButton = page.locator('[data-testid="valueSelectorMenuButton"]').first();
        await valueButton.waitFor({state: 'visible', timeout: 10000});
        await valueButton.click({force: true});
        await page.waitForTimeout(500);
        const valueInput = page.locator('input[type="text"]').last();
        await valueInput.fill(options.value);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
    } else {
        const valueInput = page.locator('.values-editor__simple-input, input[placeholder*="Add value" i]').first();
        await valueInput.waitFor({state: 'visible', timeout: 10000});
        await valueInput.fill(options.value);
        await page.waitForTimeout(500);
    }
    if (options.channels && options.channels.length > 0) {
        const addChannelsButton = page.getByRole('button', {name: /add channels/i});
        await addChannelsButton.click();
        await page.waitForTimeout(500);
        for (const channelName of options.channels) {
            const searchInput = page.locator('input[type="text"], input[placeholder*="search" i]').last();
            await searchInput.fill(channelName);
            await page.waitForTimeout(500);
            const channelOption = page
                .locator('.channel-selector-modal, [role="dialog"]')
                .locator('text=' + channelName)
                .first();
            await channelOption.click({force: true});
            await page.waitForTimeout(300);
        }
        const addButton = page.getByRole('button', {name: /^add$|^save$/i}).last();
        await addButton.click();
        await page.waitForTimeout(500);
    }
    if (options.autoSync && options.channels && options.channels.length > 0) {
        await page.waitForTimeout(1000);
        const headerCheckbox = page.locator('#auto-add-header-checkbox');
        if (await headerCheckbox.isVisible({timeout: 3000})) {
            const isChecked = await headerCheckbox.isChecked();
            if (!isChecked) {
                await headerCheckbox.click({force: true});
                await page.waitForTimeout(500);
            }
        }
    }
    const saveButton = page.getByRole('button', {name: 'Save'});
    await saveButton.click();
    await page.waitForTimeout(1000);
    const applyPolicyButton = page.getByRole('button', {name: /apply policy/i});
    const applyVisible = await applyPolicyButton.isVisible({timeout: 3000}).catch(() => false);
    if (applyVisible) {
        await applyPolicyButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    } else {
        await page.waitForLoadState('networkidle');
    }
}
export async function createMultiAttributePolicy(
    page: Page,
    options: {
        name: string;
        rules: Array<{attribute: string; operator: string; value: string}>;
        autoSync?: boolean;
        channels?: string[];
    },
): Promise<void> {
    const addPolicyButton = page.getByRole('button', {name: 'Add policy'});
    await addPolicyButton.click();
    await page.waitForLoadState('networkidle');
    const nameInput = page.locator('#admin\\.access_control\\.policy\\.edit_policy\\.policyName');
    await nameInput.waitFor({state: 'visible', timeout: 10000});
    await nameInput.fill(options.name);
    const addAttributeButton = page.getByRole('button', {name: /add attribute/i});
    if (await addAttributeButton.isVisible({timeout: 2000})) {
        const isDisabled = await addAttributeButton.isDisabled();
        if (isDisabled) {
            await page.reload();
            await page.waitForLoadState('networkidle');
            const nameInputAfterReload = page.locator('#admin\\.access_control\\.policy\\.edit_policy\\.policyName');
            await nameInputAfterReload.waitFor({state: 'visible', timeout: 10000});
            await nameInputAfterReload.fill(options.name);
        }
    }
    for (let i = 0; i < options.rules.length; i++) {
        const rule = options.rules[i];
        const addAttrBtn = page.getByRole('button', {name: /add attribute/i});
        if ((await addAttrBtn.isVisible({timeout: 2000})) && !(await addAttrBtn.isDisabled())) {
            await addAttrBtn.click();
            await page.waitForTimeout(500);
        }
        const attributeButtons = page.locator('[data-testid="attributeSelectorMenuButton"]');
        const attributeButton = attributeButtons.nth(i);
        await attributeButton.waitFor({state: 'visible', timeout: 5000});
        await attributeButton.click({force: true});
        await page.waitForTimeout(500);
        const attributeOption = page
            .locator(`[id^="attribute-selector-menu"] li:has-text("${rule.attribute}")`)
            .first();
        await attributeOption.click({force: true});
        await page.waitForTimeout(500);
        const operatorButtons = page.locator('[data-testid="operatorSelectorMenuButton"]');
        const operatorButton = operatorButtons.nth(i);
        await operatorButton.waitFor({state: 'visible', timeout: 5000});
        await operatorButton.click({force: true});
        await page.waitForTimeout(500);
        const operatorMap: Record<string, string> = {
            '==': 'is',
            '!=': 'is not',
            in: 'in',
            contains: 'contains',
            startsWith: 'starts with',
            endsWith: 'ends with',
        };
        const operatorText = operatorMap[rule.operator] || 'is';
        const operatorOption = page.locator(`[id^="operator-selector-menu"] li:has-text("${operatorText}")`).first();
        await operatorOption.click({force: true});
        await page.waitForTimeout(500);
        const valueInput = page.locator('.values-editor__simple-input').nth(i);
        if (await valueInput.isVisible({timeout: 2000})) {
            await valueInput.fill(rule.value);
            await page.waitForTimeout(300);
        } else {
            const valueButtons = page.locator('[data-testid="valueSelectorMenuButton"]');
            const valueButton = valueButtons.nth(i);
            if (await valueButton.isVisible({timeout: 2000})) {
                await valueButton.click({force: true});
                await page.waitForTimeout(500);
                const valueOption = page.locator(`[id^="value-selector-menu"] li:has-text("${rule.value}")`).first();
                await valueOption.click({force: true});
                await page.waitForTimeout(300);
            }
        }
    }
    if (options.channels && options.channels.length > 0) {
        const addChannelsButton = page.getByRole('button', {name: /add channels/i});
        await addChannelsButton.click();
        await page.waitForTimeout(500);
        for (const channelName of options.channels) {
            const searchInput = page
                .locator('[role="dialog"], .modal')
                .filter({hasText: /channel/i})
                .locator('input[placeholder*="Search" i]')
                .first();
            await searchInput.waitFor({state: 'visible', timeout: 5000});
            await searchInput.fill(channelName);
            await page.waitForTimeout(500);
            const channelOption = page
                .locator('.channel-selector-modal, [role="dialog"]')
                .locator('text=' + channelName)
                .first();
            await channelOption.click({force: true});
            await page.waitForTimeout(300);
        }
        const addButton = page.getByRole('button', {name: /^add$|^save$/i}).last();
        await addButton.click();
        await page.waitForTimeout(500);
    }
    if (options.autoSync && options.channels && options.channels.length > 0) {
        await page.waitForTimeout(1000);
        const headerCheckbox = page.locator('#auto-add-header-checkbox');
        if (await headerCheckbox.isVisible({timeout: 3000})) {
            const isChecked = await headerCheckbox.isChecked();
            if (!isChecked) {
                await headerCheckbox.click({force: true});
                await page.waitForTimeout(500);
            }
        }
    }
    const saveButton = page.getByRole('button', {name: 'Save'});
    await saveButton.click();
    await page.waitForTimeout(1000);
    const applyPolicyButton = page.getByRole('button', {name: /apply policy/i});
    await applyPolicyButton.waitFor({state: 'visible', timeout: 5000});
    await applyPolicyButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
}
export async function createAdvancedPolicy(
    page: Page,
    options: {
        name: string;
        celExpression: string;
        autoSync?: boolean;
        channels?: string[];
    },
): Promise<void> {
    const addPolicyButton = page.getByRole('button', {name: 'Add policy'});
    await addPolicyButton.click();
    await page.waitForLoadState('networkidle');
    const nameInput = page.locator('#admin\\.access_control\\.policy\\.edit_policy\\.policyName');
    await nameInput.waitFor({state: 'visible', timeout: 10000});
    await nameInput.fill(options.name);
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
    await page.keyboard.type(options.celExpression, {delay: 10});
    await page.waitForTimeout(1000);
    const validIndicator = page.locator('text=Valid').first();
    await validIndicator.isVisible({timeout: 5000}).catch(() => false);
    if (options.channels && options.channels.length > 0) {
        const addChannelsButton = page.getByRole('button', {name: /add channels/i});
        await addChannelsButton.click();
        await page.waitForTimeout(1000);
        const channelModal = page.locator('[role="dialog"]').filter({hasText: /channel/i});
        await channelModal.waitFor({state: 'visible', timeout: 5000});
        for (const channelName of options.channels) {
            const searchInput = channelModal.locator('input').first();
            await searchInput.waitFor({state: 'visible', timeout: 5000});
            await searchInput.fill(channelName);
            await page.waitForTimeout(1000);
            const selectChannelButton = channelModal.getByRole('button', {name: /select channel/i}).first();
            if (await selectChannelButton.isVisible({timeout: 5000})) {
                await selectChannelButton.click();
            }
            await page.waitForTimeout(300);
        }
        const modalAddButton = channelModal.getByRole('button', {name: 'Add'});
        await modalAddButton.click();
        await page.waitForTimeout(1000);
        const modalStillOpen = await channelModal.isVisible().catch(() => false);
        if (modalStillOpen) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        }
    }
    if (options.channels && options.channels.length > 0) {
        const channelsTable = page
            .locator('.policy-channels-table, [class*="channel"]')
            .filter({hasText: options.channels[0]});
        await channelsTable.isVisible({timeout: 3000}).catch(() => false);
    }
    if (options.autoSync && options.channels && options.channels.length > 0) {
        await page.waitForTimeout(1000);
        const headerCheckbox = page.locator('#auto-add-header-checkbox');
        if (await headerCheckbox.isVisible({timeout: 3000})) {
            const isChecked = await headerCheckbox.isChecked();
            if (!isChecked) {
                await headerCheckbox.click({force: true});
                await page.waitForTimeout(500);
            }
        }
    }
    const saveButton = page.getByRole('button', {name: 'Save'});
    const saveEnabled = await saveButton.isEnabled({timeout: 5000}).catch(() => false);
    if (!saveEnabled) {
        throw new Error(`Save button is disabled`);
    }
    await saveButton.click();
    await page.waitForTimeout(2000);
    const errorMessage = page.locator('text=/Unable to save|errors in the form/i').first();
    if (await errorMessage.isVisible({timeout: 2000}).catch(() => false)) {
        const errorText = await errorMessage.textContent();
        throw new Error(`Failed to save policy: ${errorText}`);
    }
    const applyPolicyButton = page.getByRole('button', {name: /apply policy/i});
    const applyVisible = await applyPolicyButton.isVisible({timeout: 10000}).catch(() => false);
    if (applyVisible) {
        await applyPolicyButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    } else {
        throw new Error(`Apply Policy button not visible after Save`);
    }
}
export async function activatePolicy(client: Client4, policyId: string): Promise<void> {
    const url = `${client.getBaseRoute()}/access_control_policies/${policyId}/activate?active=true`;
    await (client as any).doFetch(url, {method: 'GET'});
}
export async function waitForLatestSyncJob(page: Page, maxRetries: number = 5): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await page.waitForTimeout(2000);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const latestJobRow = page.locator('tr.clickable').first();
        if (await latestJobRow.isVisible({timeout: 3000})) {
            const statusCell = latestJobRow.locator('td').first();
            const status = await statusCell.textContent();
            if (status?.trim() === 'Success') {
                return latestJobRow;
            } else if (status?.trim() === 'Error' || status?.trim() === 'Failed') {
                throw new Error(`Sync job failed with status: ${status?.trim()}`);
            }
        }
    }
    throw new Error(`Sync job did not complete after ${maxRetries} retries`);
}
export async function getJobDetailsForChannel(
    page: Page,
    jobRow: any,
    channelName: string,
): Promise<{added: number; removed: number}> {
    await jobRow.click();
    await page.waitForTimeout(1000);
    const jobDetailsModal = page.locator('[role="dialog"], .modal').filter({hasText: 'Job Details'});
    await jobDetailsModal.waitFor({state: 'visible', timeout: 5000});
    const searchInput = jobDetailsModal.locator('input[placeholder*="Search" i]').first();
    await searchInput.waitFor({state: 'visible', timeout: 3000});
    await searchInput.fill(channelName);
    await page.waitForTimeout(1000);
    const channelRow = jobDetailsModal.locator(`text=${channelName}`).first();
    let added = 0;
    let removed = 0;
    if (await channelRow.isVisible({timeout: 3000})) {
        await channelRow.click();
        await page.waitForTimeout(1000);
        const membershipModal = page.locator('[role="dialog"], .modal').filter({hasText: 'Channel Membership Changes'});
        if (await membershipModal.isVisible({timeout: 3000})) {
            const addedTab = membershipModal.locator('text=/Added \\(\\d+\\)/i').first();
            if (await addedTab.isVisible({timeout: 2000})) {
                const addedText = await addedTab.textContent();
                const addedMatch = addedText?.match(/Added\s*\((\d+)\)/i);
                added = addedMatch ? parseInt(addedMatch[1]) : 0;
            }
            const removedTab = membershipModal.locator('text=/Removed \\(\\d+\\)/i').first();
            if (await removedTab.isVisible({timeout: 2000})) {
                const removedText = await removedTab.textContent();
                const removedMatch = removedText?.match(/Removed\s*\((\d+)\)/i);
                removed = removedMatch ? parseInt(removedMatch[1]) : 0;
            }
            const closeButton = membershipModal
                .locator('button[aria-label*="Close" i], .close, button:has-text("×")')
                .first();
            if (await closeButton.isVisible({timeout: 1000})) {
                await closeButton.click();
                await page.waitForTimeout(500);
            } else {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }
        } else {
            const channelRowParent = channelRow.locator('..').locator('..');
            const countsText = await channelRowParent.textContent();
            const addedMatch = countsText?.match(/\+(\d+)/);
            const removedMatch = countsText?.match(/-(\d+)/);
            added = addedMatch ? parseInt(addedMatch[1]) : 0;
            removed = removedMatch ? parseInt(removedMatch[1]) : 0;
        }
    }
    const closeJobDetailsButton = jobDetailsModal
        .locator('button[aria-label*="Close" i], .close, button:has-text("×")')
        .first();
    if (await closeJobDetailsButton.isVisible({timeout: 1000})) {
        await closeJobDetailsButton.click();
        await page.waitForTimeout(500);
    } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    }
    return {added, removed};
}
export async function getJobDetailsFromRecentJobs(
    page: Page,
    channelName: string,
): Promise<{added: number; removed: number}> {
    const jobRows = page.locator('tr.clickable');
    const jobCount = await jobRows.count();
    if (jobCount === 0) {
        return {added: 0, removed: 0};
    }
    const job1Row = jobRows.nth(0);
    const job2Row = jobCount > 1 ? jobRows.nth(1) : null;
    const job1TimeCell = job1Row.locator('td').nth(1);
    const job1TimeText = await job1TimeCell.textContent();
    let checkBothJobs = false;
    if (job2Row) {
        const job2TimeCell = job2Row.locator('td').nth(1);
        const job2TimeText = await job2TimeCell.textContent();
        if (job1TimeText && job2TimeText) {
            try {
                const time1 = new Date(job1TimeText.replace(' - ', ' ')).getTime();
                const time2 = new Date(job2TimeText.replace(' - ', ' ')).getTime();
                const diffMs = Math.abs(time1 - time2);
                const diffMinutes = diffMs / (1000 * 60);
                if (diffMinutes <= 2) {
                    checkBothJobs = true;
                }
            } catch {
                checkBothJobs = true;
            }
        }
    }
    let totalAdded = 0;
    let totalRemoved = 0;
    const job1Details = await getJobDetailsForChannel(page, job1Row, channelName);
    totalAdded = Math.max(totalAdded, job1Details.added);
    totalRemoved = Math.max(totalRemoved, job1Details.removed);
    if (checkBothJobs && job2Row) {
        await page.waitForTimeout(500);
        const job2Details = await getJobDetailsForChannel(page, job2Row, channelName);
        totalAdded = Math.max(totalAdded, job2Details.added);
        totalRemoved = Math.max(totalRemoved, job2Details.removed);
    }
    return {added: totalAdded, removed: totalRemoved};
}
export async function getPolicyIdByName(
    client: Client4,
    policyName: string,
    retries: number = 3,
): Promise<string | null> {
    const searchUrl = `${client.getBaseRoute()}/access_control/policies/search`;
    const baseNameMatch = policyName.match(/^(.+?)\s+[a-z0-9]+$/i);
    const searchTerm = baseNameMatch ? baseNameMatch[1] : policyName;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await (client as any).doFetch(searchUrl, {
                method: 'POST',
                body: JSON.stringify({
                    term: searchTerm,
                }),
            });
            const policies = result?.policies || [];
            if (policies.length > 0) {
                let policy = policies.find((p: any) => p.name === policyName);
                if (!policy) {
                    policy = policies.find((p: any) => p.name.includes(searchTerm));
                }
                if (!policy && policies.length > 0) {
                    policy = policies[0];
                }
                if (policy) {
                    return policy.id;
                } else {
                    if (attempt < retries) {
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                    }
                }
            } else {
                if (attempt < retries) {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            }
        } catch {
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    }
    return null;
}