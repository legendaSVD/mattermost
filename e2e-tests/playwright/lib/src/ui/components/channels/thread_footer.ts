import {Locator, expect} from '@playwright/test';
export default class ThreadFooter {
    readonly container: Locator;
    readonly replyButton: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.replyButton = container.locator('.ReplyButton');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async reply() {
        await this.replyButton.waitFor();
        await this.replyButton.click();
    }
}