import {Locator, expect} from '@playwright/test';
export class ColumnToggleMenu {
    readonly container: Locator;
    constructor(container: Locator) {
        this.container = container;
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async getMenuItem(menuItem: string): Promise<Locator> {
        const menuItemLocator = this.container.getByRole('menuitemcheckbox').filter({hasText: menuItem});
        await menuItemLocator.waitFor();
        return menuItemLocator;
    }
    getAllMenuItems(): Locator {
        return this.container.getByRole('menuitemcheckbox');
    }
    async clickMenuItem(menuItem: string) {
        const item = await this.getMenuItem(menuItem);
        await item.click();
    }
    async close() {
        await this.container.press('Escape');
        await expect(this.container).not.toBeVisible();
    }
}
type RoleFilter =
    | 'Any'
    | 'System Admin'
    | 'Member'
    | 'Guests (all)'
    | 'Guests in a single channel'
    | 'Guests in multiple channels';
type StatusFilter = 'Any' | 'Activated users' | 'Deactivated users';
export class FilterPopover {
    readonly container: Locator;
    readonly teamMenuInput: Locator;
    readonly roleMenuButton: Locator;
    readonly statusMenuButton: Locator;
    readonly applyButton: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.teamMenuInput = container.locator('#asyncTeamSelectInput');
        this.roleMenuButton = container.locator('#DropdownInput_filterRole');
        this.statusMenuButton = container.locator('#DropdownInput_filterStatus');
        this.applyButton = container.getByText('Apply');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.applyButton).toBeVisible();
    }
    async save() {
        await this.applyButton.click();
        await expect(this.container).not.toBeVisible({timeout: 5000});
    }
    async searchInTeamMenu(teamDisplayName: string) {
        await expect(this.teamMenuInput).toBeVisible();
        await this.teamMenuInput.fill(teamDisplayName);
        await this.container.page().waitForTimeout(500);
    }
    async filterByTeam(team: 'All teams' | 'No teams' | (string & {})) {
        if (team === 'All teams' || team === 'No teams') {
            await expect(this.teamMenuInput).toBeVisible();
            await this.teamMenuInput.click();
        } else {
            await this.searchInTeamMenu(team);
        }
        const option = this.container.getByRole('option', {name: team});
        await option.waitFor();
        await option.click();
    }
    async openRoleMenu() {
        await expect(this.roleMenuButton).toBeVisible();
        await this.roleMenuButton.click();
    }
    async filterByRole(role: RoleFilter) {
        await this.openRoleMenu();
        const option = this.container.getByRole('option', {name: role});
        await option.waitFor();
        await option.click();
    }
    async openStatusMenu() {
        await expect(this.statusMenuButton).toBeVisible();
        await this.statusMenuButton.click();
    }
    async filterByStatus(status: StatusFilter) {
        await this.openStatusMenu();
        const option = this.container.getByRole('option', {name: status});
        await option.waitFor();
        await option.click();
    }
    async close() {
        const isVisible = await this.container.isVisible();
        if (isVisible) {
            await this.container.press('Escape');
            await expect(this.container).not.toBeVisible();
        }
    }
}
export class FilterMenu {
    readonly container: Locator;
    constructor(container: Locator) {
        this.container = container;
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async getMenuItem(menuItem: string): Promise<Locator> {
        const menuItemLocator = this.container.getByText(menuItem);
        await menuItemLocator.waitFor();
        return menuItemLocator;
    }
    async clickMenuItem(menuItem: string) {
        const item = await this.getMenuItem(menuItem);
        await item.click();
        await expect(this.container).not.toBeVisible({timeout: 5000});
    }
    async close() {
        const isVisible = await this.container.isVisible();
        if (isVisible) {
            await this.container.press('Escape');
        }
    }
}
export class DateRangeMenu {
    readonly container: Locator;
    constructor(container: Locator) {
        this.container = container;
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async clickMenuItem(menuItem: string) {
        const item = this.container.getByText(menuItem);
        await item.waitFor();
        await item.click();
    }
    async close() {
        await this.container.press('Escape');
    }
}