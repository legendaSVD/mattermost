import {Locator, expect} from '@playwright/test';
export default class GenericConfirmModal {
    readonly container: Locator;
    readonly confirmButton: Locator;
    readonly cancelButton: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.confirmButton = container.locator('#confirmModalButton');
        this.cancelButton = container.locator('#cancelModalButton');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async confirm() {
        await this.confirmButton.waitFor();
        await this.confirmButton.click();
        await expect(this.container).not.toBeVisible();
    }
    async cancel() {
        await this.cancelButton.waitFor();
        await this.cancelButton.click();
        await expect(this.container).not.toBeVisible();
    }
}