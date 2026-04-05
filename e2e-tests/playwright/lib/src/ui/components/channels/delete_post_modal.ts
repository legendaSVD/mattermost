import {Locator, expect} from '@playwright/test';
export default class DeletePostModal {
    readonly container: Locator;
    readonly confirmButton: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.confirmButton = container.locator('#deletePostModalButton');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async confirm() {
        await this.confirmButton.waitFor();
        await this.confirmButton.click();
        await expect(this.container).not.toBeVisible();
    }
}