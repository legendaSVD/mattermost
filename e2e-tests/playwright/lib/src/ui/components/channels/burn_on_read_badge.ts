import {expect, Locator} from '@playwright/test';
export default class BurnOnReadBadge {
    readonly container: Locator;
    readonly flameIcon: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.flameIcon = container.locator('svg');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async toBeHidden() {
        await expect(this.container).not.toBeVisible();
    }
    async click() {
        await this.container.click();
    }
    async hover() {
        await this.container.hover();
    }
    async getTooltipText(): Promise<string> {
        const ariaLabel = await this.container.getAttribute('aria-label');
        if (ariaLabel) {
            return ariaLabel;
        }
        return (await this.container.textContent()) || '';
    }
    async getAriaLabel(): Promise<string> {
        return (await this.container.getAttribute('aria-label')) || '';
    }
    async getRecipientCount(): Promise<{revealed: number; total: number}> {
        const tooltipText = await this.getTooltipText();
        const match = tooltipText.match(/Read by (\d+) of (\d+)/);
        if (!match) {
            throw new Error(`Could not parse recipient count from tooltip: ${tooltipText}`);
        }
        return {
            revealed: parseInt(match[1], 10),
            total: parseInt(match[2], 10),
        };
    }
}