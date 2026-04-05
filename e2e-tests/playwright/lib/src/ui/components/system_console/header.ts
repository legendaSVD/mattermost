import {Locator, expect} from '@playwright/test';
export default class SystemConsoleHeader {
    readonly container: Locator;
    readonly title: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.title = container.locator('.admin-console__header');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async getTitle(): Promise<string> {
        return (await this.title.textContent()) ?? '';
    }
    async toHaveTitle(expectedTitle: string) {
        await expect(this.title).toContainText(expectedTitle);
    }
}