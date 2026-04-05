import {Locator, expect} from '@playwright/test';
export default class SystemConsoleNavbar {
    readonly container: Locator;
    readonly backLink: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.backLink = container.getByRole('link', {name: /Back/});
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.backLink).toBeVisible();
    }
    async clickBack() {
        await this.backLink.click();
    }
}