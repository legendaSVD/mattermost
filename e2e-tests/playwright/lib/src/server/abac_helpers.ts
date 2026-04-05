import type {Page} from '@playwright/test';
import type {Client4} from '@mattermost/client';
import type {UserProfile} from '@mattermost/types/users';
import {getRandomId} from '../util';
export async function createUserWithAttributes(
    client: Client4,
    attributes: Record<string, string>,
): Promise<UserProfile> {
    const randomId = await getRandomId();
    const username = `user${randomId}`.toLowerCase();
    const user = await client.createUser(
        {
            email: `${username}@example.com`,
            username: username,
            password: 'Password123!',
        } as any,
        '',
        '',
    );
    if (Object.keys(attributes).length > 0) {
        const fields = await client.getCustomProfileAttributeFields();
        const valuesByFieldId: Record<string, string> = {};
        for (const [attrName, attrValue] of Object.entries(attributes)) {
            const field = fields.find((f: any) => f.name === attrName);
            if (field) {
                valuesByFieldId[field.id] = attrValue;
            } else {
                throw new Error(
                    `Attribute field "${attrName}" not found. Available fields: ${fields.map((f: any) => f.name).join(', ')}`,
                );
            }
        }
        if (Object.keys(valuesByFieldId).length > 0) {
            await client.updateUserCustomProfileAttributesValues(user.id, valuesByFieldId);
        }
    }
    return user;
}
export async function enableABAC(page: Page): Promise<void> {
    const enableRadio = page.locator('#AccessControlSettings\\.EnableAttributeBasedAccessControltrue');
    await enableRadio.click();
    const saveButton = page.getByRole('button', {name: 'Save'});
    await saveButton.waitFor({state: 'visible', timeout: 5000});
    const isDisabled = await saveButton.isDisabled();
    if (isDisabled) {
        return;
    }
    await saveButton.click();
    await page.waitForLoadState('networkidle');
}
export async function disableABAC(page: Page): Promise<void> {
    const disableRadio = page.locator('#AccessControlSettings\\.EnableAttributeBasedAccessControlfalse');
    await disableRadio.click();
    const saveButton = page.getByRole('button', {name: 'Save'});
    await saveButton.waitFor({state: 'visible', timeout: 5000});
    const isDisabled = await saveButton.isDisabled();
    if (isDisabled) {
        return;
    }
    await saveButton.click();
    await page.waitForLoadState('networkidle');
}
export async function navigateToABACPage(page: Page): Promise<void> {
    await page.goto('/admin_console/system_attributes/attribute_based_access_control');
    await page.waitForLoadState('networkidle');
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
    const nameInput = page.locator('input[name="name"]').first();
    await nameInput.fill(options.name);
    if (options.autoSync) {
        const autoSyncToggle = page
            .locator('input[type="checkbox"]')
            .filter({hasText: /auto|sync/i})
            .first();
        if (await autoSyncToggle.isVisible({timeout: 1000})) {
            await autoSyncToggle.check();
        }
    }
    const attributeDropdown = page.locator('select').first();
    const operatorDropdown = page.locator('select').nth(1);
    const valueInput = page.locator('input[type="text"]').last();
    await attributeDropdown.selectOption(options.attribute);
    await operatorDropdown.selectOption(options.operator);
    await valueInput.fill(options.value);
    if (options.channels && options.channels.length > 0) {
        const addChannelsButton = page.getByRole('button', {name: /add.*channel/i});
        if (await addChannelsButton.isVisible({timeout: 1000})) {
            await addChannelsButton.click();
            const channelModal = page.locator('.modal, [role="dialog"]').first();
            for (const channelName of options.channels) {
                await channelModal.getByText(channelName, {exact: false}).click();
            }
            const modalSaveButton = channelModal.getByRole('button', {name: 'Save'});
            await modalSaveButton.click();
        }
    }
    const saveButton = page.getByRole('button', {name: 'Save'}).last();
    await saveButton.click();
    await page.waitForLoadState('networkidle');
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
    const nameInput = page.locator('input[name="name"]').first();
    await nameInput.fill(options.name);
    if (options.autoSync) {
        const autoSyncToggle = page
            .locator('input[type="checkbox"]')
            .filter({hasText: /auto|sync/i})
            .first();
        if (await autoSyncToggle.isVisible({timeout: 1000})) {
            await autoSyncToggle.check();
        }
    }
    const modeToggle = page.getByRole('button', {name: /advanced|basic/i});
    if (await modeToggle.isVisible({timeout: 1000})) {
        await modeToggle.click();
        await page.waitForTimeout(500);
    }
    const celEditor = page.locator('textarea').first();
    await celEditor.fill(options.celExpression);
    if (options.channels && options.channels.length > 0) {
        const addChannelsButton = page.getByRole('button', {name: /add.*channel/i});
        if (await addChannelsButton.isVisible({timeout: 1000})) {
            await addChannelsButton.click();
            const channelModal = page.locator('.modal, [role="dialog"]').first();
            for (const channelName of options.channels) {
                await channelModal.getByText(channelName, {exact: false}).click();
            }
            const modalSaveButton = channelModal.getByRole('button', {name: 'Save'});
            await modalSaveButton.click();
        }
    }
    const saveButton = page.getByRole('button', {name: 'Save'}).last();
    await saveButton.click();
    await page.waitForLoadState('networkidle');
}
export async function editPolicy(page: Page, policyName: string): Promise<void> {
    const policyRow = page.locator('.policy-name').filter({hasText: policyName}).locator('..').locator('..');
    const menuButton = policyRow.locator('button[id*="policy-menu"]');
    await menuButton.click();
    const editButton = page.getByRole('menuitem', {name: 'Edit'});
    await editButton.click();
    await page.waitForLoadState('networkidle');
}
export async function deletePolicy(page: Page, policyName: string): Promise<void> {
    const policyRow = page.locator('.policy-name').filter({hasText: policyName}).locator('..').locator('..');
    const menuButton = policyRow.locator('button[id*="policy-menu"]');
    await menuButton.click();
    const deleteButton = page.getByRole('menuitem', {name: 'Delete'});
    await deleteButton.click();
    const confirmButton = page.getByRole('button', {name: /delete|confirm/i});
    if (await confirmButton.isVisible({timeout: 1000})) {
        await confirmButton.click();
    }
    await page.waitForLoadState('networkidle');
}
export async function runSyncJob(page: Page, waitForCompletion: boolean = true): Promise<void> {
    const runSyncButton = page.getByRole('button', {name: 'Run Sync Job'});
    await runSyncButton.click();
    await page.waitForLoadState('networkidle');
    if (waitForCompletion) {
        await page.waitForTimeout(3000);
    }
}
export async function verifyUserInChannel(client: Client4, userId: string, channelId: string): Promise<boolean> {
    try {
        const members = await client.getChannelMembers(channelId);
        return members.some((m: any) => m.user_id === userId);
    } catch {
        return false;
    }
}
export async function verifyUserNotInChannel(client: Client4, userId: string, channelId: string): Promise<boolean> {
    return !(await verifyUserInChannel(client, userId, channelId));
}
export async function updateUserAttributes(
    client: Client4,
    userId: string,
    attributes: Record<string, string>,
): Promise<void> {
    const fields = await client.getCustomProfileAttributeFields();
    const valuesByFieldId: Record<string, string> = {};
    for (const [attrName, attrValue] of Object.entries(attributes)) {
        const field = fields.find((f: any) => f.name === attrName);
        if (field) {
            valuesByFieldId[field.id] = attrValue;
        } else {
            throw new Error(
                `Attribute field "${attrName}" not found. Available fields: ${fields.map((f: any) => f.name).join(', ')}`,
            );
        }
    }
    if (Object.keys(valuesByFieldId).length > 0) {
        await client.updateUserCustomProfileAttributesValues(userId, valuesByFieldId);
    }
}