import {Locator, expect} from '@playwright/test';
export default class UserProfilePopover {
    readonly container: Locator;
    constructor(container: Locator) {
        this.container = container;
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async close() {
        await this.container.getByLabel('Close user profile popover').click();
    }
}