import {Locator, expect} from '@playwright/test';
export class UserActionMenu {
    readonly container: Locator;
    constructor(container: Locator) {
        this.container = container;
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    getMenuItem(text: string): Locator {
        return this.container.getByText(text, {exact: true});
    }
    async clickMenuItem(text: string) {
        const item = this.getMenuItem(text);
        await item.click();
    }
    async clickDeactivate() {
        await this.clickMenuItem('Deactivate');
    }
    async clickActivate() {
        await this.clickMenuItem('Activate');
    }
    async clickManageRoles() {
        await this.clickMenuItem('Manage roles');
    }
    async clickManageTeams() {
        await this.clickMenuItem('Manage teams');
    }
    async clickResetPassword() {
        await this.clickMenuItem('Reset password');
    }
    async clickUpdateEmail() {
        await this.clickMenuItem('Update email');
    }
    async clickRevokeSessions() {
        await this.clickMenuItem('Revoke sessions');
    }
}