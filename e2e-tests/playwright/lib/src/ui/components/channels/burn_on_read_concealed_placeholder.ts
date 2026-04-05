import {expect, Locator} from '@playwright/test';
export default class BurnOnReadConcealedPlaceholder {
    readonly container: Locator;
    readonly icon: Locator;
    readonly text: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.icon = container.locator('.BurnOnReadConcealedPlaceholder__icon');
        this.text = container.locator('.BurnOnReadConcealedPlaceholder__text');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async toBeHidden() {
        await expect(this.container).not.toBeVisible();
    }
    async clickToReveal() {
        await this.container.click();
    }
    async waitForReveal(timeout = 5000) {
        await expect(this.container).not.toBeVisible({timeout});
    }
    async getText(): Promise<string> {
        return (await this.text.textContent()) || '';
    }
    async getAriaLabel(): Promise<string> {
        return (await this.container.getAttribute('aria-label')) || '';
    }
}