import {Page} from '@playwright/test';
import {Client4} from '@mattermost/client';
import {UserPropertyField, UserPropertyFieldPatch, FieldType} from '@mattermost/types/properties';
import {expect, ChannelsPage} from '@mattermost/playwright-lib';
export const TEST_PHONE = '555-123-4567';
export const TEST_UPDATED_PHONE = '555-987-6543';
export const TEST_URL = 'https://example.com';
export const TEST_UPDATED_URL = 'https://mattermost.com';
export const TEST_INVALID_URL = 'ftp://invalid-url';
export const TEST_VALID_URL = 'https://example2.com';
export const TEST_DEPARTMENT = 'Engineering';
export const TEST_UPDATED_DEPARTMENT = 'Product';
export const TEST_LOCATION = 'Remote';
export const TEST_UPDATED_LOCATION = 'Office';
export const TEST_TITLE = 'Software Engineer';
export const TEST_CHANGED_VALUE = 'Changed Value';
export const TEST_MESSAGE = 'Hello from the test user';
export const TEST_MESSAGE_OTHER = 'Hello from the other user';
export const TEST_LOCATION_OPTIONS = [
    {name: 'Remote', color: '#00FFFF'},
    {name: 'Office', color: '#FF00FF'},
    {name: 'Hybrid', color: '#FFFF00'},
];
export const TEST_SKILLS_OPTIONS = [
    {name: 'JavaScript', color: '#F0DB4F'},
    {name: 'React', color: '#61DAFB'},
    {name: 'Node.js', color: '#68A063'},
    {name: 'Python', color: '#3776AB'},
];
export type CustomProfileAttribute = {
    name: string;
    value?: string;
    type: string;
    options?: {name: string; color: string; sort_order?: number}[];
    attrs?: {
        value_type?: string;
        visibility?: string;
        options?: {name: string; color: string}[];
    };
};
export const userSettingsAttributes: CustomProfileAttribute[] = [
    {
        name: 'Department',
        value: TEST_DEPARTMENT,
        type: 'text',
    },
    {
        name: 'Location',
        type: 'select',
        options: TEST_LOCATION_OPTIONS,
    },
    {
        name: 'Skills',
        type: 'multiselect',
        options: TEST_SKILLS_OPTIONS,
    },
    {
        name: 'Phone',
        value: TEST_PHONE,
        type: 'text',
        attrs: {
            value_type: 'phone',
        },
    },
    {
        name: 'Website',
        value: TEST_URL,
        type: 'text',
        attrs: {
            value_type: 'url',
        },
    },
];
export const customAttributesTestData: CustomProfileAttribute[] = [
    {
        name: 'Department',
        value: TEST_DEPARTMENT,
        type: 'text',
    },
    {
        name: 'Location',
        value: TEST_LOCATION,
        type: 'text',
    },
    {
        name: 'Title',
        value: TEST_TITLE,
        type: 'text',
    },
    {
        name: 'Phone',
        value: TEST_PHONE,
        type: 'text',
        attrs: {
            value_type: 'phone',
        },
    },
    {
        name: 'Website',
        value: TEST_URL,
        type: 'text',
        attrs: {
            value_type: 'url',
        },
    },
];
export function getFieldIdByName(fieldsMap: Record<string, UserPropertyField>, name: string): string {
    for (const [id, field] of Object.entries(fieldsMap)) {
        if (field.name === name) {
            return id;
        }
    }
    throw new Error(`Could not find field ID for attribute: ${name}`);
}
export async function editTextAttribute(
    page: Page,
    fieldsMap: Record<string, UserPropertyField>,
    attributeName: string,
    newValue: string,
): Promise<void> {
    const fieldId = getFieldIdByName(fieldsMap, attributeName);
    await page.locator(`text=${attributeName}`).scrollIntoViewIfNeeded();
    await page.locator(`#customAttribute_${fieldId}Edit`).scrollIntoViewIfNeeded();
    await page.locator(`#customAttribute_${fieldId}Edit`).click();
    await page.locator(`#customAttribute_${fieldId}`).scrollIntoViewIfNeeded();
    await page.locator(`#customAttribute_${fieldId}`).clear();
    if (newValue) {
        await page.locator(`#customAttribute_${fieldId}`).fill(newValue);
    }
    await page.locator('button:has-text("Save")').click();
}
export async function editSelectAttribute(
    page: Page,
    fieldsMap: Record<string, UserPropertyField>,
    attributeName: string,
    optionIndex: number,
): Promise<void> {
    const fieldId = getFieldIdByName(fieldsMap, attributeName);
    await page.locator(`text=${attributeName}`).scrollIntoViewIfNeeded();
    await page.locator(`#customAttribute_${fieldId}Edit`).scrollIntoViewIfNeeded();
    await page.locator(`#customAttribute_${fieldId}Edit`).click();
    await page.locator(`#customProfileAttribute_${fieldId}`).scrollIntoViewIfNeeded();
    await page.locator(`#customProfileAttribute_${fieldId}`).click();
    await page.locator(`#react-select-2-option-${optionIndex}`).click();
    await page.locator('button:has-text("Save")').click();
}
export async function editMultiselectAttribute(
    page: Page,
    fieldsMap: Record<string, UserPropertyField>,
    attributeName: string,
    optionIndices: number[],
): Promise<void> {
    const fieldId = getFieldIdByName(fieldsMap, attributeName);
    await page.locator(`text=${attributeName}`).scrollIntoViewIfNeeded();
    await page.locator(`#customAttribute_${fieldId}Edit`).scrollIntoViewIfNeeded();
    await page.locator(`#customAttribute_${fieldId}Edit`).click();
    for (const index of optionIndices) {
        await page.waitForTimeout(500);
        await page.locator(`#customProfileAttribute_${fieldId}`).scrollIntoViewIfNeeded();
        await page.locator(`#customProfileAttribute_${fieldId}`).click();
        await page.locator(`#react-select-3-option-${index}`).click();
    }
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(500);
}
export async function verifyAttributesExistInSettings(page: Page, attributes: CustomProfileAttribute[]): Promise<void> {
    for (const attribute of attributes) {
        await page.locator(`text=${attribute.name}`).scrollIntoViewIfNeeded();
        await expect(page.locator(`.user-settings:has-text("${attribute.name}")`)).toBeVisible();
    }
}
export async function verifyAttributeInPopover(
    channelsPage: ChannelsPage,
    attributeName: string,
    attributeValue: string,
): Promise<void> {
    const popover = channelsPage.userProfilePopover.container;
    const nameElement = popover.getByText(attributeName, {exact: false});
    await expect(nameElement).toBeVisible();
    const valueElement = popover.getByText(attributeValue, {exact: false});
    await expect(valueElement).toBeVisible();
}
export async function verifyAttributeNotInPopover(channelsPage: ChannelsPage, attributeName: string): Promise<void> {
    const popover = channelsPage.userProfilePopover.container;
    const nameElement = popover.getByText(attributeName, {exact: false});
    await expect(nameElement).not.toBeVisible();
}
export async function updateCustomProfileAttributeVisibility(
    adminClient: Client4,
    fieldsMap: Record<string, UserPropertyField>,
    attributeName: string,
    visibility: 'when_set' | 'hidden' | 'always',
): Promise<void> {
    const fieldID = getFieldIdByName(fieldsMap, attributeName);
    try {
        const updatedField = await adminClient.patchCustomProfileAttributeField(fieldID, {
            attrs: {
                visibility,
            },
        });
        fieldsMap[updatedField.id] = updatedField;
    } catch (error) {
        console.log(`Failed to update visibility for attribute ${attributeName}:`, error);
    }
}
export async function setupCustomProfileAttributeFields(
    adminClient: Client4,
    attributes: CustomProfileAttribute[],
): Promise<Record<string, UserPropertyField>> {
    const fieldsMap: Record<string, UserPropertyField> = {};
    const attributeFields: UserPropertyFieldPatch[] = attributes.map((attr, index) => {
        const field: UserPropertyFieldPatch = {
            name: attr.name,
            type: (attr.type as FieldType) || 'text',
            attrs: {
                sort_order: index,
            },
        };
        if ((attr.type === 'select' || attr.type === 'multiselect') && attr.options) {
            field.attrs.options = attr.options;
        }
        if (attr.attrs) {
            field.attrs = {
                ...field.attrs,
                ...attr.attrs,
            };
        }
        return field;
    });
    try {
        const existingFields = await adminClient.getCustomProfileAttributeFields();
        if (existingFields && existingFields.length > 0) {
            for (const field of existingFields) {
                fieldsMap[field.id] = field;
            }
            return fieldsMap;
        }
    } catch (error) {
        console.log('Error getting existing custom profile fields, will create new ones', error);
    }
    for (const field of attributeFields) {
        try {
            const createdField = await adminClient.createCustomProfileAttributeField(field);
            fieldsMap[createdField.id] = createdField;
        } catch (error) {
            console.log(`Failed to create field ${field.name}:`, error);
        }
    }
    return fieldsMap;
}
export async function setupCustomProfileAttributeValues(
    userClient: Client4,
    attributes: CustomProfileAttribute[],
    fields: Record<string, UserPropertyField>,
): Promise<void> {
    const valuesByFieldId: Record<string, string | string[]> = {};
    for (const attr of attributes) {
        let fieldID = '';
        for (const [id, field] of Object.entries(fields)) {
            if (field.name === attr.name) {
                fieldID = id;
                break;
            }
        }
        if (fieldID && attr.value) {
            valuesByFieldId[fieldID] = attr.value;
        }
    }
    if (Object.keys(valuesByFieldId).length > 0) {
        try {
            await userClient.updateCustomProfileAttributeValues(valuesByFieldId);
        } catch (error) {
            console.log('Failed to set attribute values:', error);
        }
    }
}
export async function setupCustomProfileAttributeValuesForUser(
    adminClient: Client4,
    attributes: CustomProfileAttribute[],
    fields: Record<string, UserPropertyField>,
    targetUserId: string,
): Promise<void> {
    const valuesByFieldId: Record<string, string | string[]> = {};
    for (const attr of attributes) {
        let fieldID = '';
        for (const [id, field] of Object.entries(fields)) {
            if (field.name === attr.name) {
                fieldID = id;
                break;
            }
        }
        if (fieldID && attr.value) {
            valuesByFieldId[fieldID] = attr.value;
        }
    }
    if (Object.keys(valuesByFieldId).length > 0) {
        try {
            await adminClient.updateUserCustomProfileAttributesValues(targetUserId, valuesByFieldId);
        } catch (error) {
            console.log('Failed to set attribute values for user:', error);
        }
    }
}
export async function deleteCustomProfileAttributes(
    adminClient: Client4,
    attributes: Record<string, UserPropertyField>,
): Promise<void> {
    for (const id of Object.keys(attributes)) {
        try {
            await adminClient.deleteCustomProfileAttributeField(id);
        } catch (error) {
            console.log(`Failed to delete field ${id}:`, error);
        }
    }
    try {
        const response = await adminClient.getCustomProfileAttributeFields();
        if (response && response.length > 0) {
            console.log('Warning: Not all custom profile attributes were deleted');
        }
    } catch (error) {
        console.log('Error checking if all fields were deleted:', error);
    }
}