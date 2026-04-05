import {Locator, expect} from '@playwright/test';
export default class PermissionsSystemScheme {
    readonly container: Locator;
    readonly systemSchemeHeader: Locator;
    readonly channelAdministratorsSection: Locator;
    readonly teamAdministratorsSection: Locator;
    readonly systemAdministratorsSection: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.systemSchemeHeader = container.locator('.admin-console__header').getByText('System Scheme', {exact: true});
        this.channelAdministratorsSection = container
            .locator('.permissions-block')
            .filter({hasText: 'Channel Administrators'});
        this.teamAdministratorsSection = container
            .locator('.permissions-block')
            .filter({hasText: 'Team Administrators'});
        this.systemAdministratorsSection = container
            .locator('.permissions-block')
            .filter({hasText: 'System Administrators'});
    }
    async toBeVisible() {
        await expect(this.systemSchemeHeader).toBeVisible();
    }
    getManageChannelAutoTranslationRows(section: Locator): Locator {
        return section.locator('.permission-row').filter({hasText: 'Manage Channel Auto Translation'});
    }
    async expectManageChannelAutoTranslationChecked(section: Locator) {
        const rows = this.getManageChannelAutoTranslationRows(section);
        const count = await rows.count();
        if (count === 0) {
            throw new Error(
                'Manage Channel Auto Translation permission rows not found in the section. ' +
                    'Expected to find at least one permission row to verify the checked state.',
            );
        }
        for (let i = 0; i < count; i++) {
            const row = rows.nth(i);
            await expect(row.locator('.permission-check.checked')).toBeVisible();
        }
    }
    async expectManageChannelAutoTranslationUnchecked(section: Locator) {
        const rows = this.getManageChannelAutoTranslationRows(section);
        const count = await rows.count();
        if (count === 0) {
            throw new Error(
                'Manage Channel Auto Translation permission rows not found in the section. ' +
                    'Expected to find at least one permission row to verify the unchecked state.',
            );
        }
        for (let i = 0; i < count; i++) {
            const row = rows.nth(i);
            await expect(row.locator('.permission-check.checked')).not.toBeVisible();
        }
    }
}