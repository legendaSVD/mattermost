import {expect, Locator} from '@playwright/test';
export default class BurnOnReadConfirmationModal {
    readonly container: Locator;
    readonly title: Locator;
    readonly message: Locator;
    readonly deleteButton: Locator;
    readonly cancelButton: Locator;
    readonly dontShowAgainCheckbox: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.title = container.locator('.modal-title, h1, [role="heading"]').first();
        this.message = container.locator('.modal-body, .modal-message').first();
        this.deleteButton = container.getByRole('button', {name: /delete|burn|confirm/i});
        this.cancelButton = container.getByRole('button', {name: /cancel/i});
        this.dontShowAgainCheckbox = container.getByRole('checkbox');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async toBeHidden() {
        await expect(this.container).not.toBeVisible();
    }
    async confirm() {
        await this.deleteButton.click();
        await this.toBeHidden();
    }
    async confirmWithDontShowAgain() {
        await this.dontShowAgainCheckbox.check();
        await this.deleteButton.click();
        await this.toBeHidden();
    }
    async cancel() {
        await this.cancelButton.click();
        await this.toBeHidden();
    }
    async getTitleText(): Promise<string> {
        return (await this.title.textContent()) || '';
    }
    async getMessageText(): Promise<string> {
        return (await this.message.textContent()) || '';
    }
    async hasDontShowAgainOption(): Promise<boolean> {
        return await this.dontShowAgainCheckbox.isVisible();
    }
    async isDontShowAgainChecked(): Promise<boolean> {
        return await this.dontShowAgainCheckbox.isChecked();
    }
}